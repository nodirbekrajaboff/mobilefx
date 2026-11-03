import {
  IconAlertCircle,
  IconDeviceMobile,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconSearch,
  IconShoppingCart,
  IconTrash,
  IconTrendingUp,
  IconWallet,
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'

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

export const Route = createFileRoute('/phones')({
  component: PhonesInventoryPage,
})

type PhonesResponse = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getApi>['phones']['get']>>['data']
>
type PhoneItem = PhonesResponse['phones'][number]

const tableFeat = tableFeatures({})
const colHelper = createColumnHelper<typeof tableFeat, PhoneItem>()

function PhonesInventoryPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { formatMoney, refetchOverview } = useCurrency()
  const { visibleFields, customFields: customFieldDefs, updateCell } = useTableFields('phones')

  const phonesQuery = useQuery({
    queryKey: ['phones'],
    queryFn: async () => {
      const { data, error } = await getApi().phones.get()
      if (error) throw error
      return data
    },
  })

  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'sold'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [model, setModel] = useState('')
  const [color, setColor] = useState('Qora')
  const [imei, setImei] = useState('')
  const [condition, setCondition] = useState<'new' | 'used'>('new')
  const [batteryHealth, setBatteryHealth] = useState('100')
  const [boxAndCharger, setBoxAndCharger] = useState('To`liq (Quti + Quvvatlagich)')
  const [sourceName, setSourceName] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('+998 ')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [extraExpenses, setExtraExpenses] = useState('0')
  const [salePrice, setSalePrice] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  })
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({})

  const summary = phonesQuery.data?.summary
  const allPhones = phonesQuery.data?.phones ?? []

  const openNewDialog = () => {
    setEditingId(null)
    setModel('')
    setColor('Qora')
    setImei('')
    setCondition('new')
    setBatteryHealth('100')
    setBoxAndCharger('To`liq (Quti + Quvvatlagich)')
    setSourceName('')
    setSupplierPhone('+998 ')
    setPurchasePrice('')
    setExtraExpenses('0')
    setSalePrice('')
    setPaidAmount('')
    setCustomValues({})
    setDialogOpen(true)
  }

  const openEditDialog = (p: PhoneItem) => {
    setEditingId(p.id)
    setModel(p.model)
    setColor(p.color)
    setImei(p.imei || '')
    setCondition(p.condition === 'used' ? 'used' : 'new')
    setBatteryHealth(String(p.batteryHealth ?? 100))
    setBoxAndCharger(p.boxAndCharger || 'To`liq (Quti + Quvvatlagich)')
    setSourceName(p.sourceName)
    setPurchasePrice(String(p.purchasePrice))
    setExtraExpenses(String(p.extraExpenses))
    setSalePrice(String(p.salePrice))
    setPaidAmount(String(p.purchasePrice))
    setCustomValues(((p.customFields ?? {}) as Record<string, unknown>) || {})
    setDialogOpen(true)
  }

  const filteredPhones = useMemo(() => {
    return allPhones.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchModel = p.model.toLowerCase().includes(q)
        const matchImei = (p.imei || '').toLowerCase().includes(q)
        const matchSource = p.sourceName.toLowerCase().includes(q)
        if (!matchModel && !matchImei && !matchSource) return false
      }
      return true
    })
  }, [allPhones, statusFilter, search])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, search])

  const paginatedPhones = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredPhones.slice(start, start + pageSize)
  }, [filteredPhones, page])

  const savePhoneMutation = useMutation({
    mutationFn: async () => {
      const pPrice = Number(purchasePrice) || 0
      const pPaid = paidAmount !== '' ? Number(paidAmount) : pPrice

      if (editingId) {
        const { data, error } = await getApi()
          .phones({ id: String(editingId) })
          .put({
            model,
            color,
            imei,
            condition,
            batteryHealth: Number(batteryHealth) || 100,
            boxAndCharger,
            sourceName,
            purchasePrice: pPrice,
            extraExpenses: Number(extraExpenses) || 0,
            salePrice: Number(salePrice) || pPrice,
            customFields: customValues,
          })
        if (error) throw error
        return data
      } else {
        const { data, error } = await getApi().phones.post({
          model,
          color,
          imei,
          condition,
          batteryHealth: Number(batteryHealth) || 100,
          boxAndCharger,
          sourceName,
          supplierPhone,
          purchasePrice: pPrice,
          extraExpenses: Number(extraExpenses) || 0,
          salePrice: Number(salePrice) || pPrice,
          paidAmount: pPaid,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          customFields: customValues,
        })
        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['phones'] })
      void queryClient.invalidateQueries({ queryKey: ['debts'] })
      refetchOverview()
      setDialogOpen(false)
    },
  })

  const deletePhoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await getApi()
        .phones({ id: String(id) })
        .delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['phones'] })
      refetchOverview()
    },
  })

  const columns = useMemo(() => {
    const built = visibleFields.map((field) => {
      if (!field.isSystem) {
        return colHelper.display({
          id: field.fieldKey,
          header: field.label,
          cell: (info) => {
            const p = info.row.original
            const cf = (p.customFields ?? {}) as Record<string, unknown>
            return (
              <CustomFieldCell
                field={field}
                rowId={p.id}
                rawValue={cf[field.fieldKey]}
                onUpdateCell={updateCell}
              />
            )
          },
        })
      }

      switch (field.fieldKey) {
        case 'model':
          return colHelper.accessor('model', {
            header: field.label,
            cell: (info) => {
              const p = info.row.original
              return (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {p.model}
                  </span>
                  {p.isTradeIn && (
                    <Badge className="border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Trade-In
                    </Badge>
                  )}
                </div>
              )
            },
          })
        case 'color':
          return colHelper.accessor('color', {
            header: field.label,
            cell: (info) => (
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
              >
                {info.getValue()}
              </Badge>
            ),
          })
        case 'imei':
          return colHelper.accessor('imei', {
            header: field.label,
            cell: (info) => {
              const val = info.getValue()
              return val ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-default font-mono text-xs text-slate-500 dark:text-slate-400">
                      {val}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>IMEI: {val}</TooltipContent>
                </Tooltip>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )
            },
          })
        case 'condition':
          return colHelper.accessor('condition', {
            header: field.label,
            cell: (info) => {
              const p = info.row.original
              return (
                <div className="flex items-center gap-1.5">
                  {p.condition === 'new' ? (
                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {m.phones_cond_new()}
                    </Badge>
                  ) : (
                    <Badge className="border-sky-200 bg-sky-100 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      {m.phones_cond_used()}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="font-mono text-[11px] text-slate-700 dark:text-slate-300"
                  >
                    {p.batteryHealth ?? 100}%
                  </Badge>
                </div>
              )
            },
          })
        case 'boxAndCharger':
          return colHelper.accessor('boxAndCharger', {
            header: field.label,
            cell: (info) => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block max-w-36 cursor-default truncate text-xs text-slate-600 dark:text-slate-300">
                    {info.getValue()}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{info.getValue()}</TooltipContent>
              </Tooltip>
            ),
          })
        case 'sourceName':
          return colHelper.accessor('sourceName', {
            header: field.label,
            cell: (info) => {
              const src = info
                .getValue()
                .replace(/Ko[`']chadan olindi/gi, 'Xaridordan qabul qilindi')
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block max-w-40 cursor-default truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                      {src}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{src}</TooltipContent>
                </Tooltip>
              )
            },
          })
        case 'costPrice':
          return colHelper.accessor('costPrice', {
            header: field.label,
            cell: (info) => (
              <span className="font-mono font-semibold text-slate-700 tabular-nums dark:text-slate-300">
                {formatMoney(info.getValue())}
              </span>
            ),
          })
        case 'salePrice':
          return colHelper.accessor('salePrice', {
            header: field.label,
            cell: (info) => {
              const p = info.row.original
              const effectiveSale = p.soldPrice ?? p.salePrice
              const profit = effectiveSale - p.costPrice
              return (
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-indigo-700 tabular-nums dark:text-indigo-300">
                    {formatMoney(effectiveSale)}
                  </span>
                  <span
                    className={`font-mono text-[11px] font-medium tabular-nums ${
                      profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {profit >= 0 ? '+' : ''}
                    {formatMoney(profit)}
                  </span>
                </div>
              )
            },
          })
        default:
          return colHelper.accessor('status', {
            id: field.fieldKey,
            header: field.label,
            cell: (info) => {
              const p = info.row.original
              if (p.status === 'in_stock') {
                return (
                  <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {m.phones_status_in_stock()}
                  </Badge>
                )
              }
              return (
                <Badge className="border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {m.phones_status_sold()}
                </Badge>
              )
            },
          })
      }
    })

    built.push(
      colHelper.display({
        id: 'row_actions',
        header: '',
        cell: (info) => {
          const p = info.row.original
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
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{p.model}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {p.status === 'in_stock' && (
                    <DropdownMenuItem onClick={() => void navigate({ to: '/pos' })}>
                      <IconShoppingCart className="mr-2 size-4 text-indigo-600" />
                      {m.phones_sell_in_pos()}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => openEditDialog(p)}>
                    <IconEdit className="mr-2 size-4" />
                    {m.edit()}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => deletePhoneMutation.mutate(p.id)}
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
  }, [visibleFields, formatMoney, updateCell, navigate, deletePhoneMutation])

  const table = useTable({
    features: tableFeat,
    columns,
    data: paginatedPhones,
    getRowId: (row) => String(row.id),
  })

  const calculatedSupplierDebt = Math.max(
    0,
    (Number(purchasePrice) || 0) -
      (paidAmount !== '' ? Number(paidAmount) : Number(purchasePrice) || 0),
  )

  return (
    <div className="flex flex-col gap-5">
      {/* 4 ta KPI Summary Card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="h-fit justify-between border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              {m.phones_kpi_in_stock()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-100/80 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              <IconDeviceMobile className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-indigo-950 tabular-nums sm:text-3xl dark:text-indigo-100">
            {summary?.totalInStock ?? 0} {m.unit_items()}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-sky-700 dark:text-sky-400">
              {m.phones_kpi_invested()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-sky-200/80 bg-sky-100/80 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
              <IconWallet className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-sky-950 tabular-nums sm:text-3xl dark:text-sky-100">
            {formatMoney(summary?.investedCapital ?? 0)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {m.phones_kpi_sale_val()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <IconTrendingUp className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-emerald-950 tabular-nums sm:text-3xl dark:text-emerald-100">
            {formatMoney(summary?.expectedSaleValue ?? 0)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              {m.phones_kpi_supplier_debt()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-rose-200/80 bg-rose-100/80 text-rose-600 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
              <IconAlertCircle className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-rose-600 tabular-nums sm:text-3xl dark:text-rose-400">
            {formatMoney(summary?.supplierDebtTotal ?? 0)}
          </CardTitle>
        </Card>
      </div>

      {/* Jadval (Table view) */}
      <Card className="border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 pb-3 dark:border-slate-800 dark:bg-slate-900/50">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <TabsList className="bg-slate-200/70 dark:bg-slate-800">
              <TabsTrigger value="all">
                {m.all()} ({allPhones.length})
              </TabsTrigger>
              <TabsTrigger value="in_stock">
                {m.phones_status_in_stock()} (
                {allPhones.filter((p) => p.status === 'in_stock').length})
              </TabsTrigger>
              <TabsTrigger value="sold">
                {m.phones_status_sold()} ({allPhones.filter((p) => p.status === 'sold').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2.5">
            <div className="relative w-64">
              <IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={m.phones_search_placeholder()}
                className="bg-white pl-9 dark:bg-slate-950"
              />
            </div>

            <DataTableExportButton
              title={m.app_phones()}
              filenamePrefix="phones"
              rows={filteredPhones}
              getRowDate={(p) => p.createdAt}
              columns={visibleFields
                .filter((f) => f.fieldKey !== 'actions')
                .map((field) => ({
                  header: field.label,
                  accessor: (p: PhoneItem) => {
                    if (!field.isSystem) {
                      const cf = (p.customFields ?? {}) as Record<string, unknown>
                      return String(cf[field.fieldKey] ?? '—')
                    }
                    switch (field.fieldKey) {
                      case 'model':
                        return p.model
                      case 'color':
                        return p.color
                      case 'imei':
                        return p.imei || '—'
                      case 'condition':
                        return `${p.condition === 'new' ? m.phones_cond_new() : m.phones_cond_used()} (${p.batteryHealth ?? 100}%)`
                      case 'boxAndCharger':
                        return p.boxAndCharger
                      case 'sourceName':
                        return p.sourceName
                      case 'costPrice':
                        return formatMoney(p.costPrice)
                      case 'salePrice':
                        return formatMoney(p.soldPrice ?? p.salePrice)
                      default:
                        return p.status === 'in_stock'
                          ? m.phones_status_in_stock()
                          : m.phones_status_sold()
                    }
                  },
                }))}
            />

            <Button onClick={openNewDialog}>
              <IconPlus data-icon="inline-start" />
              {m.phones_intake_btn()}
            </Button>
          </div>
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
                      title={m.phones_empty_title()}
                      description={m.phones_empty_desc()}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50"
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
            totalItems={filteredPhones.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* Kirim va Tahrirlash Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? m.phones_dialog_edit_title() : m.phones_dialog_new_title()}
            </DialogTitle>
            <DialogDescription>{m.phones_dialog_desc()}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3.5 py-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">{m.phones_model_label()}</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="iPhone 15 Pro 256GB"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">{m.phones_color_label()}</Label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Qora" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">IMEI</Label>
              <Input
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                placeholder="354891124509811"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">
                  {m.phones_condition_label()}
                </Label>
                <Select
                  value={condition}
                  onValueChange={(v) => {
                    const next = v as 'new' | 'used'
                    setCondition(next)
                    if (next === 'new') setBatteryHealth('100')
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="new">{m.phones_cond_new()}</SelectItem>
                      <SelectItem value="used">{m.phones_cond_used()}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.phones_battery_label()}</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={batteryHealth}
                  onChange={(e) => setBatteryHealth(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">{m.phones_box_label()}</Label>
              <Select value={boxAndCharger} onValueChange={setBoxAndCharger}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="To`liq (Quti + Quvvatlagich)">
                      {m.phones_box_full()}
                    </SelectItem>
                    <SelectItem value="Faqat Quti">{m.phones_box_only()}</SelectItem>
                    <SelectItem value="Faqat Quvvatlagich">{m.phones_charger_only()}</SelectItem>
                    <SelectItem value="Qutisiz">{m.phones_box_none()}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">{m.phones_supplier_label()}</Label>
              <Input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">{m.phones_purchase_price()}</Label>
              <Input
                type="number"
                value={purchasePrice}
                onChange={(e) => {
                  setPurchasePrice(e.target.value)
                  if (paidAmount === '') setPaidAmount(e.target.value)
                }}
                placeholder="12820000"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">{m.phones_sale_price()}</Label>
              <Input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="14102000"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">{m.phones_extra_expense()}</Label>
              <Input
                type="number"
                value={extraExpenses}
                onChange={(e) => setExtraExpenses(e.target.value)}
              />
            </div>

            {!editingId && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.phones_paid_amount()}</Label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={purchasePrice || '0'}
                />
              </div>
            )}

            {!editingId && calculatedSupplierDebt > 0 && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-rose-600">{m.phones_supplier_phone()}</Label>
                  <Input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-rose-600">
                    {m.phones_debt_due()} ({formatMoney(calculatedSupplierDebt)})
                  </Label>
                  <DatePicker value={dueDate} onChange={setDueDate} />
                </div>
              </>
            )}
          </div>

          <CustomFieldsFormSection
            fields={customFieldDefs}
            values={customValues}
            onChange={(k, v) => setCustomValues((prev) => ({ ...prev, [k]: v }))}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {m.cancel()}
            </Button>
            <Button
              disabled={
                savePhoneMutation.isPending || !model.trim() || !sourceName.trim() || !purchasePrice
              }
              onClick={() => savePhoneMutation.mutate()}
            >
              {m.save()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
