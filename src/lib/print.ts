export type ThermalPaperWidth = '58mm' | '80mm'

function normalizePaperWidth(paperWidth?: string): ThermalPaperWidth {
  return paperWidth === '58mm' ? '58mm' : '80mm'
}

export function escapeHtml(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const THERMAL_PAPER_SPECS: Record<
  ThermalPaperWidth,
  { widthMm: ThermalPaperWidth; widthPx: number; cols: number }
> = {
  '58mm': { widthMm: '58mm', widthPx: 219, cols: 32 },
  '80mm': { widthMm: '80mm', widthPx: 302, cols: 48 },
}

export function getThermalPageStyle(paperWidth: ThermalPaperWidth = '80mm'): string {
  const safeWidth = normalizePaperWidth(paperWidth)
  const is58 = safeWidth === '58mm'
  return `
    @page {
      size: ${safeWidth} auto;
      margin: 0;
    }
    @media print {
      html, body {
        width: ${safeWidth};
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .receipt-container {
        width: ${safeWidth} !important;
        max-width: ${safeWidth} !important;
        margin: 0 !important;
        padding: ${is58 ? '2.5mm' : '4mm'} !important;
        box-sizing: border-box !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: ${is58 ? '11px' : '12px'} !important;
        line-height: 1.35 !important;
        background: #ffffff !important;
        color: #000000 !important;
        border: 0 !important;
        box-shadow: none !important;
      }
      .rtp-row {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        gap: 8px !important;
        width: 100% !important;
        margin: 2px 0 !important;
      }
      .rtp-row-left {
        text-align: left !important;
        flex: 0 0 auto !important;
        max-width: 48% !important;
        white-space: normal !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }
      .rtp-row-right {
        text-align: right !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
        white-space: normal !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `
}

export async function sendEscPosToThermalPrinter(bytes: Uint8Array): Promise<'serial' | 'usb'> {
  if (typeof navigator === 'undefined') {
    throw new Error('Browser navigator unavailable')
  }

  const nav = navigator as Navigator & {
    serial?: {
      requestPort: () => Promise<{
        open: (opts: { baudRate: number }) => Promise<void>
        close: () => Promise<void>
        writable?: {
          getWriter: () => {
            write: (chunk: Uint8Array) => Promise<void>
            releaseLock: () => void
          }
        }
      }>
    }
    usb?: {
      requestDevice: (opts: { filters: Array<Record<string, never>> }) => Promise<{
        open: () => Promise<void>
        close: () => Promise<void>
        configuration: null | {
          interfaces: Array<{
            interfaceNumber: number
            alternates: Array<{
              endpoints: Array<{
                direction: string
                type: string
                endpointNumber: number
              }>
            }>
          }>
        }
        selectConfiguration: (n: number) => Promise<void>
        claimInterface: (n: number) => Promise<void>
        transferOut: (endpoint: number, data: Uint8Array) => Promise<unknown>
      }>
    }
  }

  if (nav.serial) {
    const port = await nav.serial.requestPort()
    await port.open({ baudRate: 9600 })
    try {
      const writer = port.writable?.getWriter()
      if (!writer) throw new Error('Serial port not writable')
      await writer.write(bytes)
      writer.releaseLock()
    } finally {
      await port.close().catch(() => {})
    }
    return 'serial'
  }

  if (nav.usb) {
    const device = await nav.usb.requestDevice({ filters: [] })
    await device.open()
    try {
      if (!device.configuration) {
        await device.selectConfiguration(1)
      }
      const iface = device.configuration?.interfaces[0]
      const ifaceNum = iface?.interfaceNumber ?? 0
      await device.claimInterface(ifaceNum)
      const outEndpoint =
        iface?.alternates[0]?.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk')
          ?.endpointNumber ?? 1
      await device.transferOut(outEndpoint, bytes)
    } finally {
      await device.close().catch(() => {})
    }
    return 'usb'
  }

  throw new Error('WebSerial / WebUSB not supported in this browser')
}

export interface RepairStickerData {
  id: number
  customerName: string
  customerPhone: string
  phoneModel: string
  imei?: string
  issueDescription: string
  lockType: 'text' | 'pattern' | string
  lockCode?: string
  agreedPrice: number
  advancePayment: number
  createdAt?: string | Date
}

export interface WarrantyReceiptData {
  saleId: number
  storeName: string
  storePhone: string
  storeAddress: string
  itemTitle: string
  imei?: string
  customerName: string
  customerPhone: string
  totalAmount: number
  tradeInModel?: string | null
  tradeInAcceptedPrice?: number
  payableAmount: number
  paymentMethod: string
  warrantyMonths: number
  createdAt?: string | Date
}

function openPrintFrame(html: string) {
  if (typeof window === 'undefined') return
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) return
  doc.open()
  doc.write(html)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1500)
  }, 200)
}

