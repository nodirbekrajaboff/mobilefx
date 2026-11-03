import { forwardRef } from 'react'
import { Br, Cut, Line, Printer, render, Row, Text } from 'react-thermal-printer'

import { THERMAL_PAPER_SPECS, type ThermalPaperWidth } from '#/lib/print'
import * as m from '#/paraglide/messages'

export interface PosThermalReceiptProps {
  saleId: number
  storeName?: string
  storePhone?: string
  storeAddress?: string
  itemsSummary: string
  customerName: string
  totalAmountFormatted: string
  tradeInModel?: string | null
  tradeInAcceptedFormatted?: string
  payableAmountFormatted: string
  warrantyMonths: number
  createdAt?: string
  paperWidth?: ThermalPaperWidth
}

const utf8Encoder = (text: string) => new TextEncoder().encode(text)

export function buildThermalPrinterElement({
  saleId,
  storeName = 'Mobile Fix',
  storePhone = '+998 90 123 45 67',
  storeAddress = '',
  itemsSummary,
  customerName,
  totalAmountFormatted,
  tradeInModel,
  tradeInAcceptedFormatted,
  payableAmountFormatted,
  warrantyMonths,
  createdAt,
  paperWidth = '58mm',
}: PosThermalReceiptProps) {
  const spec = THERMAL_PAPER_SPECS[paperWidth]
  const dateStr = createdAt
    ? new Date(createdAt).toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

  return (
    <Printer type="epson" width={spec.cols} encoder={utf8Encoder}>
      <Text align="center" bold={true} size={{ width: 2, height: 2 }} wordBreak="break-word">
        {storeName}
      </Text>
      {storeAddress ? (
        <Text align="center" wordBreak="break-word">
          {storeAddress}
        </Text>
      ) : null}
      {storePhone ? (
        <Text align="center" wordBreak="break-word">
          {`Tel: ${storePhone}`}
        </Text>
      ) : null}
      <Line character="=" />
      <Text align="center" bold={true} wordBreak="break-word">
        {m.pos_receipt_header({ id: saleId })}
      </Text>
      <Text align="center">{dateStr}</Text>
      <Line />
      <Row
        left={<Text wordBreak="break-word">{m.pos_receipt_items()}</Text>}
        right={<Text wordBreak="break-word">{itemsSummary}</Text>}
        gap={1}
      />
      <Row
        left={<Text wordBreak="break-word">{`${m.pos_field_customer()}:`}</Text>}
        right={<Text wordBreak="break-word">{customerName || '—'}</Text>}
        gap={1}
      />
      <Line />
      <Row
        left={<Text wordBreak="break-word">{`${m.pos_col_amount()}:`}</Text>}
        right={<Text wordBreak="break-word">{totalAmountFormatted}</Text>}
        gap={1}
      />
      {tradeInModel && tradeInAcceptedFormatted ? (
        <Row
          left={<Text wordBreak="break-word">{`Trade-In (${tradeInModel}):`}</Text>}
          right={<Text wordBreak="break-word">{`-${tradeInAcceptedFormatted}`}</Text>}
          gap={1}
        />
      ) : null}
      <Line character="=" />
      <Row
        left={
          <Text bold={true} wordBreak="break-word">
            {`${m.pos_total_payable()}:`}
          </Text>
        }
        right={
          <Text bold={true} wordBreak="break-word">
            {payableAmountFormatted}
          </Text>
        }
        gap={1}
      />
      {warrantyMonths > 0 ? (
        <>
          <Line />
          <Row
            left={<Text wordBreak="break-word">{m.pos_receipt_warranty()}</Text>}
            right={
              <Text wordBreak="break-word">{m.common_count_months({ count: warrantyMonths })}</Text>
            }
            gap={1}
          />
        </>
      ) : null}
      <Br />
      <Cut lineFeeds={4} />
    </Printer>
  )
}

export async function compilePosReceiptEscPos(props: PosThermalReceiptProps): Promise<Uint8Array> {
  return render(buildThermalPrinterElement(props))
}

export const PosThermalReceipt = forwardRef<HTMLDivElement, PosThermalReceiptProps>(
  function PosThermalReceipt(props, ref) {
    const paperWidth = props.paperWidth ?? '58mm'

    return (
      <div
        ref={ref}
        data-paper={paperWidth}
        className="receipt-container rounded-lg border border-dashed border-slate-300 bg-white text-black shadow-2xs"
      >
        {buildThermalPrinterElement(props)}
      </div>
    )
  },
)
