import {
  IconCheck,
  IconCrown,
  IconDotsVertical,
  IconEdit,
  IconPhone,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUserCheck,
  IconUsers,
  IconWallet,
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { DataTableExportButton } from '#/components/DataTableExportButton'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardDescription, CardTitle } from '#/components/ui/card'
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
  DropdownMenuGroup,
  DropdownMenuItem,
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

export const Route = createFileRoute('/customers')({
  component: CustomersPage,
})

function CustomersPage() {
  const queryClient = useQueryClient()
  const { formatMoney } = useCurrency()
  const { visibleFields, customFields, updateCell } = useTableFields('customers')

  const [segmentFilter, setSegmentFilter] = useState<'all' | 'vip' | 'wholesale' | 'debtor'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  // Create Dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('+998 ')
  const [address, setAddress] = useState('')
  const [segment, setSegment] = useState<'regular' | 'vip' | 'wholesale'>('regular')
  const [notes, setNotes] = useState('')
  const [totalSpentInput, setTotalSpentInput] = useState('0')
  const [newCustomValues, setNewCustomValues] = useState<Record<string, unknown>>({})

  // Edit Dialog state
  const [editCustomerId, setEditCustomerId] = useState<number | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editSegment, setEditSegment] = useState<'regular' | 'vip' | 'wholesale'>('regular')
  const [editNotes, setEditNotes] = useState('')
  const [editTotalSpent, setEditTotalSpent] = useState('0')
  const [editCustomValues, setEditCustomValues] = useState<Record<string, unknown>>({})

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await getApi().customers.get()
      if (error) throw error
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await getApi().customers.post({
        fullName,
        phone,
        address,
        segment,
        notes,
        totalSpent: Number(totalSpentInput) || 0,
        ordersCount: Number(totalSpentInput) > 0 ? 1 : 0,
        customFields: newCustomValues,
      })
      if (error) throw error
      return data
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      void queryClient.invalidateQueries({ queryKey: ['pos'] })
      setFullName('')
      setPhone('+998 ')
      setAddress('')
      setSegment('regular')
      setNotes('')
      setTotalSpentInput('0')
      setNewCustomValues({})
      setCreateOpen(false)
      toast.success(m.customers_toast_added({ name: created.fullName }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: number
      fullName?: string
      phone?: string
      address?: string
      segment?: 'regular' | 'vip' | 'wholesale'
      notes?: string
      totalSpent?: number
      customFields?: Record<string, unknown>
    }) => {
      const { data, error } = await getApi()
        .customers({ id: String(payload.id) })
        .put({
          fullName: payload.fullName,
          phone: payload.phone,
          address: payload.address,
          segment: payload.segment,
          notes: payload.notes,
          totalSpent: payload.totalSpent,
          customFields: payload.customFields,
        })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      void queryClient.invalidateQueries({ queryKey: ['pos'] })
      setEditCustomerId(null)
      toast.success(m.customers_toast_updated())
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await getApi()
        .customers({ id: String(id) })
        .delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      void queryClient.invalidateQueries({ queryKey: ['pos'] })
      toast.success(m.customers_toast_deleted())
    },
  })

  const summary = customersQuery.data?.summary
  const allCustomers = customersQuery.data?.customers ?? []

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      if (segmentFilter === 'vip' && c.segment !== 'vip') return false
      if (segmentFilter === 'wholesale' && c.segment !== 'wholesale') return false
      if (segmentFilter === 'debtor' && c.openDebtAmount <= 0) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          c.fullName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.notes.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allCustomers, segmentFilter, searchQuery])

  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredCustomers.slice(start, start + pageSize)
  }, [filteredCustomers, page, pageSize])

  const openEditDialog = (c: (typeof allCustomers)[number]) => {
    setEditCustomerId(c.id)
    setEditFullName(c.fullName)
    setEditPhone(c.phone)
    setEditAddress(c.address)
    setEditSegment(c.segment === 'vip' || c.segment === 'wholesale' ? c.segment : 'regular')
    setEditNotes(c.notes)
    setEditTotalSpent(String(c.totalSpent))
    setEditCustomValues((c.customFields as Record<string, unknown>) || {})
  }

  return (
    <div className="flex flex-col gap-5">
      {/* TOP 4 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="h-fit justify-between border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              {m.customers_kpi_total()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-100/80 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              <IconUsers className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-indigo-950 tabular-nums sm:text-3xl dark:text-indigo-100">
            {m.common_count_people({ count: summary?.totalCustomers ?? 0 })}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {m.customers_kpi_vip()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-amber-200/80 bg-amber-100/80 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <IconCrown className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-amber-950 tabular-nums sm:text-3xl dark:text-amber-100">
            {m.common_count_people({
              count: (summary?.vipCount ?? 0) + (summary?.wholesaleCount ?? 0),
            })}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {m.customers_kpi_turnover()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-100/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <IconUserCheck className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-emerald-950 tabular-nums sm:text-3xl dark:text-emerald-100">
            {formatMoney(summary?.totalTurnover ?? 0)}
          </CardTitle>
        </Card>

        <Card className="h-fit justify-between border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-white to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              {m.customers_kpi_debt()}
            </CardDescription>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-rose-200/80 bg-rose-100/80 text-rose-600 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
              <IconWallet className="size-5" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-rose-600 tabular-nums sm:text-3xl dark:text-rose-400">
            {formatMoney(summary?.totalOpenDebt ?? 0)}
          </CardTitle>
        </Card>
      </div>

      {/* MAIN TABLE CARD */}
      <Card className="bg-card gap-0 overflow-hidden border-indigo-200/80 py-0 shadow-xs">
        <div className="border-border/80 flex flex-wrap items-center justify-between gap-3 border-b bg-gradient-to-r from-indigo-50/60 via-white to-white px-4 py-3">
          <Tabs
            value={segmentFilter}
            onValueChange={(v) => {
              setSegmentFilter(v as typeof segmentFilter)
              setPage(1)
            }}
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="all">
                {m.common_all()} ({allCustomers.length})
              </TabsTrigger>
              <TabsTrigger value="vip">
                {m.customers_tab_vip({ count: summary?.vipCount ?? 0 })}
              </TabsTrigger>
              <TabsTrigger value="wholesale">
                {m.customers_tab_wholesale({
                  count: summary?.wholesaleCount ?? 0,
                })}
              </TabsTrigger>
              <TabsTrigger value="debtor">
                {m.customers_tab_debtors({
                  count: allCustomers.filter((c) => c.openDebtAmount > 0).length,
                })}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2.5">
            <div className="relative w-64">
              <IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                placeholder={m.customers_search_placeholder()}
                className="pl-8"
              />
            </div>

            <DataTableExportButton
              title={m.app_customers()}
              filenamePrefix="customers"
              rows={filteredCustomers}
              getRowDate={(c) => c.createdAt}
              columns={visibleFields
                .filter((f) => f.fieldKey !== 'actions')
                .map((field) => ({
                  header: field.label,
                  accessor: (c: (typeof filteredCustomers)[number]) => {
                    if (!field.isSystem) {
                      const cf = (c.customFields ?? {}) as Record<string, unknown>
                      return String(cf[field.fieldKey] ?? '—')
                    }
                    switch (field.fieldKey) {
                      case 'fullName':
                        return c.fullName
                      case 'phone':
                        return c.phone
                      case 'segment':
                        return c.segment === 'vip'
                          ? m.customers_seg_vip()
                          : c.segment === 'wholesale'
                            ? m.customers_seg_wholesale()
                            : m.customers_seg_regular()
                      case 'address':
                        return c.address || '—'
                      case 'ordersCount':
                        return c.ordersCount
                      case 'totalSpent':
                        return formatMoney(c.totalSpent)
                      default:
                        return '—'
                    }
                  },
                }))}
            />

            <Button onClick={() => setCreateOpen(true)}>
              <IconPlus data-icon="inline-start" />
              {m.customers_btn_new()}
            </Button>
          </div>
        </div>

        <Table>
          {paginatedCustomers.length > 0 && (
            <TableHeader>
              <TableRow className="bg-indigo-50/50 hover:bg-indigo-50/50">
                {visibleFields.map((col) => (
                  <TableHead
                    key={col.fieldKey}
                    className={
                      col.fieldKey === 'ordersCount' ||
                      col.fieldKey === 'totalSpent' ||
                      col.fieldKey === 'actions' ||
                      col.fieldType === 'money' ||
                      col.fieldType === 'number'
                        ? 'text-right font-semibold text-indigo-950'
                        : 'font-semibold text-indigo-950'
                    }
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          )}

          <TableBody>
            {paginatedCustomers.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={Math.max(1, visibleFields.length)} className="p-0">
                  <EmptyState
                    title={m.customers_empty_title()}
                    description={m.customers_empty_desc()}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedCustomers.map((c) => (
                <TableRow key={c.id} className="transition-colors hover:bg-indigo-50/40">
                  {visibleFields.map((col) => {
                    if (!col.isSystem) {
                      return (
                        <TableCell
                          key={col.fieldKey}
                          className={
                            col.fieldType === 'money' || col.fieldType === 'number'
                              ? 'text-right'
                              : undefined
                          }
                        >
                          <CustomFieldCell
                            rowId={c.id}
                            field={col}
                            rawValue={
                              (c.customFields as Record<string, unknown> | undefined)?.[
                                col.fieldKey
                              ]
                            }
                            onUpdateCell={updateCell}
                          />
                        </TableCell>
                      )
                    }

                    switch (col.fieldKey) {
                      case 'fullName':
                        return (
                          <TableCell key={col.fieldKey}>
                            <div className="flex flex-col">
                              <span className="text-foreground font-bold">{c.fullName}</span>
                              {c.openDebtAmount > 0 && (
                                <span className="font-mono text-[11px] font-semibold text-rose-600">
                                  {m.customers_debt_prefix()} {formatMoney(c.openDebtAmount)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )
                      case 'phone':
                        return (
                          <TableCell key={col.fieldKey}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono text-xs">
                                  <IconPhone className="size-3.5 text-indigo-600" />
                                  {c.phone}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {m.repairs_customer_phone_tooltip({
                                  phone: c.phone,
                                })}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        )
                      case 'segment':
                        return (
                          <TableCell key={col.fieldKey}>
                            {c.segment === 'vip' ? (
                              <Badge className="border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                {m.customers_seg_vip()}
                              </Badge>
                            ) : c.segment === 'wholesale' ? (
                              <Badge className="border-violet-200 bg-violet-100 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
                                {m.customers_seg_wholesale()}
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              >
                                {m.customers_seg_regular()}
                              </Badge>
                            )}
                          </TableCell>
                        )
                      case 'address':
                        return (
                          <TableCell key={col.fieldKey} className="max-w-[260px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col truncate">
                                  <span className="text-foreground truncate text-xs">
                                    {c.address || m.customers_no_address()}
                                  </span>
                                  {c.notes && (
                                    <span className="text-muted-foreground truncate text-[11px]">
                                      {c.notes}
                                    </span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div>{c.address || m.customers_no_address()}</div>
                                {c.notes && (
                                  <div className="mt-1 opacity-80">
                                    {m.customers_note_prefix()} {c.notes}
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        )
                      case 'ordersCount':
                        return (
                          <TableCell
                            key={col.fieldKey}
                            className="text-right font-mono font-bold tabular-nums"
                          >
                            {m.common_count_pcs({ count: c.ordersCount })}
                          </TableCell>
                        )
                      case 'totalSpent':
                        return (
                          <TableCell
                            key={col.fieldKey}
                            className="text-right font-mono font-bold text-emerald-700 tabular-nums"
                          >
                            {formatMoney(c.totalSpent)}
                          </TableCell>
                        )
                      case 'actions':
                        return (
                          <TableCell key={col.fieldKey} className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-xs">
                                  <IconDotsVertical />
                                  <span className="sr-only">{m.common_actions()}</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem onSelect={() => openEditDialog(c)}>
                                    <IconEdit />
                                    {m.common_edit()}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      updateMutation.mutate({
                                        id: c.id,
                                        segment: c.segment === 'vip' ? 'regular' : 'vip',
                                      })
                                    }
                                  >
                                    <IconCrown />
                                    {c.segment === 'vip'
                                      ? m.customers_action_to_regular()
                                      : m.customers_action_to_vip()}
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => deleteMutation.mutate(c.id)}
                                >
                                  <IconTrash />
                                  {m.common_delete()}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )
                      default:
                        return null
                    }
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredCustomers.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel={m.pagination_customers()}
        />
      </Card>

      {/* DIALOG 1: Yangi mijoz qo'shish */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{m.customers_dialog_new_title()}</DialogTitle>
            <DialogDescription>{m.customers_dialog_new_desc()}</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!fullName.trim() || !phone.trim()) return
              createMutation.mutate()
            }}
            className="flex flex-col gap-3.5"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.repairs_field_customer()}</Label>
                <Input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sanjar Rahimov"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.repairs_field_phone()}</Label>
                <Input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.customers_field_segment()}</Label>
                <Select
                  value={segment}
                  onValueChange={(v) => setSegment(v as 'regular' | 'vip' | 'wholesale')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="regular">{m.customers_seg_regular()}</SelectItem>
                      <SelectItem value="vip">{m.customers_seg_vip()}</SelectItem>
                      <SelectItem value="wholesale">{m.customers_seg_wholesale()}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.customers_field_initial_spent()}</Label>
                <Input
                  type="number"
                  value={totalSpentInput}
                  onChange={(e) => setTotalSpentInput(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{m.customers_field_address()}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Toshkent sh., Yunusobod tumani..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{m.customers_field_notes()}</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Trade-In..."
              />
            </div>

            <CustomFieldsFormSection
              fields={customFields}
              values={newCustomValues}
              onChange={(key, val) => setNewCustomValues((prev) => ({ ...prev, [key]: val }))}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {m.common_cancel()}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !fullName.trim()}>
                <IconCheck data-icon="inline-start" />
                {createMutation.isPending ? m.common_saving() : m.common_save()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Mijozni tahrirlash */}
      <Dialog
        open={editCustomerId !== null}
        onOpenChange={(open) => !open && setEditCustomerId(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{m.customers_dialog_edit_title()}</DialogTitle>
            <DialogDescription>{m.customers_dialog_edit_desc()}</DialogDescription>
          </DialogHeader>

          {editCustomerId !== null && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateMutation.mutate({
                  id: editCustomerId,
                  fullName: editFullName,
                  phone: editPhone,
                  address: editAddress,
                  segment: editSegment,
                  notes: editNotes,
                  totalSpent: Number(editTotalSpent) || 0,
                  customFields: editCustomValues,
                })
              }}
              className="flex flex-col gap-3.5"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">{m.repairs_field_customer()}</Label>
                  <Input
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">{m.repairs_field_phone()}</Label>
                  <Input
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">{m.customers_field_segment()}</Label>
                  <Select
                    value={editSegment}
                    onValueChange={(v) => setEditSegment(v as 'regular' | 'vip' | 'wholesale')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="regular">{m.customers_seg_regular()}</SelectItem>
                        <SelectItem value="vip">{m.customers_seg_vip()}</SelectItem>
                        <SelectItem value="wholesale">{m.customers_seg_wholesale()}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">{m.customers_field_total_spent()}</Label>
                  <Input
                    type="number"
                    value={editTotalSpent}
                    onChange={(e) => setEditTotalSpent(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.customers_field_address()}</Label>
                <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.customers_field_notes()}</Label>
                <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>

              <CustomFieldsFormSection
                fields={customFields}
                values={editCustomValues}
                onChange={(key, val) => setEditCustomValues((prev) => ({ ...prev, [key]: val }))}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditCustomerId(null)}>
                  {m.common_cancel()}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  <IconCheck data-icon="inline-start" />
                  {m.common_save()}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
