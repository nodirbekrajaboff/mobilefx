import {
  IconAlertTriangle,
  IconCheck,
  IconCircleCheck,
  IconClockHour4,
  IconDotsVertical,
  IconEdit,
  IconLock,
  IconPlus,
  IconPrinter,
  IconSearch,
  IconTool,
  IconTrash,
  IconTruckDelivery,
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'

import { DataTableExportButton } from '#/components/DataTableExportButton'
import { PatternLockInput } from '#/components/PatternLockInput'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
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
import { printRepairSticker } from '#/lib/print'
import { CustomFieldCell, CustomFieldsFormSection, useTableFields } from '#/lib/table-fields'
import * as m from '#/paraglide/messages'

export const Route = createFileRoute('/repairs')({
  component: RepairsWorkshopPage,
})

type RepairsResponse = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getApi>['repairs']['get']>>['data']
>
type RepairItem = RepairsResponse['repairs'][number]

const tableFeat = tableFeatures({})
const colHelper = createColumnHelper<typeof tableFeat, RepairItem>()

function toIsoDate(dateVal?: string | Date | null): string {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function RepairsWorkshopPage() {
  const queryClient = useQueryClient()
  const { formatMoney, overviewData, refetchOverview, isFeatureLocked, notifyFeatureLocked } =
    useCurrency()
  const isPrintLocked = isFeatureLocked('thermal_print')
  const printerPaperWidth = overviewData?.settings?.printerPaperWidth === '80mm' ? '80mm' : '58mm'
  const { visibleFields, customFields: customFieldDefs, updateCell } = useTableFields('repairs')

  const repairsQuery = useQuery({
    queryKey: ['repairs'],
    queryFn: async () => {
      const { data, error } = await getApi().repairs.get()
      if (error) throw error
      return data
    },
  })

  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'regular' | 'partner'>('all')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'in_progress' | 'ready' | 'delivered' | 'overdue_10'
  >('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [customerType, setCustomerType] = useState<'regular' | 'partner'>('regular')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('+998 ')
  const [phoneModel, setPhoneModel] = useState('')
  const [imei, setImei] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [promisedAt, setPromisedAt] = useState(() =>
    toIsoDate(new Date(Date.now() + 4 * 60 * 60 * 1000)),
  )
  const [lockType, setLockType] = useState<'text' | 'pattern'>('text')
  const [lockCode, setLockCode] = useState('')
  const [partId, setPartId] = useState<number | null>(null)
  const [agreedPrice, setAgreedPrice] = useState<string>('')
  const [advancePayment, setAdvancePayment] = useState<string>('0')
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({})

  const [paidNowInput, setPaidNowInput] = useState<string>('')
  const [writeToDebt, setWriteToDebt] = useState(false)
  const [debtDueDate, setDebtDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  })

  const allRepairs = repairsQuery.data?.repairs ?? []
  const availableParts = repairsQuery.data?.availableParts ?? []

  const selectedRepair = useMemo(
    () => allRepairs.find((r) => r.id === selectedId) ?? null,
    [allRepairs, selectedId],
  )

  const openEditDialog = (row: RepairItem) => {
    setSelectedId(row.id)
    setCustomerType(row.customerType === 'partner' ? 'partner' : 'regular')
    setCustomerName(row.customerName)
    setCustomerPhone(row.customerPhone)
    setPhoneModel(row.phoneModel)
    setImei(row.imei || '')
    setIssueDescription(row.issueDescription)
    setPromisedAt(toIsoDate(row.promisedAt))
    setLockType(row.lockType === 'pattern' ? 'pattern' : 'text')
    setLockCode(row.lockCode || '')
    setPartId(row.partId ?? null)
    setAgreedPrice(String(row.agreedPrice))
    setAdvancePayment(String(row.advancePayment))
    setCustomValues(((row.customFields ?? {}) as Record<string, unknown>) || {})
    setFormDialogOpen(true)
  }

  const openNewDialog = () => {
    setSelectedId(null)
    setCustomerType('regular')
    setCustomerName('')
    setCustomerPhone('+998 ')
    setPhoneModel('')
    setImei('')
    setIssueDescription('')
    setPromisedAt(toIsoDate(new Date(Date.now() + 4 * 60 * 60 * 1000)))
    setLockType('text')
    setLockCode('')
    setPartId(null)
    setAgreedPrice('')
    setAdvancePayment('0')
    setCustomValues({})
    setFormDialogOpen(true)
  }

  const openDeliverDialog = (row: RepairItem) => {
    setSelectedId(row.id)
    const remaining = Math.max(0, row.agreedPrice - row.advancePayment - row.finalPaidAmount)
    setPaidNowInput(String(remaining))
    setWriteToDebt(false)
    setDeliverDialogOpen(true)
  }

  const filteredRepairs = useMemo(() => {
    return allRepairs.filter((r) => {
      if (customerTypeFilter !== 'all' && r.customerType !== customerTypeFilter) {
        return false
      }
      if (statusFilter === 'overdue_10') {
        if (!r.isOverdue10Plus) return false
      } else if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchId = String(r.id).includes(q)
        const matchName = r.customerName.toLowerCase().includes(q)
        const matchPhone = r.customerPhone.toLowerCase().includes(q)
        const matchModel = r.phoneModel.toLowerCase().includes(q)
        const matchImei = (r.imei || '').toLowerCase().includes(q)
        if (!matchId && !matchName && !matchPhone && !matchModel && !matchImei) {
          return false
        }
      }
      return true
    })
  }, [allRepairs, customerTypeFilter, statusFilter, searchQuery])

  useEffect(() => {
    setPage(1)
  }, [customerTypeFilter, statusFilter, searchQuery])

  const paginatedRepairs = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRepairs.slice(start, start + pageSize)
  }, [filteredRepairs, page])

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['repairs'] })
    void queryClient.invalidateQueries({ queryKey: ['parts'] })
    void queryClient.invalidateQueries({ queryKey: ['debts'] })
    refetchOverview()
  }

  const saveMutation = useMutation({
    mutationFn: async (shouldPrint: boolean) => {
      const payload = {
        customerType,
        customerName,
        customerPhone,
        phoneModel,
        imei,
        issueDescription,
        promisedAt: promisedAt ? new Date(promisedAt).toISOString() : null,
        lockType,
        lockCode,
        partId,
        agreedPrice: Number(agreedPrice) || 0,
        advancePayment: Number(advancePayment) || 0,
        customFields: customValues,
      }

      if (selectedId) {
        const { data, error } = await getApi()
          .repairs({ id: String(selectedId) })
          .put(payload)
        if (error) throw error
        return { saved: data, shouldPrint }
      } else {
        const { data, error } = await getApi().repairs.post(payload)
        if (error) throw error
        return { saved: data, shouldPrint }
      }
    },
    onSuccess: ({ saved, shouldPrint }) => {
      refreshAll()
      setFormDialogOpen(false)
      if (shouldPrint && saved && 'id' in saved) {
        printRepairSticker(
          {
            id: saved.id,
            customerName: saved.customerName,
            customerPhone: saved.customerPhone,
            phoneModel: saved.phoneModel,
            imei: saved.imei || '',
            issueDescription: saved.issueDescription,
            lockType: saved.lockType,
            lockCode: saved.lockCode || '',
            agreedPrice: saved.agreedPrice,
            advancePayment: saved.advancePayment,
            createdAt: saved.createdAt,
          },
          printerPaperWidth,
        )
      }
    },
  })

  const markReadyMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await getApi()
        .repairs({ id: String(id) })
        .ready.post()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      refreshAll()
    },
  })

  const markDeliveredMutation = useMutation({
    mutationFn: async (id: number) => {
      const remaining = selectedRepair
        ? Math.max(0, selectedRepair.agreedPrice - selectedRepair.advancePayment)
        : 0
      const paidNow = paidNowInput !== '' ? Number(paidNowInput) : writeToDebt ? 0 : remaining

      const { data, error } = await getApi()
        .repairs({ id: String(id) })
        .deliver.post({
          paidNow,
          writeToDebt,
          dueDate: debtDueDate ? new Date(debtDueDate).toISOString() : null,
        })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      refreshAll()
      setDeliverDialogOpen(false)
    },
  })

  const deleteRepairMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await getApi()
        .repairs({ id: String(id) })
        .delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      refreshAll()
    },
  })

  const columns = useMemo(() => {
    const built = visibleFields.map((field) => {
      if (!field.isSystem) {
        return colHelper.display({
          id: field.fieldKey,
          header: field.label,
          cell: (info) => {
            const r = info.row.original
            const cf = (r.customFields ?? {}) as Record<string, unknown>
            return (
              <CustomFieldCell
                field={field}
                rowId={r.id}
                rawValue={cf[field.fieldKey]}
                onUpdateCell={updateCell}
              />
            )
          },
        })
      }

      switch (field.fieldKey) {
        case 'id':
          return colHelper.accessor('id', {
            header: field.label,
            cell: (info) => (
              <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                #{info.getValue()}
              </span>
            ),
          })
        case 'customerName':
          return colHelper.accessor('customerName', {
            header: field.label,
            cell: (info) => {
              const r = info.row.original
              return (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {r.customerName}
                    </span>
                    {r.customerType === 'partner' && (
                      <Badge className="border-violet-200 bg-violet-100 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
                        {m.repairs_partner_badge()}
                      </Badge>
                    )}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-fit cursor-default font-mono text-xs text-slate-500 dark:text-slate-400">
                        {r.customerPhone}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{r.customerPhone}</TooltipContent>
                  </Tooltip>
                </div>
              )
            },
          })
        case 'phoneModel':
          return colHelper.accessor('phoneModel', {
            header: field.label,
            cell: (info) => {
              const r = info.row.original
              return (
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {info.getValue()}
                  </span>
                  {r.imei && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-fit cursor-default font-mono text-[11px] text-slate-400">
                          IMEI: {r.imei}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>IMEI: {r.imei}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )
            },
          })
        case 'issueDescription':
          return colHelper.accessor('issueDescription', {
            header: field.label,
            cell: (info) => {
              const text = info.getValue().replace(/Zapchastsiz/gi, m.repairs_no_part())
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block max-w-52 cursor-default truncate text-xs text-slate-600 dark:text-slate-300">
                      {text}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{text}</TooltipContent>
                </Tooltip>
              )
            },
          })
        case 'partNameSnapshot':
          return colHelper.accessor('partNameSnapshot', {
            header: field.label,
            cell: (info) => {
              const val = info.getValue()
              const normalized = val?.replace(/Zapchastsiz/gi, m.repairs_no_part())
              return normalized && !normalized.toLowerCase().includes('qismsiz') ? (
                <Badge className="border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  {normalized}
                </Badge>
              ) : (
                <span className="text-xs text-slate-400">{m.repairs_no_part()}</span>
              )
            },
          })
        case 'agreedPrice':
          return colHelper.accessor('agreedPrice', {
            header: field.label,
            cell: (info) => (
              <span className="font-mono font-bold text-indigo-700 tabular-nums dark:text-indigo-300">
                {formatMoney(info.getValue())}
              </span>
            ),
          })
        case 'status':
          return colHelper.accessor('status', {
            header: field.label,
            cell: (info) => {
              const r = info.row.original
              if (r.status === 'in_progress') {
                return (
                  <Badge className="border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {m.repairs_status_in_progress()}
                  </Badge>
                )
              }
              if (r.status === 'ready') {
                return (
                  <div className="flex items-center gap-1">
                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {m.repairs_status_ready()}
                    </Badge>
                    {r.isOverdue10Plus && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="destructive">
                            {r.waitingDays} {m.unit_days()}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {r.waitingDays} {m.unit_days()}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )
              }
              return (
                <Badge className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {m.repairs_status_delivered()}
                </Badge>
              )
            },
          })
        default:
          return colHelper.accessor('createdAt', {
            id: field.fieldKey,
            header: field.label,
            cell: (info) => (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(info.getValue()).toLocaleDateString('uz-UZ', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </span>
            ),
          })
      }
    })

    built.push(
      colHelper.display({
        id: 'row_actions',
        header: '',
        cell: (info) => {
          const r = info.row.original
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs">
                        <IconDotsVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{m.actions()}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>#{r.id}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {r.status === 'in_progress' && (
                    <DropdownMenuItem onClick={() => markReadyMutation.mutate(r.id)}>
                      <IconCheck className="mr-2 size-4 text-emerald-600" />
                      {m.repairs_action_ready()}
                    </DropdownMenuItem>
                  )}
                  {r.status !== 'delivered' && (
                    <DropdownMenuItem onClick={() => openDeliverDialog(r)}>
                      <IconTruckDelivery className="mr-2 size-4 text-indigo-600" />
                      {m.repairs_action_deliver()}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className={isPrintLocked ? 'opacity-70' : undefined}
                    onClick={() => {
                      if (isPrintLocked) {
                        notifyFeatureLocked('thermal_print')
                        return
                      }
                      printRepairSticker(
                        {
                          id: r.id,
                          customerName: r.customerName,
                          customerPhone: r.customerPhone,
                          phoneModel: r.phoneModel,
                          imei: r.imei || '',
                          issueDescription: r.issueDescription,
                          lockType: r.lockType,
                          lockCode: r.lockCode || '',
                          agreedPrice: r.agreedPrice,
                          advancePayment: r.advancePayment,
                          createdAt: r.createdAt,
                        },
                        printerPaperWidth,
                      )
                    }}
                  >
                    {isPrintLocked ? (
                      <IconLock className="mr-2 size-4 text-amber-500" />
                    ) : (
                      <IconPrinter className="mr-2 size-4" />
                    )}
                    {m.repairs_action_sticker()}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEditDialog(r)}>
                    <IconEdit className="mr-2 size-4" />
                    {m.edit()}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => deleteRepairMutation.mutate(r.id)}
                  >
                    <IconTrash className="size-4" />
                    {m.delete_action()}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      }),
    )

    return colHelper.columns(built)
  }, [visibleFields, formatMoney, updateCell, markReadyMutation, deleteRepairMutation])

  const table = useTable({
    features: tableFeat,
    columns,
    data: paginatedRepairs,
    getRowId: (row) => String(row.id),
  })

  const inProgressCount = allRepairs.filter((r) => r.status === 'in_progress').length
  const readyCount = allRepairs.filter((r) => r.status === 'ready').length
  const overdueCount = allRepairs.filter((r) => r.isOverdue10Plus).length
  const totalRevenue = allRepairs.reduce((sum, r) => sum + r.agreedPrice, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* 4 ta KPI Summary Card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="h-fit justify-between border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {m.repairs_kpi_in_progress()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-amber-200/80 bg-amber-100/80 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <IconClockHour4 className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-amber-950 tabular-nums sm:text-3xl dark:text-amber-100">
            {inProgressCount} {m.unit_pcs()}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {m.repairs_kpi_ready()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <IconCircleCheck className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-emerald-950 tabular-nums sm:text-3xl dark:text-emerald-100">
            {readyCount} {m.unit_pcs()}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              {m.repairs_kpi_total()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-100/80 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              <IconTool className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-indigo-950 tabular-nums sm:text-3xl dark:text-indigo-100">
            {formatMoney(totalRevenue)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-rose-200/80 bg-gradient-to-br from-rose-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              {m.repairs_kpi_overdue()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-rose-200/80 bg-rose-100/80 text-rose-600 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
              <IconAlertTriangle className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-rose-600 tabular-nums sm:text-3xl dark:text-rose-400">
            {overdueCount} {m.unit_pcs()}
          </CardTitle>
        </Card>
      </div>

      {/* Jadval va Filtrlar */}
      <Card className="border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 pb-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs
              value={customerTypeFilter}
              onValueChange={(v) => setCustomerTypeFilter(v as typeof customerTypeFilter)}
            >
              <TabsList className="bg-slate-200/70 dark:bg-slate-800">
                <TabsTrigger value="all">{m.all()}</TabsTrigger>
                <TabsTrigger value="regular">{m.repairs_tab_regular()}</TabsTrigger>
                <TabsTrigger value="partner">{m.repairs_tab_partner()}</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2.5">
              <div className="relative w-64">
                <IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={m.repairs_search_placeholder()}
                  className="bg-white pl-9 dark:bg-slate-950"
                />
              </div>

              <DataTableExportButton
                title={m.app_repairs()}
                filenamePrefix="repairs"
                rows={filteredRepairs}
                getRowDate={(r) => r.createdAt}
                columns={visibleFields
                  .filter((f) => f.fieldKey !== 'actions')
                  .map((field) => ({
                    header: field.label,
                    accessor: (r: (typeof filteredRepairs)[number]) => {
                      if (!field.isSystem) {
                        const cf = (r.customFields ?? {}) as Record<string, unknown>
                        return String(cf[field.fieldKey] ?? '—')
                      }
                      switch (field.fieldKey) {
                        case 'id':
                          return `#${r.id}`
                        case 'customerName':
                          return `${r.customerName} (${r.customerPhone})`
                        case 'phoneModel':
                          return `${r.phoneModel}${r.imei ? ` [IMEI: ${r.imei}]` : ''}`
                        case 'issueDescription':
                          return r.issueDescription
                        case 'partNameSnapshot':
                          return r.partNameSnapshot || m.repairs_no_part()
                        case 'agreedPrice':
                          return formatMoney(r.agreedPrice)
                        case 'status':
                          return r.status === 'in_progress'
                            ? m.repairs_status_in_progress()
                            : r.status === 'ready'
                              ? m.repairs_status_ready()
                              : m.repairs_status_delivered()
                        default:
                          return new Date(r.createdAt).toLocaleDateString('uz-UZ')
                      }
                    },
                  }))}
              />

              <Button onClick={openNewDialog}>
                <IconPlus data-icon="inline-start" />
                {m.repairs_new_btn()}
              </Button>
            </div>
          </div>

          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <TabsList className="bg-slate-200/70 dark:bg-slate-800">
              <TabsTrigger value="all">
                {m.all()} ({allRepairs.length})
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                {m.repairs_status_in_progress()} ({inProgressCount})
              </TabsTrigger>
              <TabsTrigger value="ready">
                {m.repairs_status_ready()} ({readyCount})
              </TabsTrigger>
              <TabsTrigger value="delivered">{m.repairs_status_delivered()}</TabsTrigger>
              <TabsTrigger value="overdue_10">
                {m.repairs_status_overdue()} ({overdueCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            {table.getRowModel().rows.length > 0 && (
              <TableHeader className="bg-indigo-50/40 dark:bg-slate-800/60">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="px-4 font-semibold text-slate-700 dark:text-slate-300"
                      >
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
            )}
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="p-0">
                    <EmptyState
                      title={m.repairs_empty_title()}
                      description={m.repairs_empty_desc()}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/50"
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            page={page}
            totalItems={filteredRepairs.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* Yangi buyurtma / Tahrirlash Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedId
                ? m.repairs_dialog_edit_title({ id: selectedId })
                : m.repairs_dialog_new_title()}
            </DialogTitle>
            <DialogDescription>{m.repairs_dialog_desc()}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-2">
            <Tabs
              value={customerType}
              onValueChange={(v) => setCustomerType(v as 'regular' | 'partner')}
            >
              <TabsList className="w-full bg-slate-200/70 dark:bg-slate-800">
                <TabsTrigger value="regular" className="flex-1">
                  {m.repairs_type_regular()}
                </TabsTrigger>
                <TabsTrigger value="partner" className="flex-1">
                  {m.repairs_type_partner()}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.repairs_customer_name()}</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Azizbek"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">
                  {m.repairs_customer_phone()}
                </Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.repairs_phone_model()}</Label>
                <Input
                  value={phoneModel}
                  onChange={(e) => setPhoneModel(e.target.value)}
                  placeholder="iPhone 13 Pro"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.repairs_imei_opt()}</Label>
                <Input value={imei} onChange={(e) => setImei(e.target.value)} placeholder="IMEI" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.repairs_issue_label()}</Label>
                <Input
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.repairs_promised_date()}</Label>
                <DatePicker value={promisedAt} onChange={setPromisedAt} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs">{m.repairs_lock_label()}</Label>
                <Tabs
                  value={lockType}
                  onValueChange={(v) => {
                    setLockType(v as 'text' | 'pattern')
                    setLockCode('')
                  }}
                >
                  <TabsList className="bg-slate-200/70 dark:bg-slate-800">
                    <TabsTrigger value="text">{m.repairs_lock_text()}</TabsTrigger>
                    <TabsTrigger value="pattern">{m.repairs_lock_pattern()}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {lockType === 'text' ? (
                <Input
                  value={lockCode}
                  onChange={(e) => setLockCode(e.target.value)}
                  placeholder={m.repairs_lock_placeholder()}
                />
              ) : (
                <PatternLockInput value={lockCode} onChange={setLockCode} />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">
                {m.repairs_part_select_label()}
              </Label>
              <Select
                value={partId ? String(partId) : 'none'}
                onValueChange={(val) => setPartId(val === 'none' ? null : Number(val))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={m.repairs_part_none()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">{m.repairs_part_none()}</SelectItem>
                    {availableParts.map((part) => (
                      <SelectItem key={part.id} value={String(part.id)}>
                        {part.name} ({part.quantity} {m.unit_items()})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.repairs_agreed_price()}</Label>
                <Input
                  type="number"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(e.target.value)}
                  placeholder="500000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">
                  {m.repairs_advance_payment()}
                </Label>
                <Input
                  type="number"
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(e.target.value)}
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

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
              {m.cancel()}
            </Button>
            <Button
              variant="secondary"
              disabled={
                saveMutation.isPending ||
                !customerName.trim() ||
                !phoneModel.trim() ||
                !issueDescription.trim()
              }
              onClick={() => saveMutation.mutate(false)}
            >
              {m.save()}
            </Button>
            <Button
              disabled={
                saveMutation.isPending ||
                !customerName.trim() ||
                !phoneModel.trim() ||
                !issueDescription.trim()
              }
              onClick={() => saveMutation.mutate(true)}
            >
              <IconPrinter data-icon="inline-start" />
              {m.repairs_save_and_sticker()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Topshirish va To'lov Dialog */}
      <Dialog open={deliverDialogOpen} onOpenChange={setDeliverDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{m.repairs_deliver_title({ id: selectedRepair?.id ?? '' })}</DialogTitle>
            <DialogDescription>
              {selectedRepair?.customerName} ({selectedRepair?.phoneModel})
            </DialogDescription>
          </DialogHeader>

          {selectedRepair && (
            <div className="flex flex-col gap-3.5 py-2">
              <div className="grid grid-cols-2 gap-2 rounded-xl border bg-slate-50 p-3 text-xs dark:bg-slate-900">
                <div>
                  <span className="text-muted-foreground">{m.repairs_agreed_price()}:</span>
                  <div className="font-mono text-sm font-bold">
                    {formatMoney(selectedRepair.agreedPrice)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">{m.repairs_advance_payment()}:</span>
                  <div className="font-mono text-sm font-bold text-emerald-600">
                    {formatMoney(selectedRepair.advancePayment)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.repairs_paid_now_label()}</Label>
                <Input
                  type="number"
                  value={paidNowInput}
                  onChange={(e) => setPaidNowInput(e.target.value)}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                <Checkbox
                  checked={writeToDebt}
                  onCheckedChange={(c) => setWriteToDebt(Boolean(c))}
                />
                {m.repairs_write_to_debt()}
              </label>

              {writeToDebt && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">{m.repairs_debt_due_date()}</Label>
                  <DatePicker value={debtDueDate} onChange={setDebtDueDate} />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverDialogOpen(false)}>
              {m.cancel()}
            </Button>
            <Button
              disabled={!selectedRepair || markDeliveredMutation.isPending}
              onClick={() => selectedRepair && markDeliveredMutation.mutate(selectedRepair.id)}
            >
              <IconTruckDelivery data-icon="inline-start" />
              {m.repairs_confirm_deliver()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