export function printRepairSticker(
  data: RepairStickerData,
  paperWidth: ThermalPaperWidth = '58mm',
) {
  const safeWidth = normalizePaperWidth(paperWidth)
  const dateStr = data.createdAt
    ? new Date(data.createdAt).toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('uz-UZ')

  const lockDisplay =
    data.lockType === 'pattern'
      ? `Grafik kalit: ${escapeHtml(data.lockCode || 'Chizilmagan')}`
      : `Parol: ${escapeHtml(data.lockCode || 'Yo`q')}`

  const is80 = safeWidth === '80mm'
  const safeId = Number(data.id) || 0

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Stiker #${safeId}</title>
  <style>
    @page { size: ${safeWidth} ${is80 ? '50mm' : '40mm'}; margin: 0; }
    body {
      width: ${safeWidth};
      max-width: ${safeWidth};
      box-sizing: border-box;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${is80 ? '12px' : '11px'};
      line-height: 1.25;
      color: #000;
      background: #fff;
      margin: 0;
      padding: ${is80 ? '3.5mm' : '2.5mm'};
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5px solid #000;
      padding-bottom: 2px;
      margin-bottom: 4px;
      font-weight: bold;
      font-size: ${is80 ? '14px' : '13px'};
    }
    .row { margin-bottom: 2px; }
    .label { font-weight: bold; }
    .box {
      border: 1px dashed #000;
      padding: 3px;
      margin-top: 3px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <span>MOBILE FIX</span>
    <span>№ ${safeId}</span>
  </div>
  <div class="row"><span class="label">Model:</span> ${escapeHtml(data.phoneModel)} ${data.imei ? `(${escapeHtml(data.imei.slice(-4))})` : ''}</div>
  <div class="row"><span class="label">Mijoz:</span> ${escapeHtml(data.customerName)}</div>
  <div class="row"><span class="label">Tel:</span> ${escapeHtml(data.customerPhone)}</div>
  <div class="row"><span class="label">Muammo:</span> ${escapeHtml(data.issueDescription)}</div>
  <div class="box">${lockDisplay}</div>
  <div class="row" style="margin-top:3px; display:flex; justify-content:space-between; font-size:10px;">
    <span>Narx: ${Number(data.agreedPrice || 0).toLocaleString('ru-RU')} (Avans: ${Number(data.advancePayment || 0).toLocaleString('ru-RU')})</span>
    <span>${escapeHtml(dateStr)}</span>
  </div>
</body>
</html>`

  openPrintFrame(html)
}

export function printWarrantyReceipt(
  data: WarrantyReceiptData,
  paperWidth: ThermalPaperWidth = '80mm',
) {
  const safeWidth = normalizePaperWidth(paperWidth)
  const dateStr = data.createdAt
    ? new Date(data.createdAt).toLocaleString('uz-UZ')
    : new Date().toLocaleString('uz-UZ')

  const is58 = safeWidth === '58mm'
  const safeSaleId = Number(data.saleId) || 0
  const safeWarrantyMonths = Number(data.warrantyMonths) || 0

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Kafolat Taloni #${safeSaleId}</title>
  <style>
    @page { size: ${safeWidth} auto; margin: 0; }
    body {
      width: ${safeWidth};
      max-width: ${safeWidth};
      box-sizing: border-box;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${is58 ? '11px' : '12px'};
      color: #000;
      background: #fff;
      margin: 0;
      padding: ${is58 ? '2.5mm' : '4mm'};
    }
    .center { text-align: center; }
    .title { font-size: ${is58 ? '14px' : '16px'}; font-weight: bold; margin-bottom: 2px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; }
    .bold { font-weight: bold; }
    .warranty-box {
      border: 1.5px solid #000;
      padding: 6px;
      margin-top: 8px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">${escapeHtml(data.storeName)}</div>
    <div>${escapeHtml(data.storeAddress)}</div>
    <div>Tel: ${escapeHtml(data.storePhone)}</div>
    <div class="bold" style="margin-top:4px;">KAFOLAT TALONI VA SOTUV CHEKI №${safeSaleId}</div>
    <div>${escapeHtml(dateStr)}</div>
  </div>
  <div class="divider"></div>
  <div class="row"><span class="bold">Qurilma:</span> <span>${escapeHtml(data.itemTitle)}</span></div>
  ${data.imei ? `<div class="row"><span class="bold">IMEI:</span> <span>${escapeHtml(data.imei)}</span></div>` : ''}
  <div class="row"><span class="bold">Xaridor:</span> <span>${escapeHtml(data.customerName)} (${escapeHtml(data.customerPhone || '-')})</span></div>
  <div class="divider"></div>
  <div class="row"><span>Sotuv narxi:</span> <span class="bold">${Number(data.totalAmount || 0).toLocaleString('ru-RU')} so'm</span></div>
  ${
    data.tradeInAcceptedPrice && data.tradeInAcceptedPrice > 0
      ? `<div class="row"><span>Trade-In (${escapeHtml(data.tradeInModel || 'Eski tel')}):</span> <span>-${Number(data.tradeInAcceptedPrice).toLocaleString('ru-RU')} so'm</span></div>`
      : ''
  }
  <div class="row bold" style="font-size:${is58 ? '12px' : '14px'};"><span>Jami to'lov:</span> <span>${Number(data.payableAmount || 0).toLocaleString('ru-RU')} so'm</span></div>
  <div class="row"><span>To'lov turi:</span> <span>${escapeHtml(data.paymentMethod.toUpperCase())}</span></div>
  <div class="warranty-box">
    <div class="bold">Kafolat muddati: ${safeWarrantyMonths} oy</div>
    <div>Mexanik shikastlanish, suv tushishi va plomba buzilishi kafolatga kirmaydi.</div>
    <div style="margin-top:14px; display:flex; justify-content:space-between;">
      <span>Sotuvchi imzosi: _______</span>
      <span>Mijoz imzosi: _______</span>
    </div>
  </div>
</body>
</html>`

  openPrintFrame(html)
}
