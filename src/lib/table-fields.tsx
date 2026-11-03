import { IconCheck, IconEdit, IconPlus } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { DatePicker } from '#/components/ui/date-picker'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { getApi } from '#/lib/api'
import { useCurrency } from '#/lib/currency'
import { DEFAULT_SYSTEM_TABLE_FIELDS, type ManagedTableKey } from '#/lib/table-schema'
import * as m from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

const SYSTEM_COL_TRANSLATIONS: Record<string, { uz: string; ru: string; en: string }> = {
  'repairs:id': { uz: '№', ru: '№', en: '#' },
  'repairs:customerName': { uz: 'Mijoz', ru: 'Клиент', en: 'Customer' },
  'repairs:phoneModel': { uz: 'Model', ru: 'Модель', en: 'Model' },
  'repairs:issueDescription': { uz: 'Nosozlik', ru: 'Неисправность', en: 'Issue' },
  'repairs:partNameSnapshot': { uz: 'Ehtiyot qism', ru: 'Запчасть', en: 'Spare Part' },
  'repairs:agreedPrice': { uz: 'Narx', ru: 'Цена', en: 'Price' },
  'repairs:status': { uz: 'Holati', ru: 'Статус', en: 'Status' },
  'repairs:createdAt': { uz: 'Sana', ru: 'Дата', en: 'Date' },

  'phones:model': { uz: 'Model va Xotira', ru: 'Модель и Память', en: 'Model & Storage' },
  'phones:color': { uz: 'Rangi', ru: 'Цвет', en: 'Color' },
  'phones:imei': { uz: 'IMEI', ru: 'IMEI', en: 'IMEI' },
  'phones:condition': { uz: 'Holati', ru: 'Состояние', en: 'Condition' },
  'phones:boxAndCharger': {
    uz: 'Quti / Quvvatlagich',
    ru: 'Коробка / Зарядка',
    en: 'Box / Charger',
  },
  'phones:sourceName': { uz: 'Qabul manbasi', ru: 'Источник', en: 'Source' },
  'phones:costPrice': { uz: 'Tannarxi', ru: 'Себестоимость', en: 'Cost Price' },
  'phones:salePrice': { uz: 'Sotuv narxi', ru: 'Цена продажи', en: 'Sale Price' },
  'phones:status': { uz: 'Holat', ru: 'Статус', en: 'Status' },

  'parts:name': { uz: 'Ehtiyot qism nomi', ru: 'Название запчасти', en: 'Part Name' },
  'parts:categoryName': { uz: 'Toifa', ru: 'Категория', en: 'Category' },
  'parts:quantity': { uz: 'Qoldiq', ru: 'Остаток', en: 'Stock' },
  'parts:costPrice': { uz: 'Tannarxi (1 dona)', ru: 'Себестоимость (1 шт)', en: 'Unit Cost' },
  'parts:salePrice': {
    uz: 'Sotuv narxi (1 dona)',
    ru: 'Цена продажи (1 шт)',
    en: 'Unit Sale Price',
  },
  'parts:totalSaleValue': {
    uz: 'Jami summa (Qoldiq × Sotuv)',
    ru: 'Общая сумма (Остаток × Цена)',
    en: 'Total Value (Stock × Price)',
  },
  'parts:actions': { uz: 'Amal', ru: 'Действие', en: 'Action' },

  'debts:counterpartyName': {
    uz: "Mijoz / Ta'minotchi",
    ru: 'Клиент / Поставщик',
    en: 'Customer / Supplier',
  },
  'debts:description': {
    uz: 'Manba va tavsif',
    ru: 'Источник и описание',
    en: 'Source & Description',
  },
  'debts:totalAmount': { uz: 'Jami summa', ru: 'Общая сумма', en: 'Total Amount' },
  'debts:paidAmount': { uz: "To'langan", ru: 'Оплачено', en: 'Paid' },
  'debts:remainingAmount': { uz: 'Qoldiq', ru: 'Остаток', en: 'Remaining' },
  'debts:dueDate': { uz: "To'lov muddati", ru: 'Срок оплаты', en: 'Due Date' },
  'debts:actions': { uz: "To'lov amali", ru: 'Действие', en: 'Action' },

  'customers:fullName': { uz: 'Mijoz F.I.Sh', ru: 'Ф.И.О клиента', en: 'Customer Name' },
  'customers:phone': { uz: 'Telefon raqami', ru: 'Номер телефона', en: 'Phone Number' },
  'customers:segment': { uz: 'Toifasi', ru: 'Категория', en: 'Segment' },
  'customers:address': { uz: 'Manzil va izoh', ru: 'Адрес и примечание', en: 'Address & Notes' },
  'customers:ordersCount': { uz: 'Murojaatlar soni', ru: 'Кол-во обращений', en: 'Orders Count' },
  'customers:totalSpent': {
    uz: 'Jami xarid aylanmasi',
    ru: 'Общий оборот покупок',
    en: 'Total Spent',
  },
  'customers:actions': { uz: 'Amal', ru: 'Действие', en: 'Action' },
}

