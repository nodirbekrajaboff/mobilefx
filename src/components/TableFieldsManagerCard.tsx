import {
  IconCheck,
  IconColumns3,
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconGripVertical,
  IconPlus,
  IconRefresh,
  IconTablePlus,
  IconTrash,
} from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import { getApi } from '#/lib/api'
import {
  type CustomFieldType,
  getFieldTypeLabel,
  type TableFieldItem,
  useTableFields,
} from '#/lib/table-fields'
import type { ManagedTableKey } from '#/lib/table-schema'
import { cn } from '#/lib/utils'
import * as m from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

const TABLE_META: Array<{
  key: ManagedTableKey
  title: () => string
  subtitle: () => string
}> = [
  {
    key: 'repairs',
    title: () => m.tables_tab_repairs(),
    subtitle: () => m.tables_sub_repairs(),
  },
  {
    key: 'phones',
    title: () => m.tables_tab_phones(),
    subtitle: () => m.tables_sub_phones(),
  },
  {
    key: 'parts',
    title: () => m.tables_tab_parts(),
    subtitle: () => m.tables_sub_parts(),
  },
  {
    key: 'debts',
    title: () => m.tables_tab_debts(),
    subtitle: () => m.tables_sub_debts(),
  },
  {
    key: 'customers',
    title: () => m.tables_tab_customers(),
    subtitle: () => m.tables_sub_customers(),
  },
]

const USER_FIELD_TYPES: Array<Exclude<CustomFieldType, 'system'>> = [
  'text',
  'number',
  'money',
  'date',
  'select',
  'boolean',
]

