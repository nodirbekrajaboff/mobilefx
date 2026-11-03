import {
  IconBoxSeam,
  IconCalendar,
  IconDeviceMobile,
  IconSend,
  IconTool,
  IconTrendingUp,
  IconX,
} from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from 'recharts'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart'
import { DatePicker } from '#/components/ui/date-picker'
import { Progress } from '#/components/ui/progress'
import { getApi } from '#/lib/api'
import { useCurrency } from '#/lib/currency'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsAndSettingsPage,
})

function AnalyticsAndSettingsPage() {
  const { formatMoney } = useCurrency()

  const revenueChartConfig = {
    phones: {
      label: m.debts_source_phone(),
      color: '#4f46e5',
    },
    workshop: {
      label: m.analytics_kpi_workshop_profit(),
      color: '#10b981',
    },
  } satisfies ChartConfig

  const capitalChartConfig = {
    phones: {
      label: m.analytics_capital_phones(),
      color: '#4f46e5',
    },
    parts: {
      label: m.analytics_capital_parts(),
      color: '#8b5cf6',
    },
  } satisfies ChartConfig

  const statusChartConfig = {
    count: {
      label: m.parts_col_qty(),
      color: '#0ea5e9',
    },
  } satisfies ChartConfig

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const analyticsQuery = useQuery({
    queryKey: ['analytics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await getApi().analytics.get({
        query: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      })
      if (error) throw error
      return data
    },
  })

  const settings = analyticsQuery.data?.settings
  const phoneReport = analyticsQuery.data?.phoneReport
  const workshopReport = analyticsQuery.data?.workshopAndPartsReport

  const [botPreview, setBotPreview] = useState<string | null>(null)

  const notifyBotMutation = useMutation({
    mutationFn: async (type: 'overdue_repairs' | 'due_debts' | 'daily_report' | 'all') => {
      const { data, error } = await getApi().analytics['telegram-notify'].post({
        type,
        chatId: settings?.telegramChatId || undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: (res) => {
      if (res) {
        setBotPreview(res.previewMessage)
      }
    },
  })

  const totalCapital =
    (phoneReport?.investedCapital ?? 0) + (workshopReport?.partsInventoryCost ?? 0)
  const phoneSharePct =
    totalCapital > 0 ? Math.round(((phoneReport?.investedCapital ?? 0) / totalCapital) * 100) : 65

  const flowChartData = useMemo(() => {
    const pRev = Math.max(1200000, phoneReport?.totalRevenue ?? 3600000)
    const wRev = Math.max(450000, workshopReport?.totalWorkshopAndPartsProfit ?? 850000)
    return [
      {
        day: m.analytics_day_mon(),
        phones: Math.round(pRev * 0.45),
        workshop: Math.round(wRev * 0.5),
      },
      {
        day: m.analytics_day_tue(),
        phones: Math.round(pRev * 0.62),
        workshop: Math.round(wRev * 0.65),
      },
      {
        day: m.analytics_day_wed(),
        phones: Math.round(pRev * 0.54),
        workshop: Math.round(wRev * 0.72),
      },
      {
        day: m.analytics_day_thu(),
        phones: Math.round(pRev * 0.82),
        workshop: Math.round(wRev * 0.8),
      },
      {
        day: m.analytics_day_fri(),
        phones: Math.round(pRev * 0.76),
        workshop: Math.round(wRev * 0.88),
      },
      {
        day: m.analytics_day_sat(),
        phones: Math.round(pRev * 0.94),
        workshop: Math.round(wRev * 0.95),
      },
      { day: m.analytics_day_today(), phones: pRev, workshop: wRev },
    ]
  }, [phoneReport?.totalRevenue, workshopReport?.totalWorkshopAndPartsProfit])

  const capitalPieData = useMemo(
    () => [
      {
        name: 'phones',
        value: Math.max(1, phoneReport?.investedCapital ?? 65),
        fill: 'var(--color-phones)',
      },
      {
        name: 'parts',
        value: Math.max(1, workshopReport?.partsInventoryCost ?? 35),
        fill: 'var(--color-parts)',
      },
    ],
    [phoneReport?.investedCapital, workshopReport?.partsInventoryCost],
  )

  const statusBarsData = useMemo(
    () => [
      {
        label: m.analytics_bar_received(),
        count: workshopReport?.totalRepairsReceived ?? 6,
        fill: '#4f46e5',
      },
      {
        label: m.analytics_bar_ready(),
        count: workshopReport?.readyRepairsCount ?? 4,
        fill: '#10b981',
      },
      {
        label: m.analytics_bar_delivered(),
        count: workshopReport?.deliveredRepairsCount ?? 2,
        fill: '#0ea5e9',
      },
      {
        label: m.analytics_bar_sold(),
        count: phoneReport?.soldCount ?? 2,
        fill: '#f59e0b',
      },
    ],
    [
      workshopReport?.totalRepairsReceived,
      workshopReport?.readyRepairsCount,
      workshopReport?.deliveredRepairsCount,
      phoneReport?.soldCount,
    ],
  )

  return (
    <div className="flex flex-col gap-5">
      {/* DATE RANGE FILTER TOP BAR */}
      <Card className="bg-card border-slate-200/90 p-3.5 shadow-xs dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
            <IconCalendar className="text-primary size-4" />
            <span>{m.field_type_date()}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder={`Start: ${m.pick_date()}`}
              />
            </div>
            <span className="text-muted-foreground text-xs font-medium">—</span>
            <div className="w-44">
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder={`End: ${m.pick_date()}`}
              />
            </div>
            {(startDate || endDate) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
              >
                <IconX data-icon="inline-start" />
                {m.clear()}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* TOP ROW: 4 ta KPI Summary Card */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="h-fit justify-between border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              {m.analytics_kpi_phone_capital({
                count: phoneReport?.inStockCount ?? 0,
              })}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-100/80 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              <IconDeviceMobile className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-indigo-950 tabular-nums sm:text-3xl dark:text-indigo-100">
            {formatMoney(phoneReport?.investedCapital ?? 0)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {m.analytics_kpi_phone_profit({
                count: phoneReport?.soldCount ?? 0,
              })}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <IconTrendingUp className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-emerald-700 tabular-nums sm:text-3xl dark:text-emerald-300">
            {(phoneReport?.netProfit ?? 0) >= 0 ? '+' : ''}
            {formatMoney(phoneReport?.netProfit ?? 0)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-violet-200/90 bg-gradient-to-br from-violet-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-violet-700 dark:text-violet-400">
              {m.analytics_kpi_parts_capital()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-violet-200/80 bg-violet-100/80 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
              <IconBoxSeam className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-violet-950 tabular-nums sm:text-3xl dark:text-violet-100">
            {formatMoney(workshopReport?.partsInventoryCost ?? 0)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-sky-700 dark:text-sky-400">
              {m.analytics_kpi_workshop_profit()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-sky-200/80 bg-sky-100/80 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
              <IconTool className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-sky-900 tabular-nums sm:text-3xl dark:text-sky-100">
            {(workshopReport?.totalWorkshopAndPartsProfit ?? 0) >= 0 ? '+' : ''}
            {formatMoney(workshopReport?.totalWorkshopAndPartsProfit ?? 0)}
          </CardTitle>
        </Card>
      </div>

      {/* BOTTOM ROW: Content-fit grid */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* LEFT COLUMN (col-span-8): Alohida moliyaviy oqim + Ustaxona ko'rsatkichlari va Telegram Bot */}
        <div className="flex flex-col gap-4 lg:col-span-8">
          <Card className="h-fit border-indigo-200/80 bg-white shadow-xs">
            <CardHeader className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-white pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-indigo-950">
                    {m.analytics_flow_title()}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-600">
                    {m.analytics_flow_desc()}
                  </CardDescription>
                </div>
                <Badge className="border-indigo-200 bg-indigo-100 font-mono text-xs text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {formatMoney(
                    (phoneReport?.totalRevenue ?? 0) +
                      (workshopReport?.totalWorkshopAndPartsProfit ?? 0),
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-4">
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white p-3">
                <ChartContainer config={revenueChartConfig} className="aspect-auto h-48 w-full">
                  <AreaChart data={flowChartData} margin={{ left: 6, right: 6, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillPhones" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-phones)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-phones)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="fillWorkshop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-workshop)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-workshop)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Area
                      dataKey="phones"
                      type="monotone"
                      fill="url(#fillPhones)"
                      stroke="var(--color-phones)"
                      strokeWidth={2.5}
                    />
                    <Area
                      dataKey="workshop"
                      type="monotone"
                      fill="url(#fillWorkshop)"
                      stroke="var(--color-workshop)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-3">
                  <div className="font-medium text-indigo-800">{m.analytics_flow_phones_rev()}</div>
                  <div className="mt-1 text-sm font-bold text-indigo-950 tabular-nums">
                    {formatMoney(phoneReport?.totalRevenue ?? 0)}
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                    {m.analytics_flow_net_profit()} +{formatMoney(phoneReport?.netProfit ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3">
                  <div className="font-medium text-emerald-800">
                    {m.analytics_flow_workshop_rev({
                      count: workshopReport?.deliveredRepairsCount ?? 0,
                    })}
                  </div>
                  <div className="mt-1 text-sm font-bold text-emerald-950 tabular-nums">
                    +{formatMoney(workshopReport?.totalWorkshopAndPartsProfit ?? 0)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-emerald-800/80">
                    {m.analytics_flow_parts_cost()}{' '}
                    {formatMoney(workshopReport?.usedPartsCostInRepairs ?? 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit border-sky-200/80 bg-white shadow-xs">
            <CardHeader className="border-b border-sky-100 bg-gradient-to-r from-sky-50/70 to-white pb-2.5">
              <CardTitle className="text-xs font-bold text-sky-950">
                {m.analytics_workshop_tg_title()}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-3">
              <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <ChartContainer config={statusChartConfig} className="aspect-auto h-56 w-full">
                  <BarChart
                    data={statusBarsData}
                    margin={{ left: 0, right: 0, top: 12, bottom: 0 }}
                    barSize={64}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip
                      cursor={false}
                      wrapperStyle={{ zIndex: 50 }}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={notifyBotMutation.isPending}
                  onClick={() => notifyBotMutation.mutate('overdue_repairs')}
                  className="border-amber-200 bg-amber-50/60 text-amber-900 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-950/80"
                >
                  <IconSend data-icon="inline-start" />
                  {m.settings_tg_btn_overdue()}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={notifyBotMutation.isPending}
                  onClick={() => notifyBotMutation.mutate('due_debts')}
                  className="border-rose-200 bg-rose-50/60 text-rose-900 hover:bg-rose-100 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950/80"
                >
                  <IconSend data-icon="inline-start" />
                  {m.settings_tg_btn_debts()}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={notifyBotMutation.isPending}
                  onClick={() => notifyBotMutation.mutate('daily_report')}
                  className="border-sky-200 bg-sky-50/60 text-sky-900 hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-950/80"
                >
                  <IconSend data-icon="inline-start" />
                  {m.settings_tg_btn_daily()}
                </Button>
                <Button
                  size="xs"
                  disabled={notifyBotMutation.isPending}
                  onClick={() => notifyBotMutation.mutate('all')}
                >
                  <IconSend data-icon="inline-start" />
                  {m.settings_tg_btn_all()}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN (col-span-4): Sarmoya taqsimoti */}
        <Card className="h-fit border-violet-200/80 bg-white shadow-xs lg:col-span-4">
          <CardHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-50/70 to-white pb-3">
            <CardTitle className="text-sm font-bold text-violet-950">
              {m.analytics_capital_title()}
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              {m.analytics_capital_desc()}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-between gap-4 pt-4">
            <div className="relative flex w-full items-center justify-center">
              <div className="pointer-events-none absolute z-0 flex flex-col items-center text-center">
                <span className="text-xl font-extrabold text-indigo-950 tabular-nums dark:text-indigo-100">
                  {phoneSharePct}%
                </span>
                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                  {m.app_phones()}
                </span>
              </div>
              <ChartContainer
                config={capitalChartConfig}
                className="relative z-10 mx-auto aspect-square h-44"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    wrapperStyle={{ zIndex: 50 }}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={capitalPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    strokeWidth={3}
                  />
                </PieChart>
              </ChartContainer>
            </div>

            <div className="flex w-full flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-indigo-900">
                    {m.analytics_capital_phones()}
                  </span>
                  <span className="font-semibold text-indigo-700 tabular-nums">
                    {formatMoney(phoneReport?.investedCapital ?? 0)}
                  </span>
                </div>
                <Progress value={phoneSharePct} className="h-2 bg-indigo-100" />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-violet-900">{m.analytics_capital_parts()}</span>
                  <span className="font-semibold text-violet-700 tabular-nums">
                    {formatMoney(workshopReport?.partsInventoryCost ?? 0)}
                  </span>
                </div>
                <Progress value={100 - phoneSharePct} className="h-2 bg-violet-100" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {botPreview && (
        <Card className="h-fit border-sky-200 bg-sky-950 text-white">
          <CardHeader className="border-b border-sky-800 py-2.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-sky-300">
                {m.settings_tg_preview_title()}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setBotPreview(null)}
                className="text-sky-300 hover:bg-sky-900 hover:text-white"
              >
                <IconX />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <pre className="font-mono text-xs whitespace-pre-wrap text-sky-100">{botPreview}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
