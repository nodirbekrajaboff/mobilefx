import {
  IconAlertCircle,
  IconBoxSeam,
  IconDotsVertical,
  IconEdit,
  IconMinus,
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

export const Route = createFileRoute('/parts')({
  component: PartsInventoryPage,
})

type PartsResponse = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getApi>['parts']['get']>>['data']
>
type PartItem = PartsResponse['parts'][number]

interface ExcelBatchRow {
  rowId: string
  name: string
  categoryId: number
  quantity: string
  costPrice: string
  salePrice: string
}

const tableFeat = tableFeatures({})
const colHelper = createColumnHelper<typeof tableFeat, PartItem>()

function stripEmoji(label: string): string {
  return label.replace(/^[^\p{L}\p{N}]+\s*/u, '').trim() || label
}

function PartsInventoryPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { formatMoney, refetchOverview } = useCurrency()
  const { visibleFields, customFields: customFieldDefs, updateCell } = useTableFields('parts')

  const partsQuery = useQuery({
    queryKey: ['parts'],
    queryFn: async () => {
      const { data, error } = await getApi().parts.get()
      if (error) throw error
      return data
    },
  })

  const categories = partsQuery.data?.categories ?? []
  const allParts = partsQuery.data?.parts ?? []
  const summary = partsQuery.data?.summary

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const [newCategoryName, setNewCategoryName] = useState('')
  const [catDialogOpen, setCatDialogOpen] = useState(false)

  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<PartItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<number>(1)
  const [editQuantity, setEditQuantity] = useState('0')
  const [editCostPrice, setEditCostPrice] = useState('0')
  const [editSalePrice, setEditSalePrice] = useState('0')
  const [editCustomValues, setEditCustomValues] = useState<Record<string, unknown>>({})

  const [supplierName, setSupplierName] = useState('Malika Ehtiyot Qismlar Markazi')
  const [supplierPhone, setSupplierPhone] = useState('+998 97 700 11 22')
  const [paidAmount, setPaidAmount] = useState('')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  })
  const [excelRows, setExcelRows] = useState<ExcelBatchRow[]>(() => [
    {
      rowId: 'row-1',
      name: '',
      categoryId: 1,
      quantity: '5',
      costPrice: '',
      salePrice: '',
    },
    {
      rowId: 'row-2',
      name: '',
      categoryId: 1,
      quantity: '5',
      costPrice: '',
      salePrice: '',
    },
  ])

  const defaultCatId = categories[0]?.id ?? 1

  const openEditPartDialog = (part: PartItem) => {
    setEditingPart(part)
    setEditName(part.name)
    setEditCategoryId(part.categoryId)
    setEditQuantity(String(part.quantity))
    setEditCostPrice(String(part.costPrice))
    setEditSalePrice(String(part.salePrice))
    setEditCustomValues(((part.customFields ?? {}) as Record<string, unknown>) || {})
    setEditDialogOpen(true)
  }

  const addExcelRow = () => {
    setExcelRows((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}-${prev.length}`,
        name: '',
        categoryId: defaultCatId,
        quantity: '1',
        costPrice: '',
        salePrice: '',
      },
    ])
  }

  const updateExcelRow = (rowId: string, field: keyof ExcelBatchRow, val: string | number) => {
    setExcelRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: val } : r)))
  }

  const removeExcelRow = (rowId: string) => {
    setExcelRows((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev))
  }

  const totalBatchCost = useMemo(() => {
    return excelRows.reduce((acc, r) => {
      const q = Number(r.quantity) || 0
      const c = Number(r.costPrice) || 0
      return acc + q * c
    }, 0)
  }, [excelRows])

  const effectivePaidAmount = paidAmount !== '' ? Number(paidAmount) || 0 : totalBatchCost
  const remainingSupplierDebt = Math.max(0, totalBatchCost - effectivePaidAmount)

  const addCategoryMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await getApi().parts.categories.post({
        name: newCategoryName,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      setNewCategoryName('')
      setCatDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['parts'] })
    },
  })

  const batchIntakeMutation = useMutation({
    mutationFn: async () => {
      const validItems = excelRows
        .filter((r) => r.name.trim() && Number(r.quantity) > 0)
        .map((r) => ({
          name: r.name.trim(),
          categoryId: Number(r.categoryId) || defaultCatId,
          quantity: Number(r.quantity) || 1,
          costPrice: Number(r.costPrice) || 0,
          salePrice: Number(r.salePrice) || Number(r.costPrice) || 0,
        }))

      const { data, error } = await getApi().parts['batch-intake'].post({
        supplierName,
        supplierPhone,
        paidAmount: effectivePaidAmount,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        items: validItems,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parts'] })
      void queryClient.invalidateQueries({ queryKey: ['debts'] })
      refetchOverview()
      setBatchDialogOpen(false)
      setPaidAmount('')
      setExcelRows([
        {
          rowId: `row-${Date.now()}-1`,
          name: '',
          categoryId: defaultCatId,
          quantity: '5',
          costPrice: '',
          salePrice: '',
        },
      ])
    },
  })

  const quickAdjustStockMutation = useMutation({
    mutationFn: async (payload: { id: number; quantity: number }) => {
      const { data, error } = await getApi()
        .parts({ id: String(payload.id) })
        .put({ quantity: payload.quantity })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parts'] })
      refetchOverview()
    },
  })

  const saveEditPartMutation = useMutation({
    mutationFn: async () => {
      if (!editingPart) return null
      const { data, error } = await getApi()
        .parts({ id: String(editingPart.id) })
        .put({
          name: editName,
          categoryId: editCategoryId,
          quantity: Number(editQuantity) || 0,
          costPrice: Number(editCostPrice) || 0,
          salePrice: Number(editSalePrice) || 0,
          customFields: editCustomValues,
        })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parts'] })
      refetchOverview()
      setEditDialogOpen(false)
    },
  })

  const deletePartMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await getApi()
        .parts({ id: String(id) })
        .delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parts'] })
      refetchOverview()
    },
  })

  const filteredParts = useMemo(() => {
    return allParts.filter((p) => {
      if (selectedCategoryId !== 'all' && String(p.categoryId) !== selectedCategoryId) {
        return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.categoryName.toLowerCase().includes(q)) {
          return false
        }
      }
      return true
    })
  }, [allParts, selectedCategoryId, search])

  useEffect(() => {
    setPage(1)
  }, [selectedCategoryId, search])

  const paginatedParts = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredParts.slice(start, start + pageSize)
  }, [filteredParts, page])

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
        case 'name':
          return colHelper.accessor('name', {
            header: field.label,
            cell: (info) => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default font-semibold text-slate-900 dark:text-slate-100">
                    {info.getValue()}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{info.getValue()}</TooltipContent>
              </Tooltip>
            ),
          })
        case 'categoryName':
          return colHelper.accessor('categoryName', {
            header: field.label,
            cell: (info) => (
              <Badge className="border-violet-200 bg-violet-100 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
                {stripEmoji(info.getValue())}
              </Badge>
            ),
          })
        case 'quantity':
          return colHelper.accessor('quantity', {
            header: field.label,
            cell: (info) => {
              const q = info.getValue()
              if (q <= 0) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive">{m.common_count_dona({ count: 0 })}</Badge>
                    </TooltipTrigger>
                    <TooltipContent>{m.parts_out_of_stock()}</TooltipContent>
                  </Tooltip>
                )
              }
              if (q <= 3) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {m.common_count_dona({ count: q })}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{m.parts_low_stock()}</TooltipContent>
                  </Tooltip>
                )
              }
              return (
                <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {m.common_count_dona({ count: q })}
                </Badge>
              )
            },
          })
        case 'costPrice':
          return colHelper.accessor('costPrice', {
            header: field.label,
            cell: (info) => (
              <span className="font-mono text-slate-600 tabular-nums dark:text-slate-300">
                {formatMoney(info.getValue())}
              </span>
            ),
          })
        case 'salePrice':
          return colHelper.accessor('salePrice', {
            header: field.label,
            cell: (info) => (
              <span className="font-mono font-semibold text-indigo-700 tabular-nums dark:text-indigo-300">
                {formatMoney(info.getValue())}
              </span>
            ),
          })
        case 'totalSaleValue':
          return colHelper.accessor('totalSaleValue', {
            header: field.label,
            cell: (info) => {
              const p = info.row.original
              return (
                <span className="font-mono font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
                  {formatMoney(p.quantity * p.salePrice)}
                </span>
              )
            },
          })
        default:
          return colHelper.display({
            id: field.fieldKey,
            header: field.label,
            cell: (info) => {
              const p = info.row.original
              return (
                <div className="flex items-center justify-end gap-1">
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
                      <DropdownMenuLabel>{p.name}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          quickAdjustStockMutation.mutate({
                            id: p.id,
                            quantity: p.quantity + 1,
                          })
                        }
                      >
                        <IconPlus className="mr-2 size-4 text-emerald-600" />
                        {m.parts_action_inc()}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={p.quantity <= 0}
                        onClick={() =>
                          quickAdjustStockMutation.mutate({
                            id: p.id,
                            quantity: Math.max(0, p.quantity - 1),
                          })
                        }
                      >
                        <IconMinus className="mr-2 size-4 text-amber-600" />
                        {m.parts_action_dec()}
                      </DropdownMenuItem>
                      {p.quantity > 0 && (
                        <DropdownMenuItem onClick={() => void navigate({ to: '/pos' })}>
                          <IconShoppingCart className="mr-2 size-4 text-indigo-600" />
                          {m.phones_action_pos()}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openEditPartDialog(p)}>
                        <IconEdit className="mr-2 size-4" />
                        {m.common_edit()}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => deletePartMutation.mutate(p.id)}
                      >
                        <IconTrash className="size-4" />
                        {m.common_delete()}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            },
          })
      }
    })
    return colHelper.columns(built)
  }, [
    visibleFields,
    formatMoney,
    quickAdjustStockMutation,
    deletePartMutation,
    navigate,
    updateCell,
  ])

  const table = useTable({
    features: tableFeat,
    columns,
    data: paginatedParts,
    getRowId: (row) => String(row.id),
  })

  return (
    <div className="flex flex-col gap-5">
      {/* 4 ta KPI Summary Card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="h-fit justify-between border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-violet-700 dark:text-violet-400">
              {m.parts_kpi_total()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-violet-200/80 bg-violet-100/80 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
              <IconBoxSeam className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-violet-950 tabular-nums sm:text-3xl dark:text-violet-100">
            {m.common_count_dona({ count: summary?.totalPartsQuantity ?? 0 })}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-sky-700 dark:text-sky-400">
              {m.parts_kpi_capital()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-sky-200/80 bg-sky-100/80 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
              <IconWallet className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-sky-950 tabular-nums sm:text-3xl dark:text-sky-100">
            {formatMoney(summary?.totalInvestedCost ?? 0)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {m.parts_kpi_sale()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <IconTrendingUp className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-emerald-950 tabular-nums sm:text-3xl dark:text-emerald-100">
            {formatMoney(summary?.totalSaleSum ?? 0)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              {m.parts_kpi_debt()}
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
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <TabsList className="bg-slate-200/70 dark:bg-slate-800">
                <TabsTrigger value="all">{m.common_all()}</TabsTrigger>
                {categories.map((cat) => (
                  <TabsTrigger key={cat.id} value={String(cat.id)}>
                    {stripEmoji(cat.name)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              size="sm"
              className="bg-white dark:bg-slate-950"
              onClick={() => setCatDialogOpen(true)}
            >
              <IconPlus data-icon="inline-start" />
              {m.parts_btn_add_cat()}
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-64">
              <IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={m.common_search()}
                className="bg-white pl-9 dark:bg-slate-950"
              />
            </div>

            <DataTableExportButton
              title={m.app_parts()}
              filenamePrefix="parts"
              rows={filteredParts}
              getRowDate={(p) => p.createdAt}
              columns={visibleFields
                .filter((f) => f.fieldKey !== 'actions')
                .map((field) => ({
                  header: field.label,
                  accessor: (p: PartItem) => {
                    if (!field.isSystem) {
                      const cf = (p.customFields ?? {}) as Record<string, unknown>
                      return String(cf[field.fieldKey] ?? '—')
                    }
                    switch (field.fieldKey) {
                      case 'name':
                        return p.name
                      case 'categoryName':
                        return stripEmoji(p.categoryName)
                      case 'quantity':
                        return p.quantity
                      case 'costPrice':
                        return formatMoney(p.costPrice)
                      case 'salePrice':
                        return formatMoney(p.salePrice)
                      case 'totalSaleValue':
                        return formatMoney(p.quantity * p.salePrice)
                      default:
                        return '—'
                    }
                  },
                }))}
            />

            <Button onClick={() => setBatchDialogOpen(true)}>
              <IconPlus data-icon="inline-start" />
              {m.phones_btn_intake()}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            {table.getRowModel().rows.length > 0 && (
              <TableHeader className="bg-violet-50/40 dark:bg-slate-800/60">
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
                    <EmptyState title={m.common_not_found()} description={m.parts_empty_desc()} />
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-violet-50/30 dark:hover:bg-slate-800/50"
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
            totalItems={filteredParts.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* Yangi toifa qo'shish Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{m.parts_cat_dialog_title()}</DialogTitle>
            <DialogDescription>{m.parts_cat_dialog_desc()}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={m.parts_cat_placeholder()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCategoryName.trim()) {
                  addCategoryMutation.mutate()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>
              {m.common_cancel()}
            </Button>
            <Button
              disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
              onClick={() => addCategoryMutation.mutate()}
            >
              {m.common_add()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partiyali kirim Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{m.parts_batch_title()}</DialogTitle>
            <DialogDescription>{m.parts_batch_desc()}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.parts_field_supplier()}</Label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder={m.phones_field_source_placeholder()}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">
                  {m.repairs_field_phone().replace(' *', '')}
                </Label>
                <Input
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="+998 97 700 11 22"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs">{m.parts_field_due()}</Label>
                <DatePicker value={dueDate} onChange={setDueDate} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-semibold">
                {m.parts_batch_list_label()}
              </span>
              <Button variant="outline" size="xs" onClick={addExcelRow}>
                <IconPlus data-icon="inline-start" />
                {m.parts_btn_add_row()}
              </Button>
            </div>

            <div className="border-border rounded-xl border">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>{m.parts_col_name()}</TableHead>
                    <TableHead className="w-40">{m.parts_col_category()}</TableHead>
                    <TableHead className="w-24">{m.parts_col_qty()}</TableHead>
                    <TableHead className="w-32">{m.parts_col_cost()}</TableHead>
                    <TableHead className="w-32">{m.parts_col_sale()}</TableHead>
                    <TableHead className="w-32">{m.parts_col_total()}</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excelRows.map((row, idx) => {
                    const rowSum = (Number(row.quantity) || 0) * (Number(row.costPrice) || 0)
                    return (
                      <TableRow key={row.rowId}>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.name}
                            onChange={(e) => updateExcelRow(row.rowId, 'name', e.target.value)}
                            placeholder="iPhone 13 Pro OLED Ekran"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String(row.categoryId)}
                            onValueChange={(val) =>
                              updateExcelRow(row.rowId, 'categoryId', Number(val))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {categories.map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>
                                    {stripEmoji(c.name)}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) => updateExcelRow(row.rowId, 'quantity', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.costPrice}
                            onChange={(e) => updateExcelRow(row.rowId, 'costPrice', e.target.value)}
                            placeholder="1282000"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.salePrice}
                            onChange={(e) => updateExcelRow(row.rowId, 'salePrice', e.target.value)}
                            placeholder="1650000"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatMoney(rowSum)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeExcelRow(row.rowId)}
                          >
                            <IconTrash />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-slate-50/70 p-3 text-xs dark:bg-slate-900">
              <div>
                <span className="text-muted-foreground">{m.parts_batch_total_cost()} </span>
                <span className="font-mono text-sm font-bold">{formatMoney(totalBatchCost)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{m.parts_batch_paid()}</span>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={String(totalBatchCost)}
                  className="w-36 bg-white dark:bg-slate-950"
                />
              </div>

              {remainingSupplierDebt > 0 && (
                <div>
                  <span className="text-muted-foreground">{m.parts_batch_to_debt()} </span>
                  <span className="font-mono text-sm font-bold text-rose-600">
                    {formatMoney(remainingSupplierDebt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              {m.common_cancel()}
            </Button>
            <Button
              disabled={
                batchIntakeMutation.isPending ||
                !supplierName.trim() ||
                excelRows.every((r) => !r.name.trim())
              }
              onClick={() => batchIntakeMutation.mutate()}
            >
              {m.common_save()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tahrirlash Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{m.parts_edit_title()}</DialogTitle>
            <DialogDescription>{m.parts_edit_desc()}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{m.parts_col_name()}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.parts_col_category()}</Label>
                <Select
                  value={String(editCategoryId)}
                  onValueChange={(v) => setEditCategoryId(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {stripEmoji(c.name)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.parts_field_qty()}</Label>
                <Input
                  type="number"
                  min={0}
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.parts_col_cost()} (UZS)</Label>
                <Input
                  type="number"
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.parts_col_sale()} (UZS)</Label>
                <Input
                  type="number"
                  value={editSalePrice}
                  onChange={(e) => setEditSalePrice(e.target.value)}
                />
              </div>
            </div>

            <CustomFieldsFormSection
              fields={customFieldDefs}
              values={editCustomValues}
              onChange={(k, v) => setEditCustomValues((prev) => ({ ...prev, [k]: v }))}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {m.common_cancel()}
            </Button>
            <Button
              disabled={!editName.trim() || saveEditPartMutation.isPending}
              onClick={() => saveEditPartMutation.mutate()}
            >
              {m.common_save()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
