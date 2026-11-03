import {
  IconAlertTriangle,
  IconBuildingStore,
  IconCash,
  IconCheck,
  IconDotsVertical,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUsers,
  IconWallet,
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { DataTableExportButton } from '#/components/DataTableExportButton'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { DatePicker } from '#/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { EmptyState } from '#/components/ui/empty'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { TablePagination } from '#/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
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
import { CustomFieldCell, CustomFieldsFormSection, useTableFields } from '#/lib/table-fields'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/debts')({
  component: DebtsLedgerPage,
})

type DebtsResponse = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getApi>['debts']['get']>>['data']
>
type DebtItem = DebtsResponse['customerDebts'][number]

function DebtsLedgerPage() {
  const queryClient = useQueryClient()
  const { formatMoney, refetchOverview } = useCurrency()
  const { visibleFields, customFields: customFieldDefs, updateCell } = useTableFields('debts')

  const debtsQuery = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const { data, error } = await getApi().debts.get()
      if (error) throw error
      return data
    },
  })

  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer')
  const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newDebtType, setNewDebtType] = useState<'customer' | 'supplier'>('customer')
  const [counterpartyName, setCounterpartyName] = useState('')
  const [counterpartyPhone, setCounterpartyPhone] = useState('+998 ')
  const [categoryTag, setCategoryTag] = useState<'phone' | 'part' | 'repair'>('phone')
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [paidAmount, setPaidAmount] = useState('0')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  })
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({})

  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null)
  const [payAmountInput, setPayAmountInput] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash')

  const summary = debtsQuery.data?.summary
  const customerDebts = debtsQuery.data?.customerDebts ?? []
  const supplierDebts = debtsQuery.data?.supplierDebts ?? []

  const activeList = activeTab === 'customer' ? customerDebts : supplierDebts

  const filteredDebts = useMemo(() => {
    return activeList.filter((d) => {
      if (statusFilter === 'open' && d.status !== 'open') return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchName = d.counterpartyName.toLowerCase().includes(q)
        const matchPhone = (d.counterpartyPhone || '').toLowerCase().includes(q)
        const matchDesc = d.description.toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchDesc) return false
      }
      return true
    })
  }, [activeList, statusFilter, search])

  useEffect(() => {
    setPage(1)
  }, [activeTab, statusFilter, search])

  const paginatedDebts = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredDebts.slice(start, start + pageSize)
  }, [filteredDebts, page])

  const openNewDebtDialog = () => {
    setNewDebtType(activeTab)
    setCounterpartyName('')
    setCounterpartyPhone('+998 ')
    setCategoryTag('phone')
    setDescription('')
    setTotalAmount('')
    setPaidAmount('0')
    setCustomValues({})
    setCreateDialogOpen(true)
  }

  const openPayDialog = (debt: DebtItem) => {
    setSelectedDebt(debt)
    setPayAmountInput(String(debt.remainingAmount))
    setPayMethod('cash')
    setPayDialogOpen(true)
  }

  const createDebtMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await getApi().debts.post({
        debtType: newDebtType,
        counterpartyName,
        counterpartyPhone,
        categoryTag,
        description,
        totalAmount: Number(totalAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        customFields: customValues,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debts'] })
      refetchOverview()
      setCreateDialogOpen(false)
    },
  })

  const payMutation = useMutation({
    mutationFn: async (payload: {
      id: number
      amount: number
      paymentMethod?: 'cash' | 'card'
    }) => {
      const { data, error } = await getApi()
        .debts({ id: String(payload.id) })
        .pay.post({
          amount: payload.amount,
          paymentMethod: payload.paymentMethod ?? 'cash',
        })
      if (error) throw error
      return data
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['debts'] })
      void queryClient.invalidateQueries({ queryKey: ['phones'] })
      void queryClient.invalidateQueries({ queryKey: ['parts'] })
      refetchOverview()
      setPayDialogOpen(false)
      if (res && 'debt' in res) {
        toast.success(
          res.debt.status === 'paid'
            ? m.debts_toast_paid_full({ name: res.debt.counterpartyName })
            : m.debts_toast_paid_part({
                name: res.debt.counterpartyName,
                amount: formatMoney(res.debt.remainingAmount),
              }),
        )
      }
    },
  })

  const deleteDebtMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await getApi()
        .debts({ id: String(id) })
        .delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debts'] })
      refetchOverview()
    },
  })

  return (
    <div className="flex flex-col gap-5">
      {/* 4 ta KPI Summary Card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          onClick={() => setActiveTab('customer')}
          className="h-fit cursor-pointer justify-between border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-white p-5 shadow-xs transition hover:border-emerald-300 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {m.debts_kpi_customer_total()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <IconWallet className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-emerald-950 tabular-nums sm:text-3xl dark:text-emerald-100">
            {formatMoney(summary?.customerOpenTotal ?? 0)}
          </CardTitle>
        </Card>

        <Card
          onClick={() => setActiveTab('customer')}
          className="h-fit cursor-pointer justify-between border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-white p-5 shadow-xs transition hover:border-sky-300 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-sky-700 dark:text-sky-400">
              {m.debts_kpi_customer_count()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-sky-200/80 bg-sky-100/80 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
              <IconUsers className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-sky-950 tabular-nums sm:text-3xl dark:text-sky-100">
            {m.common_count_people({ count: summary?.customerOpenCount ?? 0 })}
          </CardTitle>
        </Card>

        <Card
          onClick={() => setActiveTab('supplier')}
          className="h-fit cursor-pointer justify-between border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-white to-white p-5 shadow-xs transition hover:border-rose-300 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              {m.debts_kpi_supplier_total()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-rose-200/80 bg-rose-100/80 text-rose-600 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
              <IconAlertTriangle className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-rose-600 tabular-nums sm:text-3xl dark:text-rose-400">
            {formatMoney(summary?.supplierOpenTotal ?? 0)}
          </CardTitle>
        </Card>

        <Card
          onClick={() => setActiveTab('supplier')}
          className="h-fit cursor-pointer justify-between border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-white p-5 shadow-xs transition hover:border-amber-300 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {m.debts_kpi_supplier_count()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-amber-200/80 bg-amber-100/80 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <IconBuildingStore className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-amber-950 tabular-nums sm:text-3xl dark:text-amber-100">
            {m.common_count_pcs({ count: summary?.supplierOpenCount ?? 0 })}
          </CardTitle>
        </Card>
      </div>

      {/* Jadval Card */}
      <Card className="border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="bg-slate-200/70 dark:bg-slate-800">
                  <TabsTrigger value="customer">
                    {m.debts_tab_customer({
                      count: summary?.customerOpenCount ?? 0,
                    })}
                  </TabsTrigger>
                  <TabsTrigger value="supplier">
                    {m.debts_tab_supplier({
                      count: summary?.supplierOpenCount ?? 0,
                    })}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <TabsList className="bg-slate-200/70 dark:bg-slate-800">
                  <TabsTrigger value="open">{m.debts_filter_open()}</TabsTrigger>
                  <TabsTrigger value="all">{m.common_all()}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative w-64">
                <IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={m.debts_search_placeholder()}
                  className="bg-white pl-9 dark:bg-slate-950"
                />
              </div>

              <DataTableExportButton
                title={m.app_debts()}
                filenamePrefix={`debts-${activeTab}`}
                rows={filteredDebts}
                getRowDate={(r) => r.createdAt}
                columns={visibleFields
                  .filter((f) => f.fieldKey !== 'actions')
                  .map((field) => ({
                    header:
                      field.fieldKey === 'counterpartyName'
                        ? activeTab === 'customer'
                          ? m.debts_col_customer()
                          : m.debts_col_supplier()
                        : field.label,
                    accessor: (r: DebtItem) => {
                      if (!field.isSystem) {
                        const cf = (r.customFields ?? {}) as Record<string, unknown>
                        return String(cf[field.fieldKey] ?? '—')
                      }
                      switch (field.fieldKey) {
                        case 'counterpartyName':
                          return `${r.counterpartyName}${r.counterpartyPhone ? ` (${r.counterpartyPhone})` : ''}`
                        case 'description':
                          return r.description
                        case 'totalAmount':
                          return formatMoney(r.totalAmount)
                        case 'paidAmount':
                          return formatMoney(r.paidAmount)
                        case 'remainingAmount':
                          return formatMoney(r.remainingAmount)
                        case 'dueDate':
                          return r.dueDate ? new Date(r.dueDate).toLocaleDateString('uz-UZ') : '—'
                        default:
                          return '—'
                      }
                    },
                  }))}
              />

              <Button onClick={openNewDebtDialog}>
                <IconPlus data-icon="inline-start" />
                {m.debts_btn_new()}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            {paginatedDebts.length > 0 && (
              <TableHeader className="bg-indigo-50/40 dark:bg-slate-800/60">
                <TableRow>
                  {visibleFields.map((field) => (
                    <TableHead
                      key={field.fieldKey}
                      className="px-4 font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {field.fieldKey === 'counterpartyName'
                        ? activeTab === 'customer'
                          ? m.debts_col_customer()
                          : m.debts_col_supplier()
                        : field.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            )}
            <TableBody>
              {paginatedDebts.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={visibleFields.length || 7} className="p-0">
                    <EmptyState title={m.debts_empty_title()} description={m.debts_empty_desc()} />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDebts.map((d) => {
                  const cf = (d.customFields ?? {}) as Record<string, unknown>

                  return (
                    <TableRow
                      key={d.id}
                      className={
                        d.isOverdue
                          ? 'bg-rose-50/40 hover:bg-rose-50/70 dark:bg-rose-950/20 dark:hover:bg-rose-950/30'
                          : 'hover:bg-indigo-50/30 dark:hover:bg-slate-800/50'
                      }
                    >
                      {visibleFields.map((field) => {
                        if (!field.isSystem) {
                          return (
                            <TableCell key={field.fieldKey} className="px-4">
                              <CustomFieldCell
                                field={field}
                                rowId={d.id}
                                rawValue={cf[field.fieldKey]}
                                onUpdateCell={updateCell}
                              />
                            </TableCell>
                          )
                        }

                        switch (field.fieldKey) {
                          case 'counterpartyName':
                            return (
                              <TableCell key={field.fieldKey} className="px-4">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {d.counterpartyName}
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-fit cursor-default font-mono text-xs text-slate-500 dark:text-slate-400">
                                      {d.counterpartyPhone || '—'}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {m.repairs_customer_phone_tooltip({
                                      phone: d.counterpartyPhone || m.debts_phone_not_entered(),
                                    })}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            )
                          case 'description':
                            return (
                              <TableCell key={field.fieldKey} className="px-4">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={
                                      d.categoryTag === 'phone'
                                        ? 'border-indigo-200 bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                        : d.categoryTag === 'part'
                                          ? 'border-violet-200 bg-violet-100 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300'
                                          : 'border-sky-200 bg-sky-100 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                    }
                                  >
                                    {d.categoryTag === 'phone'
                                      ? m.debts_tag_phone()
                                      : d.categoryTag === 'part'
                                        ? m.debts_tag_part()
                                        : m.debts_tag_repair()}
                                  </Badge>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="max-w-[260px] cursor-default truncate text-xs text-slate-600 dark:text-slate-300">
                                        {d.description.replace(/^Remont #/i, "Ta'mirlash #")}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {d.description}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            )
                          case 'totalAmount':
                            return (
                              <TableCell
                                key={field.fieldKey}
                                className="px-4 font-mono text-xs text-slate-600 tabular-nums dark:text-slate-300"
                              >
                                {formatMoney(d.totalAmount)}
                              </TableCell>
                            )
                          case 'paidAmount':
                            return (
                              <TableCell
                                key={field.fieldKey}
                                className="px-4 font-mono text-xs font-semibold text-emerald-700 tabular-nums dark:text-emerald-400"
                              >
                                {formatMoney(d.paidAmount)}
                              </TableCell>
                            )
                          case 'remainingAmount':
                            return (
                              <TableCell
                                key={field.fieldKey}
                                className="px-4 font-mono font-bold text-rose-600 tabular-nums dark:text-rose-400"
                              >
                                {formatMoney(d.remainingAmount)}
                              </TableCell>
                            )
                          case 'dueDate':
                            return (
                              <TableCell key={field.fieldKey} className="px-4 text-xs tabular-nums">
                                {d.dueDate ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-700 dark:text-slate-300">
                                      {new Date(d.dueDate).toLocaleDateString('uz-UZ')}
                                    </span>
                                    {d.isOverdue && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="destructive">
                                            {m.debts_overdue_badge()}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>{m.debts_overdue_tooltip()}</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            )
                          default:
                            return (
                              <TableCell key={field.fieldKey} className="px-4 text-right">
                                <div className="inline-flex items-center justify-end gap-2">
                                  {d.status === 'paid' ? (
                                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      {m.debts_status_paid()}
                                    </Badge>
                                  ) : (
                                    <Badge className="border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                      {m.debts_status_open()}
                                    </Badge>
                                  )}

                                  <DropdownMenu>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon-xs">
                                            <IconDotsVertical className="size-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>{m.common_actions()}</TooltipContent>
                                    </Tooltip>
                                    <DropdownMenuContent align="end" className="w-52">
                                      <DropdownMenuLabel>{d.counterpartyName}</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {d.status !== 'paid' && (
                                        <>
                                          <DropdownMenuItem onClick={() => openPayDialog(d)}>
                                            <IconCash className="mr-2 size-4 text-indigo-600" />
                                            {m.debts_action_pay()}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              payMutation.mutate({
                                                id: d.id,
                                                amount: d.remainingAmount,
                                                paymentMethod: 'cash',
                                              })
                                            }
                                          >
                                            <IconCheck className="mr-2 size-4 text-emerald-600" />
                                            {m.debts_action_close_full()}
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                        </>
                                      )}
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => deleteDebtMutation.mutate(d.id)}
                                      >
                                        <IconTrash className="size-4" />
                                        {m.common_delete()}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            )
                        }
                      })}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          <TablePagination
            page={page}
            totalItems={filteredDebts.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* Yangi qarz yozish Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{m.debts_dialog_new_title()}</DialogTitle>
            <DialogDescription>{m.debts_dialog_new_desc()}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-2">
            <Tabs
              value={newDebtType}
              onValueChange={(v) => setNewDebtType(v as 'customer' | 'supplier')}
            >
              <TabsList className="w-full bg-slate-200/70 dark:bg-slate-800">
                <TabsTrigger value="customer" className="flex-1">
                  {m.debts_type_customer()}
                </TabsTrigger>
                <TabsTrigger value="supplier" className="flex-1">
                  {m.debts_type_supplier()}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.debts_field_counterparty()}</Label>
                <Input
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  placeholder="Sardorbek Alimov"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.repairs_field_phone().replace(' *', '')}</Label>
                <Input
                  value={counterpartyPhone}
                  onChange={(e) => setCounterpartyPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.debts_field_source_dept()}</Label>
                <Select
                  value={categoryTag}
                  onValueChange={(v) => setCategoryTag(v as 'phone' | 'part' | 'repair')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="phone">{m.debts_source_phone()}</SelectItem>
                      <SelectItem value="part">{m.debts_source_part()}</SelectItem>
                      <SelectItem value="repair">{m.debts_source_repair()}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.debts_field_due_date()}</Label>
                <DatePicker value={dueDate} onChange={setDueDate} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{m.debts_field_desc()}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="iPhone 14 Pro..."
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.debts_field_total()}</Label>
                <Input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="5000000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.pos_field_initial_pay()}</Label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <CustomFieldsFormSection
              fields={customFieldDefs}
              values={customValues}
              onChange={(k, v) => setCustomValues((prev) => ({ ...prev, [k]: v }))}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {m.common_cancel()}
            </Button>
            <Button
              disabled={
                createDebtMutation.isPending ||
                !counterpartyName.trim() ||
                !description.trim() ||
                !totalAmount
              }
              onClick={() => createDebtMutation.mutate()}
            >
              {m.common_save()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* To'lov qabul qilish Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{m.debts_action_pay()}</DialogTitle>
            <DialogDescription>
              {m.debts_pay_dialog_desc({
                name: selectedDebt?.counterpartyName ?? '',
                amount: formatMoney(selectedDebt?.remainingAmount ?? 0),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{m.debts_field_pay_amount()}</Label>
              <Input
                type="number"
                value={payAmountInput}
                onChange={(e) => setPayAmountInput(e.target.value)}
                placeholder={m.pos_col_amount()}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{m.debts_field_pay_method()}</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as 'cash' | 'card')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="cash">{m.debts_pay_cash_full()}</SelectItem>
                    <SelectItem value="card">{m.debts_pay_card_full()}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              {m.common_cancel()}
            </Button>
            <Button
              disabled={
                !selectedDebt ||
                !payAmountInput ||
                Number(payAmountInput) <= 0 ||
                payMutation.isPending
              }
              onClick={() =>
                selectedDebt &&
                payMutation.mutate({
                  id: selectedDebt.id,
                  amount: Number(payAmountInput),
                  paymentMethod: payMethod,
                })
              }
            >
              {m.common_confirm()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