export function TableFieldsManagerCard({ onNotify }: { onNotify?: (msg: string) => void }) {
  const locale = getLocale()
  const queryClient = useQueryClient()
  const [selectedTable, setSelectedTable] = useState<string>('repairs')
  const { allFields, dataTables } = useTableFields(selectedTable)

  const tableDialogText = useMemo(() => {
    if (locale === 'ru') {
      return {
        btn: '+ Таблица',
        title: 'Создать новую таблицу данных',
        desc: 'Укажите название и краткое описание для новой таблицы.',
        nameLabel: 'Название таблицы *',
        namePlaceholder: 'Например: Склад аксессуаров',
        descLabel: 'Описание (необязательно)',
        descPlaceholder: 'Краткое примечание о таблице...',
      }
    }
    if (locale === 'en') {
      return {
        btn: '+ Table',
        title: 'Create New Data Table',
        desc: 'Enter a name and optional description for the new table.',
        nameLabel: 'Table Name *',
        namePlaceholder: 'e.g. Accessories Inventory',
        descLabel: 'Description (optional)',
        descPlaceholder: 'Short note about this table...',
      }
    }
    return {
      btn: '+ Jadval',
      title: "Yangi ma'lumotlar jadvali yaratish",
      desc: 'Yangi jadval uchun nom va qisqacha tavsif kiriting.',
      nameLabel: 'Jadval nomi *',
      namePlaceholder: 'Masalan: Aksessuarlar ombori',
      descLabel: 'Tavsif (ixtiyoriy)',
      descPlaceholder: 'Jadval haqida qisqacha izoh...',
    }
  }, [locale])

  // Drag & Drop grab state
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  // Create Data Table Dialog state (single name input + optional description, saved in uz-UZ by default)
  const [createTableOpen, setCreateTableOpen] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [newTableDescription, setNewTableDescription] = useState('')

  // Create Field Dialog state (single name input, saved in uz-UZ by default)
  const [createOpen, setCreateOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<Exclude<CustomFieldType, 'system'>>('text')
  const [newOptionsText, setNewOptionsText] = useState('')
  const [newDefaultValue, setNewDefaultValue] = useState('')
  const [newRequired, setNewRequired] = useState(false)

  // Edit Dialog state
  const [editingField, setEditingField] = useState<TableFieldItem | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editType, setEditType] = useState<CustomFieldType>('text')
  const [editOptionsText, setEditOptionsText] = useState('')
  const [editDefaultValue, setEditDefaultValue] = useState('')
  const [editRequired, setEditRequired] = useState(false)

  const invalidateFields = () => {
    void queryClient.invalidateQueries({ queryKey: ['table-fields'] })
  }

  const createDataTableMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await getApi()['table-fields']['data-tables'].post({
        name: newTableName.trim(),
        description: newTableDescription.trim() || undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: (created) => {
      invalidateFields()
      setNewTableName('')
      setNewTableDescription('')
      setCreateTableOpen(false)
      setSelectedTable(created.key)
      onNotify?.(`"${created.name}" — ${m.tables_added_toast()}`)
    },
  })

  const deleteDataTableMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await getApi()
        ['table-fields']['data-tables']({ id: String(id) })
        .delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateFields()
      setSelectedTable('repairs')
      onNotify?.(m.tables_deleted_toast())
    },
  })

  const createFieldMutation = useMutation({
    mutationFn: async () => {
      const options =
        newType === 'select'
          ? newOptionsText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : []
      const { data, error } = await getApi()['table-fields'].post({
        tableKey: selectedTable,
        label: newLabel.trim(),
        fieldType: newType,
        options,
        defaultValue: newDefaultValue.trim(),
        isVisible: true,
        isRequired: newRequired,
      })
      if (error) throw error
      return data
    },
    onSuccess: (created) => {
      invalidateFields()
      setNewLabel('')
      setNewOptionsText('')
      setNewDefaultValue('')
      setNewRequired(false)
      setCreateOpen(false)
      onNotify?.(`"${created.label}" — ${m.tables_added_toast()}`)
    },
  })

  const updateFieldMutation = useMutation({
    mutationFn: async (payload: {
      id: number
      label?: string
      fieldType?: CustomFieldType
      options?: string[]
      defaultValue?: string
      isVisible?: boolean
      isRequired?: boolean
    }) => {
      const { data, error } = await getApi()
        ['table-fields']({ id: String(payload.id) })
        .put({
          label: payload.label,
          fieldType: payload.fieldType,
          options: payload.options,
          defaultValue: payload.defaultValue,
          isVisible: payload.isVisible,
          isRequired: payload.isRequired,
        })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateFields()
      setEditingField(null)
    },
  })

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await getApi()
        ['table-fields']({ id: String(id) })
        .delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateFields()
      onNotify?.(m.tables_deleted_toast())
    },
  })

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const { data, error } = await getApi()['table-fields'].reorder.post({
        tableKey: selectedTable,
        orderedIds,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateFields()
    },
  })

  const resetTableMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await getApi()['table-fields'].reset.post({
        tableKey: selectedTable,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateFields()
      onNotify?.(m.tables_reset_toast())
    },
  })

  const handleDropReorder = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }
    const fromIndex = allFields.findIndex((f) => f.id === draggedId)
    const toIndex = allFields.findIndex((f) => f.id === targetId)
    if (fromIndex < 0 || toIndex < 0) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }
    const next = [...allFields]
    const [moved] = next.splice(fromIndex, 1)
    if (moved) {
      next.splice(toIndex, 0, moved)
      reorderMutation.mutate(next.map((f) => f.id))
    }
    setDraggedId(null)
    setDragOverId(null)
  }

  const startEditing = (field: TableFieldItem) => {
    setEditingField(field)
    setEditLabel(field.label)
    setEditType(field.fieldType === 'system' ? 'text' : field.fieldType)
    setEditOptionsText((field.options || []).join(', '))
    setEditDefaultValue(field.defaultValue || '')
    setEditRequired(field.isRequired)
  }

  const saveEditing = () => {
    if (!editingField || !editLabel.trim()) return
    const options =
      editType === 'select'
        ? editOptionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []

    updateFieldMutation.mutate(
      {
        id: editingField.id,
        label: editLabel.trim(),
        fieldType: editType,
        options,
        defaultValue: editDefaultValue.trim(),
        isRequired: editRequired,
      },
      {
        onSuccess: () => {
          onNotify?.(`"${editLabel.trim()}" — ${m.tables_updated_toast()}`)
        },
      },
    )
  }

  const tableTabs = useMemo(() => {
    if (dataTables.length > 0) {
      return dataTables.map((dt) => ({
        id: dt.id,
        key: dt.key,
        title: dt.name,
        subtitle: dt.description || `/${dt.key} — ${dt.name}`,
        isSystem: dt.isSystem,
      }))
    }
    return TABLE_META.map((item, idx) => ({
      id: -(idx + 1),
      key: item.key,
      title: item.title(),
      subtitle: item.subtitle(),
      isSystem: true,
    }))
  }, [dataTables])

  const activeMeta = tableTabs.find((item) => item.key === selectedTable) ?? tableTabs[0]!
  const visibleCount = allFields.filter((f) => f.isVisible).length
  const customCount = allFields.filter((f) => !f.isSystem).length

  return (
    <>
      <Card className="bg-card border-indigo-200/90 shadow-xs">
        <CardHeader className="border-border/80 dark:via-card flex flex-col gap-3 border-b bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/60 pb-3.5 lg:flex-row lg:items-center lg:justify-between dark:from-indigo-950/30 dark:to-violet-950/20">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-100/80 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              <IconColumns3 className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold">{m.tables_title()}</CardTitle>
              <CardDescription className="text-xs">{m.tables_desc()}</CardDescription>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setCreateTableOpen(true)}
            >
              <IconTablePlus data-icon="inline-start" />
              {tableDialogText.btn}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              disabled={resetTableMutation.isPending}
              onClick={() => resetTableMutation.mutate()}
            >
              <IconRefresh data-icon="inline-start" />
              {m.tables_reset_btn()}
            </Button>

            <Button size="sm" className="whitespace-nowrap" onClick={() => setCreateOpen(true)}>
              <IconPlus data-icon="inline-start" />
              {m.tables_add_btn()}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Tabs
                value={selectedTable}
                onValueChange={(v) => {
                  setSelectedTable(v)
                  setEditingField(null)
                }}
              >
                <TabsList className="bg-muted h-auto min-h-10 flex-wrap justify-start gap-1 p-1">
                  {tableTabs.map((tItem) => (
                    <TabsTrigger key={tItem.key} value={tItem.key} className="h-8 flex-none px-3.5">
                      {tItem.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {!activeMeta.isSystem && activeMeta.id > 0 && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={deleteDataTableMutation.isPending}
                  onClick={() => deleteDataTableMutation.mutate(activeMeta.id)}
                  aria-label={m.delete_action()}
                >
                  <IconTrash className="size-3.5" />
                </Button>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs lg:flex-nowrap">
              <Badge className="border-indigo-200 bg-indigo-50 font-mono text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                {m.tables_total_badge()}: {allFields.length} {m.unit_pcs()}
              </Badge>
              <Badge className="border-emerald-200 bg-emerald-50 font-mono text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {m.tables_active_badge()}: {visibleCount} {m.unit_pcs()}
              </Badge>
              <Badge className="border-violet-200 bg-violet-50 font-mono text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
                {m.tables_dynamic_badge()}: {customCount} {m.unit_pcs()}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {allFields.map((field, index) => {
              const isDragging = draggedId === field.id
              const isDragOver = dragOverId === field.id && draggedId !== field.id

              return (
                <div
                  key={field.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedId(field.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverId !== field.id) setDragOverId(field.id)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleDropReorder(field.id)
                  }}
                  onDragEnd={() => {
                    setDraggedId(null)
                    setDragOverId(null)
                  }}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition select-none',
                    isDragging && 'ring-primary opacity-45 ring-2',
                    isDragOver && 'border-primary ring-primary/40 bg-indigo-50/70 ring-2',
                    !isDragging &&
                      !isDragOver &&
                      (field.isVisible
                        ? 'border-border bg-card hover:border-indigo-300'
                        : 'border-border/70 bg-muted/40 border-dashed opacity-70'),
                  )}
                >
                  {/* Left: Grab Handle + Index + Field info */}
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="text-muted-foreground hover:border-border hover:bg-muted flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg border border-transparent transition active:cursor-grabbing"
                          aria-label={m.tables_grab_tooltip()}
                        >
                          <IconGripVertical className="size-4.5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{m.tables_grab_tooltip()}</TooltipContent>
                    </Tooltip>

                    <span className="text-muted-foreground w-6 text-center font-mono text-[11px] font-bold">
                      #{index + 1}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'truncate text-xs font-bold',
                          !field.isVisible && 'text-muted-foreground line-through',
                        )}
                      >
                        {field.label}
                      </span>

                      {field.fieldType !== 'system' && (
                        <Badge className="border-violet-200 bg-violet-100 text-[10px] font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
                          {getFieldTypeLabel(field.fieldType)}
                        </Badge>
                      )}

                      {field.isRequired && (
                        <Badge className="border-amber-200 bg-amber-100 text-[10px] text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {m.tables_required_badge()}
                        </Badge>
                      )}

                      {field.fieldType === 'select' && field.options.length > 0 && (
                        <span className="text-muted-foreground truncate text-[11px]">
                          ({field.options.join(', ')})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Show/Hide Switch + Direct Edit & Delete + 3-dots DropdownMenu */}
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="mr-1 flex items-center gap-1.5">
                          {field.isVisible ? (
                            <IconEye className="size-3.5 text-emerald-600" />
                          ) : (
                            <IconEyeOff className="text-muted-foreground size-3.5" />
                          )}
                          <Switch
                            size="sm"
                            checked={field.isVisible}
                            onCheckedChange={(checked) =>
                              updateFieldMutation.mutate({
                                id: field.id,
                                isVisible: Boolean(checked),
                              })
                            }
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {field.isVisible ? m.tables_visible_tooltip() : m.tables_hidden_tooltip()}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEditing(field)}
                          aria-label={m.edit()}
                        >
                          <IconEdit className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{m.edit()}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleteFieldMutation.isPending}
                          onClick={() => deleteFieldMutation.mutate(field.id)}
                          aria-label={m.tables_delete_col()}
                        >
                          <IconTrash className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{m.tables_delete_col()}</TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <IconDotsVertical />
                          <span className="sr-only">{m.actions()}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onSelect={() => startEditing(field)}>
                            <IconEdit />
                            {m.edit()}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              updateFieldMutation.mutate({
                                id: field.id,
                                isVisible: !field.isVisible,
                              })
                            }
                          >
                            {field.isVisible ? <IconEyeOff /> : <IconEye />}
                            {field.isVisible ? m.tables_hide_col() : m.tables_show_col()}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => deleteFieldMutation.mutate(field.id)}
                        >
                          <IconTrash />
                          {m.tables_delete_col()}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* DIALOG 0: Yangi ma'lumotlar jadvali qo'shish */}
      <Dialog open={createTableOpen} onOpenChange={setCreateTableOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tableDialogText.title}</DialogTitle>
            <DialogDescription>{tableDialogText.desc}</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!newTableName.trim()) return
              createDataTableMutation.mutate()
            }}
            className="flex flex-col gap-3.5"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{tableDialogText.nameLabel}</Label>
              <Input
                required
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder={tableDialogText.namePlaceholder}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{tableDialogText.descLabel}</Label>
              <Input
                value={newTableDescription}
                onChange={(e) => setNewTableDescription(e.target.value)}
                placeholder={tableDialogText.descPlaceholder}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateTableOpen(false)}>
                {m.cancel()}
              </Button>
              <Button
                type="submit"
                disabled={createDataTableMutation.isPending || !newTableName.trim()}
              >
                <IconPlus data-icon="inline-start" />
                {createDataTableMutation.isPending ? m.adding() : m.save()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 1: Yangi dinamik ustun qo'shish */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{m.tables_create_title()}</DialogTitle>
            <DialogDescription>
              <strong>{activeMeta.title}</strong> — {m.tables_create_desc()}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!newLabel.trim()) return
              createFieldMutation.mutate()
            }}
            className="flex flex-col gap-3.5"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{m.tables_field_label()}</Label>
              <Input
                required
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={m.tables_field_label_placeholder()}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{m.tables_field_type()}</Label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as Exclude<CustomFieldType, 'system'>)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {USER_FIELD_TYPES.map((ft) => (
                      <SelectItem key={ft} value={ft}>
                        {getFieldTypeLabel(ft)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {newType === 'select' && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.tables_field_options()}</Label>
                <Input
                  required
                  value={newOptionsText}
                  onChange={(e) => setNewOptionsText(e.target.value)}
                  placeholder={m.tables_field_options_placeholder()}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{m.tables_field_default()}</Label>
              <Input
                value={newDefaultValue}
                onChange={(e) => setNewDefaultValue(e.target.value)}
                placeholder={
                  newType === 'money' || newType === 'number'
                    ? '0'
                    : newType === 'boolean'
                      ? 'true / false'
                      : m.tables_field_default_placeholder()
                }
              />
            </div>

            <div className="border-border/80 bg-muted/40 flex items-center justify-between rounded-xl border px-3 py-2.5">
              <div className="flex flex-col">
                <span className="text-xs font-semibold">{m.tables_field_required()}</span>
                <span className="text-muted-foreground text-[11px]">
                  {m.tables_field_required_sub()}
                </span>
              </div>
              <Switch checked={newRequired} onCheckedChange={(c) => setNewRequired(Boolean(c))} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {m.cancel()}
              </Button>
              <Button type="submit" disabled={createFieldMutation.isPending || !newLabel.trim()}>
                <IconPlus data-icon="inline-start" />
                {createFieldMutation.isPending ? m.adding() : m.tables_add_btn()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Ustunni tahrirlash (barcha ustunlar, jumladan joriy/tizim ustunlari uchun) */}
      <Dialog open={Boolean(editingField)} onOpenChange={(open) => !open && setEditingField(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{m.tables_edit_title()}</DialogTitle>
            <DialogDescription>{m.tables_edit_desc()}</DialogDescription>
          </DialogHeader>

          {editingField && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveEditing()
              }}
              className="flex flex-col gap-3.5"
            >
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.tables_field_label()}</Label>
                <Input required value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.tables_field_type()}</Label>
                <Select value={editType} onValueChange={(v) => setEditType(v as CustomFieldType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {USER_FIELD_TYPES.map((ft) => (
                        <SelectItem key={ft} value={ft}>
                          {getFieldTypeLabel(ft)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {editType === 'select' && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">{m.tables_field_options()}</Label>
                  <Input
                    value={editOptionsText}
                    onChange={(e) => setEditOptionsText(e.target.value)}
                    placeholder={m.tables_field_options_placeholder()}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{m.tables_field_default()}</Label>
                <Input
                  value={editDefaultValue}
                  onChange={(e) => setEditDefaultValue(e.target.value)}
                  placeholder={m.tables_field_default_placeholder()}
                />
              </div>

              <div className="border-border/80 bg-muted/40 flex items-center justify-between rounded-xl border px-3 py-2.5">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">{m.tables_field_required()}</span>
                  <span className="text-muted-foreground text-[11px]">
                    {m.tables_field_required_sub()}
                  </span>
                </div>
                <Switch
                  checked={editRequired}
                  onCheckedChange={(c) => setEditRequired(Boolean(c))}
                />
              </div>

              <DialogFooter className="flex-row items-center justify-between sm:justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleteFieldMutation.isPending}
                  onClick={() => {
                    const idToDelete = editingField.id
                    setEditingField(null)
                    deleteFieldMutation.mutate(idToDelete)
                  }}
                >
                  <IconTrash data-icon="inline-start" />
                  {m.delete_action()}
                </Button>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditingField(null)}>
                    {m.cancel()}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateFieldMutation.isPending || !editLabel.trim()}
                  >
                    <IconCheck data-icon="inline-start" />
                    {m.save()}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
