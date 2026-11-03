import {
  IconCash,
  IconLock,
  IconPrinter,
  IconReceipt,
  IconSearch,
  IconSparkles,
  IconTrendingUp,
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'

import { DataTableExportButton } from '#/components/DataTableExportButton'
import { compilePosReceiptEscPos, PosThermalReceipt } from '#/components/PosThermalReceipt'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { EmptyState } from '#/components/ui/empty'
import { Input } from '#/components/ui/input'
import { TablePagination } from '#/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import { getApi } from '#/lib/api'
import { useCurrency } from '#/lib/currency'
import {
  getThermalPageStyle,
  sendEscPosToThermalPrinter,
  type ThermalPaperWidth,
} from '#/lib/print'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/sales')({
  component: SalesHistoryPage,
})

function SalesHistoryPage() {
  const { formatMoney, overviewData, isFeatureLocked, notifyFeatureLocked } = useCurrency()
  const isPrintLocked = isFeatureLocked('thermal_print')
  const receiptRef = useRef<HTMLDivElement>(null)
  const storeSettings = overviewData?.settings
  const printerPaperWidth: ThermalPaperWidth =
    storeSettings?.printerPaperWidth === '80mm' ? '80mm' : '58mm'

  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'card' | 'mixed' | 'credit'>(
    'all',
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [salesPage, setSalesPage] = useState(1)
  const [salesPageSize, setSalesPageSize] = useState(10)

  const [receiptSale, setReceiptSale] = useState<{
    id: number
    itemsSummary: string
    customerName: string
    totalAmount: number
    tradeInModel?: string | null
    tradeInAcceptedPrice: number
    payableAmount: number
    warrantyMonths: number
    createdAt: string
  } | null>(null)

  const handleBrowserPrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: receiptSale ? `POS-Receipt-${receiptSale.id}` : 'POS-Receipt',
    pageStyle: getThermalPageStyle(printerPaperWidth),
  })

  const handleEscPosDirectPrint = async () => {
    if (!receiptSale) return
    try {
      const bytes = await compilePosReceiptEscPos({
        saleId: receiptSale.id,
        storeName: storeSettings?.storeName || 'Mobile Fix',
        storePhone: storeSettings?.storePhone || '+998 90 123 45 67',
        storeAddress: storeSettings?.storeAddress || '',
        itemsSummary: receiptSale.itemsSummary,
        customerName: receiptSale.customerName,
        totalAmountFormatted: formatMoney(receiptSale.totalAmount),
        tradeInModel: receiptSale.tradeInModel,
        tradeInAcceptedFormatted:
          receiptSale.tradeInAcceptedPrice > 0
            ? formatMoney(receiptSale.tradeInAcceptedPrice)
            : undefined,
        payableAmountFormatted: formatMoney(receiptSale.payableAmount),
        warrantyMonths: receiptSale.warrantyMonths,
        createdAt: receiptSale.createdAt,
        paperWidth: printerPaperWidth,
      })
      await sendEscPosToThermalPrinter(bytes)
    } catch {
      handleBrowserPrint()
    }
  }

  const posQuery = useQuery({
    queryKey: ['pos'],
    queryFn: async () => {
      const { data, error } = await getApi().pos.get()
      if (error) throw error
      return data
    },
  })

  const sales = posQuery.data?.recentSales ?? []

  const summary = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todayTs = startOfToday.getTime()

    let totalRevenue = 0
    let totalProfit = 0
    let todayRevenue = 0
    let todayCount = 0

    for (const s of sales) {
      totalRevenue += s.payableAmount
      totalProfit += s.profitAmount
      if (new Date(s.createdAt).getTime() >= todayTs) {
        todayRevenue += s.payableAmount
        todayCount += 1
      }
    }

    return {
      totalCount: sales.length,
      totalRevenue,
      totalProfit,
      todayRevenue,
      todayCount,
    }
  }, [sales])

  const filteredSales = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return sales.filter((s) => {
      if (paymentFilter !== 'all' && s.paymentMethod !== paymentFilter) {
        return false
      }
      if (!q) return true
      return (
        String(s.id).includes(q) ||
        s.itemTitle.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.toLowerCase().includes(q)) ||
        (s.tradeInModel && s.tradeInModel.toLowerCase().includes(q))
      )
    })
  }, [sales, paymentFilter, searchQuery])

  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesPageSize
    return filteredSales.slice(start, start + salesPageSize)
  }, [filteredSales, salesPage, salesPageSize])

  return (
    <div className="flex flex-col gap-5">
      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          onClick={() => {
            setPaymentFilter('all')
            setSalesPage(1)
          }}
          className="h-fit cursor-pointer justify-between border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-white p-5 shadow-xs transition hover:border-indigo-300 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              {m.pos_recent_sales()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-100/80 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              <IconReceipt className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-indigo-950 tabular-nums sm:text-3xl dark:text-indigo-100">
            {m.common_count_pcs({ count: summary.totalCount })}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-sky-700 dark:text-sky-400">
              {m.pos_col_amount()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-sky-200/80 bg-sky-100/80 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
              <IconCash className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-sky-950 tabular-nums sm:text-3xl dark:text-sky-100">
            {formatMoney(summary.totalRevenue)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {m.pos_col_profit()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <IconTrendingUp className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-emerald-600 tabular-nums sm:text-3xl dark:text-emerald-400">
            +{formatMoney(summary.totalProfit)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {m.analytics_day_today()} ({m.common_count_pcs({ count: summary.todayCount })})
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-amber-200/80 bg-amber-100/80 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <IconSparkles className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-amber-950 tabular-nums sm:text-3xl dark:text-amber-100">
            {formatMoney(summary.todayRevenue)}
          </CardTitle>
        </Card>
      </div>

      {/* SALES TABLE CARD */}
      <Card className="bg-card gap-0 overflow-hidden py-0">
        <CardHeader className="border-border/70 border-b pb-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <Tabs
                value={paymentFilter}
                onValueChange={(v) => {
                  setPaymentFilter(v as typeof paymentFilter)
                  setSalesPage(1)
                }}
              >
                <TabsList>
                  <TabsTrigger value="all">{m.common_all()}</TabsTrigger>
                  <TabsTrigger value="cash">{m.pos_pay_cash()}</TabsTrigger>
                  <TabsTrigger value="card">{m.pos_pay_card()}</TabsTrigger>
                  <TabsTrigger value="mixed">{m.pos_pay_mixed()}</TabsTrigger>
                  <TabsTrigger value="credit">{m.pos_pay_credit()}</TabsTrigger>
                </TabsList>
              </Tabs>

              <Badge variant="secondary" className="tabular-nums">
                {m.common_count_pcs({ count: filteredSales.length })}
              </Badge>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative w-full sm:w-72">
                <IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  placeholder={m.common_search()}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setSalesPage(1)
                  }}
                  className="pl-8"
                />
              </div>

              <DataTableExportButton
                title={m.app_sales()}
                filenamePrefix="sales"
                rows={filteredSales}
                getRowDate={(s) => s.createdAt}
                columns={[
                  {
                    header: '№',
                    accessor: (s) => `#${s.id}`,
                  },
                  {
                    header: m.pos_col_item(),
                    accessor: (s) => `${s.itemTitle}${s.quantity > 1 ? ` ×${s.quantity}` : ''}`,
                  },
                  {
                    header: m.pos_field_customer(),
                    accessor: (s) =>
                      `${s.customerName || '—'}${s.customerPhone ? ` (${s.customerPhone})` : ''}`,
                  },
                  {
                    header: m.pos_field_payment_type(),
                    accessor: (s) => s.paymentMethod.toUpperCase(),
                  },
                  {
                    header: m.pos_col_amount(),
                    accessor: (s) => formatMoney(s.payableAmount),
                  },
                  {
                    header: m.pos_col_profit(),
                    accessor: (s) => `+${formatMoney(s.profitAmount)}`,
                  },
                  {
                    header: m.field_type_date(),
                    accessor: (s) => new Date(s.createdAt).toLocaleDateString('uz-UZ'),
                  },
                ]}
              />
            </div>
          </div>
        </CardHeader>

        {filteredSales.length === 0 ? (
          <EmptyState title={m.common_not_found()} className="m-4" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>{m.pos_col_item()}</TableHead>
                  <TableHead>{m.pos_field_customer()}</TableHead>
                  <TableHead>{m.pos_field_payment_type()}</TableHead>
                  <TableHead className="text-right">{m.pos_col_amount()}</TableHead>
                  <TableHead className="text-right">{m.pos_col_profit()}</TableHead>
                  <TableHead className="text-right">{m.pos_col_receipt()}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground tabular-nums">#{s.id}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-foreground font-medium">
                            {s.itemTitle}{' '}
                            {s.quantity > 1 && (
                              <span className="text-muted-foreground">×{s.quantity}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {s.itemTitle} ({m.common_count_dona({ count: s.quantity })})
                        </TooltipContent>
                      </Tooltip>
                      {s.tradeInModel && (
                        <div className="text-muted-foreground text-[11px]">
                          Trade-In: {s.tradeInModel} (−
                          {formatMoney(s.tradeInAcceptedPrice)})
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>{s.customerName}</div>
                      {s.customerPhone && (
                        <div className="text-muted-foreground/80 text-[11px]">
                          {s.customerPhone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">
                        {s.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-right font-semibold tabular-nums">
                      {formatMoney(s.payableAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
                      +{formatMoney(s.profitAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        className={isPrintLocked ? 'opacity-70' : undefined}
                        onClick={() => {
                          if (isPrintLocked) {
                            notifyFeatureLocked('thermal_print')
                            return
                          }
                          setReceiptSale({
                            id: s.id,
                            itemsSummary: `${s.itemTitle}${s.quantity > 1 ? ` ×${s.quantity}` : ''}`,
                            customerName: s.customerName ?? m.pos_field_customer(),
                            totalAmount: s.totalAmount,
                            tradeInModel: s.tradeInModel,
                            tradeInAcceptedPrice: s.tradeInAcceptedPrice,
                            payableAmount: s.payableAmount,
                            warrantyMonths: s.warrantyMonths,
                            createdAt: String(s.createdAt),
                          })
                        }}
                      >
                        {isPrintLocked ? (
                          <IconLock data-icon="inline-start" className="text-amber-500" />
                        ) : (
                          <IconPrinter data-icon="inline-start" />
                        )}
                        {m.pos_col_receipt()}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TablePagination
              page={salesPage}
              pageSize={salesPageSize}
              totalItems={filteredSales.length}
              onPageChange={setSalesPage}
              onPageSizeChange={setSalesPageSize}
              itemLabel={m.pagination_sales()}
            />
          </>
        )}
      </Card>

      {/* RECEIPT DIALOG */}
      <Dialog open={Boolean(receiptSale)} onOpenChange={(open) => !open && setReceiptSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle>{m.pos_receipt_title()}</DialogTitle>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {printerPaperWidth}
              </Badge>
            </div>
            <DialogDescription>{m.pos_receipt_desc()}</DialogDescription>
          </DialogHeader>

          {receiptSale && (
            <div className="bg-muted/40 flex justify-center overflow-x-auto rounded-xl p-3">
              <PosThermalReceipt
                ref={receiptRef}
                saleId={receiptSale.id}
                storeName={storeSettings?.storeName || 'Mobile Fix'}
                storePhone={storeSettings?.storePhone || '+998 90 123 45 67'}
                storeAddress={storeSettings?.storeAddress || ''}
                itemsSummary={receiptSale.itemsSummary}
                customerName={receiptSale.customerName}
                totalAmountFormatted={formatMoney(receiptSale.totalAmount)}
                tradeInModel={receiptSale.tradeInModel}
                tradeInAcceptedFormatted={
                  receiptSale.tradeInAcceptedPrice > 0
                    ? formatMoney(receiptSale.tradeInAcceptedPrice)
                    : undefined
                }
                payableAmountFormatted={formatMoney(receiptSale.payableAmount)}
                warrantyMonths={receiptSale.warrantyMonths}
                createdAt={receiptSale.createdAt}
                paperWidth={printerPaperWidth}
              />
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setReceiptSale(null)}>
              {m.common_close()}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className={isPrintLocked ? 'opacity-70' : undefined}
                onClick={() => {
                  if (isPrintLocked) {
                    notifyFeatureLocked('thermal_print')
                    return
                  }
                  void handleEscPosDirectPrint()
                }}
              >
                {isPrintLocked ? (
                  <IconLock data-icon="inline-start" className="text-amber-500" />
                ) : (
                  <IconPrinter data-icon="inline-start" />
                )}
                ESC/POS ({printerPaperWidth})
              </Button>
              <Button
                className={isPrintLocked ? 'opacity-70' : undefined}
                onClick={() => {
                  if (isPrintLocked) {
                    notifyFeatureLocked('thermal_print')
                    return
                  }
                  handleBrowserPrint()
                }}
              >
                {isPrintLocked ? (
                  <IconLock data-icon="inline-start" />
                ) : (
                  <IconPrinter data-icon="inline-start" />
                )}
                {m.common_print()} ({printerPaperWidth})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
