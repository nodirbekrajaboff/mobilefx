import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconFileTypeCsv,
  IconFileTypePdf,
  IconFilter,
  IconLock,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { DatePicker } from '#/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { useCurrency } from '#/lib/currency'
import { cn } from '#/lib/utils'
import { getLocale } from '#/paraglide/runtime'

export type ExportFileFormat = 'pdf' | 'docx' | 'excel' | 'csv'

export interface ExportColumnDef<TRow> {
  header: string
  accessor: (row: TRow, index: number) => string | number | boolean | null | undefined
}

export interface DataTableExportButtonProps<TRow> {
  title: string
  filenamePrefix: string
  rows: TRow[]
  columns: ExportColumnDef<TRow>[]
  getRowDate?: (row: TRow) => Date | string | null | undefined
  className?: string
}

const I18N = {
  uz: {
    exportBtn: 'Eksport',
    dialogTitle: "Ma'lumotlarni eksport qilish",
    step1Title: '1-qadam: Sana va filtr',
    step1Desc: "Barcha ma'lumotlarni yoki ma'lum sana oralig'ini tanlang",
    step2Title: '2-qadam: Fayl formati',
    step2Desc: 'Yuklab olish uchun kerakli fayl formatini tanlang',
    filterAll: "Barcha ma'lumotlar",
    filterAllSub: "Jadvaldagi barcha yozuvlarni to'liq eksport qilish",
    filterDateRange: "Sana oralig'i bo'yicha",
    filterDateRangeSub: 'Boshlanish va tugash sanasi orasidagi yozuvlar',
    startDate: 'Boshlanish sanasi',
    endDate: 'Tugash sanasi',
    matchedRows: 'Eksportga tayyor yozuvlar:',
    nextBtn: 'Keyingi qadam',
    backBtn: 'Orqaga',
    cancelBtn: 'Bekor qilish',
    downloadBtn: 'Yuklab olish',
    pdfSub: 'Chop etish va saqlash uchun hujjat (.pdf)',
    docxSub: 'Microsoft Word hujjati (.docx)',
    excelSub: 'Microsoft Excel jadvali (.xlsx)',
    csvSub: 'Universal matnli jadval (.csv)',
  },
  ru: {
    exportBtn: 'Экспорт',
    dialogTitle: 'Экспорт данных таблицы',
    step1Title: 'Шаг 1: Фильтр данных',
    step1Desc: 'Выберите все записи или укажите период (начальная и конечная дата)',
    step2Title: 'Шаг 2: Формат файла',
    step2Desc: 'Выберите формат файла для скачивания',
    filterAll: 'Все данные',
    filterAllSub: 'Экспортировать все записи таблицы целиком',
    filterDateRange: 'За период (по датам)',
    filterDateRangeSub: 'Экспортировать записи между начальной и конечной датой',
    startDate: 'Начальная дата',
    endDate: 'Конечная дата',
    matchedRows: 'Записей для экспорта:',
    nextBtn: 'Далее',
    backBtn: 'Назад',
    cancelBtn: 'Отмена',
    downloadBtn: 'Экспортировать',
    pdfSub: 'Документ для печати и сохранения (.pdf)',
    docxSub: 'Документ Microsoft Word (.docx)',
    excelSub: 'Таблица Microsoft Excel (.xlsx)',
    csvSub: 'Универсальная таблица (.csv)',
  },
  en: {
    exportBtn: 'Export',
    dialogTitle: 'Export Table Data',
    step1Title: 'Step 1: Filter Data',
    step1Desc: 'Export all records or filter by start and end date',
    step2Title: 'Step 2: Export File Format',
    step2Desc: 'Select the file format to download',
    filterAll: 'All data',
    filterAllSub: 'Export all records from the table',
    filterDateRange: 'Date range (Start — End)',
    filterDateRangeSub: 'Export records between start and end date',
    startDate: 'Start date',
    endDate: 'End date',
    matchedRows: 'Records ready to export:',
    nextBtn: 'Next',
    backBtn: 'Back',
    cancelBtn: 'Cancel',
    downloadBtn: 'Export',
    pdfSub: 'Formatted document (.pdf)',
    docxSub: 'Microsoft Word document (.docx)',
    excelSub: 'Microsoft Excel spreadsheet (.xlsx)',
    csvSub: 'Comma-separated values (.csv)',
  },
} as const

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Creates an uncompressed (STORE) ZIP archive in memory so we can generate valid OpenXML (.docx and
 * .xlsx) files directly in the browser with 0 external dependencies.
 */