export function localeToLangCode(loc: string): 'uz-UZ' | 'ru-RU' | 'en-US' {
  if (loc === 'ru' || loc === 'ru-RU') return 'ru-RU'
  if (loc === 'en' || loc === 'en-US') return 'en-US'
  return 'uz-UZ'
}

export function resolveFieldLabel(
  tableKey: string,
  fieldKey: string,
  rawLabel: string,
  translations?: Record<string, { name: string; description: string }>,
): string {
  const loc = getLocale()
  const langCode = localeToLangCode(loc)
  if (translations?.[langCode]?.name) {
    return translations[langCode].name
  }
  const entry = SYSTEM_COL_TRANSLATIONS[`${tableKey}:${fieldKey}`]
  if (entry) {
    if (rawLabel === entry.uz || rawLabel === entry.ru || rawLabel === entry.en) {
      return entry[loc] ?? rawLabel
    }
  }
  return translations?.['uz-UZ']?.name || rawLabel
}

export type CustomFieldType = 'system' | 'text' | 'number' | 'money' | 'date' | 'select' | 'boolean'

export interface DataTableItem {
  id: number
  key: string
  name: string
  description: string
  isSystem: boolean
  sortOrder: number
  translations?: Record<string, { name: string; description: string }>
}

export interface TableFieldItem {
  id: number
  tableKey: string
  fieldKey: string
  label: string
  fieldType: CustomFieldType
  options: string[]
  defaultValue: string
  isSystem: boolean
  isVisible: boolean
  isRequired: boolean
  sortOrder: number
}

export function getFieldTypeLabel(type: CustomFieldType): string {
  switch (type) {
    case 'system':
      return m.field_type_system()
    case 'text':
      return m.field_type_text()
    case 'number':
      return m.field_type_number()
    case 'money':
      return m.field_type_money()
    case 'date':
      return m.field_type_date()
    case 'select':
      return m.field_type_select()
    case 'boolean':
      return m.field_type_boolean()
    default:
      return type
  }
}

export const FIELD_TYPE_LABELS: Record<Exclude<CustomFieldType, 'system'>, string> = {
  text: 'Matn',
  number: 'Raqam',
  money: 'Summa / Valyuta',
  date: 'Sana',
  select: "Tanlov ro'yxati",
  boolean: "Ha / Yo'q",
}