function buildStoreZip(files: Array<{ name: string; content: string }>): Blob {
  const encoder = new TextEncoder()
  const encodedFiles = files.map((f) => ({
    nameBytes: encoder.encode(f.name),
    dataBytes: encoder.encode(f.content),
  }))

  // Precompute CRC32 table
  const crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    crcTable[n] = c >>> 0
  }

  const crc32 = (bytes: Uint8Array): number => {
    let crc = 0xffffffff
    for (let i = 0; i < bytes.length; i++) {
      crc = crcTable[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const file of encodedFiles) {
    const crc = crc32(file.dataBytes)
    const size = file.dataBytes.length
    const nameLen = file.nameBytes.length

    // Local file header (30 bytes + nameLen)
    const localHeader = new Uint8Array(30 + nameLen)
    const lv = new DataView(localHeader.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // UTF-8 flag
    lv.setUint16(8, 0, true) // STORE (0)
    lv.setUint16(10, 0, true)
    lv.setUint16(12, 0, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, nameLen, true)
    lv.setUint16(28, 0, true)
    localHeader.set(file.nameBytes, 30)

    localParts.push(localHeader, file.dataBytes)

    // Central directory header (46 bytes + nameLen)
    const centralHeader = new Uint8Array(46 + nameLen)
    const cv = new DataView(centralHeader.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, nameLen, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    centralHeader.set(file.nameBytes, 46)

    centralParts.push(centralHeader)
    offset += localHeader.length + size
  }

  const centralSize = centralParts.reduce((acc, p) => acc + p.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, encodedFiles.length, true)
  ev.setUint16(10, encodedFiles.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  const allParts = [...localParts, ...centralParts, eocd]
  const totalBytes = allParts.reduce((acc, p) => acc + p.length, 0)
  const combined = new Uint8Array(totalBytes)
  let pos = 0
  for (const part of allParts) {
    combined.set(part, pos)
    pos += part.length
  }
  return new Blob([combined.buffer as ArrayBuffer])
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function DataTableExportButton<TRow>({
  title,
  filenamePrefix,
  rows,
  columns,
  getRowDate,
  className,
}: DataTableExportButtonProps<TRow>) {
  const { isFeatureLocked, notifyFeatureLocked } = useCurrency()
  const isExportLocked = isFeatureLocked('export')
  const loc = getLocale()
  const t = I18N[loc] ?? I18N.uz

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [filterMode, setFilterMode] = useState<'all' | 'range'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [format, setFormat] = useState<ExportFileFormat>('excel')

  const filteredRows = useMemo(() => {
    if (filterMode === 'all' || (!startDate && !endDate)) {
      return rows
    }
    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null
    const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null

    return rows.filter((row) => {
      const rawDate = getRowDate ? getRowDate(row) : (row as Record<string, unknown>)?.createdAt
      if (!rawDate) return false
      const ms = new Date(rawDate as string | Date).getTime()
      if (Number.isNaN(ms)) return false
      if (startMs && ms < startMs) return false
      if (endMs && ms > endMs) return false
      return true
    })
  }, [rows, filterMode, startDate, endDate, getRowDate])

  const buildMatrix = () => {
    const headers = columns.map((c) => c.header)
    const body = filteredRows.map((row, idx) =>
      columns.map((c) => {
        const val = c.accessor(row, idx)
        if (val === null || val === undefined) return ''
        return String(val)
      }),
    )
    return { headers, body }
  }

  const handleExport = () => {
    const { headers, body } = buildMatrix()
    const dateStamp = new Date().toISOString().slice(0, 10)
    const baseFilename = `${filenamePrefix}-${dateStamp}`

    if (format === 'csv') {
      const escapeCsv = (cell: string) => {
        // Prevent CSV / Spreadsheet Formula Injection (CWE-1236)
        const formulaDanger = /^[=@\t\r]/.test(cell) || /^[+-](?![0-9\s()])/.test(cell)
        const safeCell = formulaDanger ? `'${cell}` : cell
        if (/[",\n\r]/.test(safeCell)) {
          return `"${safeCell.replace(/"/g, '""')}"`
        }
        return safeCell
      }
      const csvLines = [
        headers.map(escapeCsv).join(','),
        ...body.map((r) => r.map(escapeCsv).join(',')),
      ]
      const blob = new Blob([`\uFEFF${csvLines.join('\r\n')}`], {
        type: 'text/csv;charset=utf-8;',
      })
      triggerDownload(blob, `${baseFilename}.csv`)
      setOpen(false)
      return
    }

    if (format === 'excel') {
      // Build a real OpenXML .xlsx package
      const colLetter = (colIdx: number) => {
        let s = ''
        let n = colIdx + 1
        while (n > 0) {
          const m = (n - 1) % 26
          s = String.fromCharCode(65 + m) + s
          n = Math.floor((n - 1) / 26)
        }
        return s
      }

      const allSheetRows = [headers, ...body]
      const sheetRowsXml = allSheetRows
        .map((r, rIdx) => {
          const rowNum = rIdx + 1
          const cellsXml = r
            .map((cell, cIdx) => {
              const ref = `${colLetter(cIdx)}${rowNum}`
              return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`
            })
            .join('')
          return `<row r="${rowNum}">${cellsXml}</row>`
        })
        .join('')

      const xlsxBlob = buildStoreZip([
        {
          name: '[Content_Types].xml',
          content: `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
        },
        {
          name: '_rels/.rels',
          content: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
        },
        {
          name: 'xl/workbook.xml',
          content: `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(title.slice(0, 30) || 'Data')}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
        },
        {
          name: 'xl/_rels/workbook.xml.rels',
          content: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
        },
        {
          name: 'xl/worksheets/sheet1.xml',
          content: `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRowsXml}</sheetData>
</worksheet>`,
        },
      ])

      triggerDownload(
        new Blob([xlsxBlob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `${baseFilename}.xlsx`,
      )
      setOpen(false)
      return
    }

    if (format === 'docx') {
      // Build a real OpenXML .docx package
      const buildDocxRow = (cells: string[], isHeader: boolean) => {
        const cellsXml = cells
          .map(
            (text) => `<w:tc>
            <w:tcPr>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
              </w:tcBorders>
              ${isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF2FF"/>' : ''}
            </w:tcPr>
            <w:p>
              <w:r>
                ${isHeader ? '<w:rPr><w:b/><w:sz w:val="20"/></w:rPr>' : '<w:rPr><w:sz w:val="18"/></w:rPr>'}
                <w:t xml:space="preserve">${escapeXml(text)}</w:t>
              </w:r>
            </w:p>
          </w:tc>`,
          )
          .join('')
        return `<w:tr>${cellsXml}</w:tr>`
      }

      const tableXml = `<w:tbl>
        <w:tblPr>
          <w:tblW w:w="5000" w:type="pct"/>
        </w:tblPr>
        ${buildDocxRow(headers, true)}
        ${body.map((r) => buildDocxRow(r, false)).join('')}
      </w:tbl>`

      const docxBlob = buildStoreZip([
        {
          name: '[Content_Types].xml',
          content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
        },
        {
          name: '_rels/.rels',
          content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
        },
        {
          name: 'word/document.xml',
          content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
        <w:t>${escapeXml(title)} (${dateStamp})</w:t>
      </w:r>
    </w:p>
    ${tableXml}
  </w:body>
</w:document>`,
        },
      ])

      triggerDownload(
        new Blob([docxBlob], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        `${baseFilename}.docx`,
      )
      setOpen(false)
      return
    }

    // PDF format: Render print-ready A4 landscape table in hidden iframe and open native Save-as-PDF
    const htmlRows = body
      .map((r) => `<tr>${r.map((cell) => `<td>${escapeXml(cell)}</td>`).join('')}</tr>`)
      .join('')
    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(baseFilename)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; }
    h1 { font-size: 16px; margin: 0 0 10px 0; }
    p.meta { font-size: 11px; color: #64748b; margin: 0 0 12px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background: #eef2ff; font-weight: 700; color: #1e1b4b; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  <p class="meta">${escapeXml(dateStamp)} • ${filteredRows.length}</p>
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${escapeXml(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>${htmlRows}</tbody>
  </table>
</body>
</html>`

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(htmlDoc)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1500)
      }, 200)
    }

    setOpen(false)
  }

  const formatOptions: Array<{
    id: ExportFileFormat
    label: string
    sub: string
    badge: string
    icon: typeof IconFileTypePdf
    accent: string
  }> = [
    {
      id: 'pdf',
      label: 'PDF',
      sub: t.pdfSub,
      badge: '.pdf',
      icon: IconFileTypePdf,
      accent:
        'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300',
    },
    {
      id: 'docx',
      label: 'DOCX',
      sub: t.docxSub,
      badge: '.docx',
      icon: IconFileText,
      accent:
        'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950/50 dark:border-sky-800 dark:text-sky-300',
    },
    {
      id: 'excel',
      label: 'Excel',
      sub: t.excelSub,
      badge: '.xlsx',
      icon: IconFileSpreadsheet,
      accent:
        'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300',
    },
    {
      id: 'csv',
      label: 'CSV',
      sub: t.csvSub,
      badge: '.csv',
      icon: IconFileTypeCsv,
      accent:
        'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300',
    },
  ]

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn('bg-background', isExportLocked && 'opacity-70', className)}
        onClick={() => {
          if (isExportLocked) {
            notifyFeatureLocked('export')
            return
          }
          setStep(1)
          setOpen(true)
        }}
      >
        {isExportLocked ? (
          <IconLock data-icon="inline-start" className="text-amber-600 dark:text-amber-400" />
        ) : (
          <IconDownload data-icon="inline-start" />
        )}
        {t.exportBtn}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex items-center justify-between">
              <Badge
                variant="outline"
                className="border-indigo-200 bg-indigo-50 font-mono text-[11px] text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
              >
                {step} / 2
              </Badge>
              <span className="text-muted-foreground text-xs font-medium">{title}</span>
            </div>
            <DialogTitle>{step === 1 ? t.step1Title : t.step2Title}</DialogTitle>
            <DialogDescription>{step === 1 ? t.step1Desc : t.step2Desc}</DialogDescription>
          </DialogHeader>

          {/* Step progress indicator */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className={cn(
                'h-1.5 rounded-full transition-colors',
                step >= 1 ? 'bg-primary' : 'bg-muted',
              )}
            />
            <div
              className={cn(
                'h-1.5 rounded-full transition-colors',
                step >= 2 ? 'bg-primary' : 'bg-muted',
              )}
            />
          </div>

          {step === 1 ? (
            <div className="flex flex-col gap-3 py-1">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={cn(
                  'flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition',
                  filterMode === 'all'
                    ? 'border-primary ring-primary/20 bg-indigo-50/50 ring-2 dark:bg-indigo-950/30'
                    : 'border-border bg-card hover:border-indigo-200',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    <IconFilter className="size-4" />
                  </div>
                  <div>
                    <div className="text-foreground text-xs font-bold">{t.filterAll}</div>
                    <div className="text-muted-foreground mt-0.5 text-[11px]">{t.filterAllSub}</div>
                  </div>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {rows.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('range')}
                className={cn(
                  'flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition',
                  filterMode === 'range'
                    ? 'border-primary ring-primary/20 bg-indigo-50/50 ring-2 dark:bg-indigo-950/30'
                    : 'border-border bg-card hover:border-indigo-200',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
                    <IconCalendar className="size-4" />
                  </div>
                  <div>
                    <div className="text-foreground text-xs font-bold">{t.filterDateRange}</div>
                    <div className="text-muted-foreground mt-0.5 text-[11px]">
                      {t.filterDateRangeSub}
                    </div>
                  </div>
                </div>
                {filterMode === 'range' && <IconCheck className="text-primary size-4" />}
              </button>

              {filterMode === 'range' && (
                <div className="border-border/80 bg-muted/30 grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">{t.startDate}</Label>
                    <DatePicker value={startDate} onChange={setStartDate} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">{t.endDate}</Label>
                    <DatePicker value={endDate} onChange={setEndDate} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border border-indigo-200/70 bg-indigo-50/40 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/50">
                <span className="text-muted-foreground font-medium">{t.matchedRows}</span>
                <Badge className="border-indigo-200 bg-indigo-100 font-mono text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                  {filteredRows.length}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 py-1 sm:grid-cols-2">
              {formatOptions.map((opt) => {
                const Icon = opt.icon
                const active = format === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormat(opt.id)}
                    className={cn(
                      'flex flex-col justify-between gap-2.5 rounded-xl border p-3.5 text-left transition',
                      active
                        ? 'border-primary ring-primary/20 bg-indigo-50/50 ring-2 dark:bg-indigo-950/30'
                        : 'border-border bg-card hover:border-indigo-200',
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div
                        className={cn(
                          'flex size-9 items-center justify-center rounded-lg border',
                          opt.accent,
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {opt.badge}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-foreground text-sm font-bold">{opt.label}</div>
                      <div className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                        {opt.sub}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t.cancelBtn}
                </Button>
                <Button type="button" onClick={() => setStep(2)}>
                  {t.nextBtn}
                  <IconArrowRight data-icon="inline-end" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <IconArrowLeft data-icon="inline-start" />
                  {t.backBtn}
                </Button>
                <Button type="button" onClick={handleExport}>
                  <IconDownload data-icon="inline-start" />
                  {t.downloadBtn} ({format.toUpperCase()})
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