export function useTableFields(tableKey: string) {
  const queryClient = useQueryClient()
  const { isFeatureLocked } = useCurrency()
  const isDynamicLocked = isFeatureLocked('dynamic_fields')

  const query = useQuery({
    queryKey: ['table-fields'],
    queryFn: async () => {
      const { data, error } = await getApi()['table-fields'].get()
      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })

  const dataTables: DataTableItem[] = useMemo(() => {
    const loc = localeToLangCode(getLocale())
    const internalKeys = new Set(['part_categories', 'part_batches', 'debt_payments'])
    const remoteTables = query.data?.dataTables
    if (remoteTables && remoteTables.length > 0) {
      return remoteTables
        .filter((dt) => !internalKeys.has(dt.key))
        .map((dt) => {
          const trans = dt.translations?.[loc] || dt.translations?.['uz-UZ']
          return {
            id: dt.id,
            key: dt.key,
            name: trans?.name || dt.name || dt.key,
            description: trans?.description ?? dt.description ?? '',
            isSystem: dt.isSystem,
            sortOrder: dt.sortOrder,
            translations: dt.translations,
          }
        })
    }
    return []
  }, [query.data])

  const allFields: TableFieldItem[] = useMemo(() => {
    const remote = query.data?.byTable?.[tableKey]
    if (remote !== undefined) {
      return remote.map((f) => ({
        id: f.id,
        tableKey: f.tableKey,
        fieldKey: f.fieldKey,
        label: resolveFieldLabel(f.tableKey, f.fieldKey, f.label, f.translations),
        fieldType: (f.fieldType as CustomFieldType) || 'text',
        options: Array.isArray(f.options) ? f.options : [],
        defaultValue: f.defaultValue || '',
        isSystem: f.isSystem,
        isVisible: f.isVisible,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder,
      }))
    }

    const fallback = DEFAULT_SYSTEM_TABLE_FIELDS[tableKey as ManagedTableKey] || []
    return fallback.map((def, idx) => ({
      id: -(idx + 1),
      tableKey,
      fieldKey: def.fieldKey,
      label: resolveFieldLabel(tableKey, def.fieldKey, def.label),
      fieldType: 'system',
      options: [],
      defaultValue: '',
      isSystem: true,
      isVisible: true,
      isRequired: false,
      sortOrder: def.sortOrder,
    }))
  }, [query.data, tableKey])

  const visibleFields = useMemo(
    () => allFields.filter((f) => f.isVisible && (!isDynamicLocked || f.isSystem)),
    [allFields, isDynamicLocked],
  )

  const customFields = useMemo(
    () => (isDynamicLocked ? [] : allFields.filter((f) => !f.isSystem)),
    [allFields, isDynamicLocked],
  )

  const updateCellMutation = useMutation({
    mutationFn: async (payload: { rowId: number; fieldKey: string; value: unknown }) => {
      const { data, error } = await getApi()['table-fields'].cell.patch({
        tableKey,
        rowId: payload.rowId,
        fieldKey: payload.fieldKey,
        value: payload.value,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [tableKey] })
    },
  })

  return {
    dataTables,
    languages: query.data?.languages ?? [],
    allFields,
    visibleFields,
    customFields,
    isLoading: query.isLoading,
    updateCell: updateCellMutation.mutate,
    isUpdatingCell: updateCellMutation.isPending,
  }
}

export function buildDefaultCustomFields(customFields: TableFieldItem[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of customFields) {
    if (field.defaultValue !== '') {
      if (field.fieldType === 'number' || field.fieldType === 'money') {
        result[field.fieldKey] = Number(field.defaultValue) || 0
      } else if (field.fieldType === 'boolean') {
        result[field.fieldKey] =
          field.defaultValue === 'true' || field.defaultValue.toLowerCase() === 'ha'
      } else {
        result[field.fieldKey] = field.defaultValue
      }
    } else if (field.fieldType === 'boolean') {
      result[field.fieldKey] = false
    } else if (field.fieldType === 'select' && field.options[0]) {
      result[field.fieldKey] = field.options[0]
    } else {
      result[field.fieldKey] = ''
    }
  }
  return result
}

export function CustomFieldCell({
  field,
  rowId,
  rawValue,
  onUpdateCell,
}: {
  field: TableFieldItem
  rowId: number
  rawValue: unknown
  onUpdateCell: (payload: { rowId: number; fieldKey: string; value: unknown }) => void
}) {
  const { formatMoney } = useCurrency()
  const [open, setOpen] = useState(false)

  const effectiveVal =
    rawValue !== undefined && rawValue !== null && rawValue !== ''
      ? rawValue
      : field.defaultValue || ''

  const [draft, setDraft] = useState<string>(String(effectiveVal ?? ''))

  if (field.fieldType === 'boolean') {
    const checked =
      rawValue === true || rawValue === 'true' || String(rawValue).toLowerCase() === 'ha'
    return (
      <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={checked}
          onCheckedChange={(next) =>
            onUpdateCell({
              rowId,
              fieldKey: field.fieldKey,
              value: Boolean(next),
            })
          }
        />
        <Badge
          variant="outline"
          className={
            checked
              ? 'cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'cursor-pointer border-slate-200 bg-slate-50 text-slate-500'
          }
          onClick={() =>
            onUpdateCell({
              rowId,
              fieldKey: field.fieldKey,
              value: !checked,
            })
          }
        >
          {checked ? m.yes() : m.no()}
        </Badge>
      </div>
    )
  }

  if (field.fieldType === 'select') {
    const strVal = String(effectiveVal || '')
    return (
      <div onClick={(e) => e.stopPropagation()} className="inline-block">
        <Select
          value={strVal}
          onValueChange={(next) =>
            onUpdateCell({
              rowId,
              fieldKey: field.fieldKey,
              value: next,
            })
          }
        >
          <SelectTrigger className="h-7 min-w-[110px] border-indigo-200/80 bg-indigo-50/50 px-2.5 text-xs font-medium text-indigo-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <SelectValue placeholder={m.select_placeholder()} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {field.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    )
  }

  const displayNode = () => {
    if (effectiveVal === '' || effectiveVal === null || effectiveVal === undefined) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-400 group-hover:text-indigo-600">
          <IconPlus className="size-3" />
          {m.enter_value()}
        </span>
      )
    }
    if (field.fieldType === 'money') {
      return (
        <span className="font-mono text-xs font-semibold text-indigo-700 tabular-nums dark:text-indigo-300">
          {formatMoney(Number(effectiveVal) || 0)}
        </span>
      )
    }
    if (field.fieldType === 'number') {
      return (
        <span className="font-mono text-xs font-semibold text-slate-800 tabular-nums dark:text-slate-200">
          {Number(effectiveVal).toLocaleString('ru-RU')}
        </span>
      )
    }
    if (field.fieldType === 'date') {
      const d = new Date(String(effectiveVal))
      const formatted = !Number.isNaN(d.getTime())
        ? d.toLocaleDateString('uz-UZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : String(effectiveVal)
      return (
        <Badge
          variant="outline"
          className="font-mono text-[11px] text-slate-700 dark:text-slate-300"
        >
          {formatted}
        </Badge>
      )
    }
    return (
      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
        {String(effectiveVal)}
      </span>
    )
  }

  const handleSave = () => {
    let parsed: unknown = draft.trim()
    if (field.fieldType === 'number' || field.fieldType === 'money') {
      parsed = draft.trim() === '' ? 0 : Number(draft) || 0
    }
    onUpdateCell({
      rowId,
      fieldKey: field.fieldKey,
      value: parsed,
    })
    setOpen(false)
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="inline-block">
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setDraft(String(effectiveVal ?? ''))
          }
          setOpen(nextOpen)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="group inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          >
            {displayNode()}
            <IconEdit className="size-3 text-slate-400 opacity-0 transition group-hover:opacity-100" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-3" align="start">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold">{field.label}</Label>
            {field.fieldType === 'date' ? (
              <DatePicker
                value={draft}
                onChange={(val) => {
                  setDraft(val)
                  onUpdateCell({
                    rowId,
                    fieldKey: field.fieldKey,
                    value: val,
                  })
                  setOpen(false)
                }}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  type={
                    field.fieldType === 'number' || field.fieldType === 'money' ? 'number' : 'text'
                  }
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSave()
                    }
                  }}
                  placeholder={field.label}
                  className="h-8 text-xs"
                />
                <Button size="icon-xs" onClick={handleSave}>
                  <IconCheck />
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function CustomFieldsFormSection({
  fields,
  values,
  onChange,
  className,
}: {
  fields: TableFieldItem[]
  values: Record<string, unknown>
  onChange: (fieldKey: string, value: unknown) => void
  className?: string
}) {
  if (fields.length === 0) return null

  return (
    <div
      className={
        className ??
        'grid grid-cols-1 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-800/40'
      }
    >
      {fields.map((field) => {
        const rawVal = values[field.fieldKey] ?? field.defaultValue ?? ''

        if (field.fieldType === 'boolean') {
          const checked =
            rawVal === true || rawVal === 'true' || String(rawVal).toLowerCase() === 'ha'
          return (
            <div
              key={field.fieldKey}
              className="border-border bg-background flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <Label className="text-xs font-medium">
                {field.label}
                {field.isRequired ? ' *' : ''}
              </Label>
              <Checkbox
                checked={checked}
                onCheckedChange={(next) => onChange(field.fieldKey, Boolean(next))}
              />
            </div>
          )
        }

        if (field.fieldType === 'select') {
          return (
            <div key={field.fieldKey} className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">
                {field.label}
                {field.isRequired ? ' *' : ''}
              </Label>
              <Select
                value={String(rawVal || field.options[0] || '')}
                onValueChange={(val) => onChange(field.fieldKey, val)}
              >
                <SelectTrigger className="bg-background w-full">
                  <SelectValue placeholder={m.select_placeholder()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )
        }

        if (field.fieldType === 'date') {
          return (
            <div key={field.fieldKey} className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">
                {field.label}
                {field.isRequired ? ' *' : ''}
              </Label>
              <DatePicker
                value={String(rawVal || '')}
                onChange={(val) => onChange(field.fieldKey, val)}
              />
            </div>
          )
        }

        return (
          <div key={field.fieldKey} className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground text-xs">
              {field.label}
              {field.isRequired ? ' *' : ''}
            </Label>
            <Input
              type={field.fieldType === 'number' || field.fieldType === 'money' ? 'number' : 'text'}
              value={String(rawVal ?? '')}
              onChange={(e) =>
                onChange(
                  field.fieldKey,
                  field.fieldType === 'number' || field.fieldType === 'money'
                    ? e.target.value === ''
                      ? ''
                      : Number(e.target.value)
                    : e.target.value,
                )
              }
              placeholder={field.defaultValue || field.label}
              className="bg-background"
            />
          </div>
        )
      })}
    </div>
  )
}
