import { and, asc, desc, eq, inArray } from 'drizzle-orm'

import { db } from '#/db'
import {
  dataTableFields,
  dataTableRecords,
  dataTableRecordValues,
  dataTables,
  languages,
} from '#/db/schema'

type DbOrTx = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ў: 'o',
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
}

/** Generates a clean Latin snake_case key from any Uzbek/Russian/English name. */
export function generateLatinKey(input: string, fallbackPrefix = 'field'): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/o['`ʻ’]/g, 'o')
    .replace(/g['`ʻ’]/g, 'g')
    .replace(/['`ʻ’"]/g, '')

  let transliterated = ''
  for (const ch of normalized) {
    transliterated += ch in CYRILLIC_TO_LATIN ? CYRILLIC_TO_LATIN[ch] : ch
  }

  const slug = transliterated
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)

  if (!slug || /^[0-9]/.test(slug)) {
    return `${fallbackPrefix}_${slug || 'item'}`
  }
  return slug
}

/** Ensures the generated Latin key is unique within `existingKeys`. */
export function ensureUniqueLatinKey(
  inputName: string,
  existingKeys: Iterable<string>,
  fallbackPrefix = 'field',
): string {
  const base = generateLatinKey(inputName, fallbackPrefix)
  const used = new Set(Array.from(existingKeys, (k) => k.toLowerCase()))
  if (!used.has(base.toLowerCase())) {
    return base
  }
  let counter = 2
  while (used.has(`${base}_${counter}`.toLowerCase())) {
    counter += 1
  }
  return `${base}_${counter}`
}

export async function getDefaultLanguageId(client: DbOrTx = db, code = 'uz-UZ'): Promise<number> {
  const [found] = await client
    .select()
    .from(languages)
    .where(and(eq(languages.code, code), eq(languages.isDeleted, false)))
    .limit(1)
  if (found) return found.id

  const [inserted] = await client
    .insert(languages)
    .values({
      code,
      name: code === 'uz-UZ' ? "O'zbekcha" : code === 'ru-RU' ? 'Русский' : 'English',
      isDefault: code === 'uz-UZ',
      isDeleted: false,
    })
    .returning()
  return inserted!.id
}

export async function ensureDataTableId(
  clientOrKey: DbOrTx | string,
  keyOrClient?: string | DbOrTx,
  isSystem = true,
): Promise<number> {
  const client: DbOrTx =
    typeof clientOrKey === 'string' ? ((keyOrClient as DbOrTx | undefined) ?? db) : clientOrKey
  const tableKey: string = typeof clientOrKey === 'string' ? clientOrKey : (keyOrClient as string)

  const [found] = await client
    .select()
    .from(dataTables)
    .where(and(eq(dataTables.key, tableKey), eq(dataTables.isDeleted, false)))
    .limit(1)
  if (found) return found.id

  const [created] = await client
    .insert(dataTables)
    .values({
      key: tableKey,
      isSystem,
      sortOrder: 0,
      isDeleted: false,
    })
    .returning()
  return created!.id
}

type EavValueType = 'text' | 'number' | 'money' | 'boolean' | 'date' | 'json'

interface FieldSpec<T> {
  type: EavValueType
  default: T
}

function serializeEavCell(val: unknown, type: EavValueType): string {
  if (val === undefined || val === null) return ''
  if (type === 'date') {
    if (val instanceof Date) return val.toISOString()
    return String(val)
  }
  if (type === 'json') {
    return JSON.stringify(val)
  }
  if (type === 'boolean') {
    return val ? 'true' : 'false'
  }
  return String(val)
}

function deserializeEavCell<T>(raw: string | undefined, spec: FieldSpec<T>): T {
  if (raw === undefined) return spec.default
  if (spec.type === 'number' || spec.type === 'money') {
    if (raw === '') return spec.default
    const n = Number(raw)
    return (Number.isNaN(n) ? spec.default : n) as unknown as T
  }
  if (spec.type === 'boolean') {
    if (raw === '') return spec.default
    return (raw === 'true' || raw === '1') as unknown as T
  }
  if (spec.type === 'date') {
    if (!raw) return null as unknown as T
    const d = new Date(raw)
    return (Number.isNaN(d.getTime()) ? null : d) as unknown as T
  }
  if (spec.type === 'json') {
    if (!raw) return spec.default
    try {
      return JSON.parse(raw) as T
    } catch {
      return spec.default
    }
  }
  return raw as unknown as T
}

export function createEavRepository<
  TRow extends {
    id: number
    createdAt: Date
    updatedAt?: Date
    customFields?: Record<string, unknown>
  },
>(
  tableKey: string,
  schemaSpecs: {
    [K in Exclude<keyof TRow, 'id' | 'createdAt' | 'updatedAt' | 'customFields'>]: FieldSpec<
      TRow[K]
    >
  },
  options?: { hasUpdatedAt?: boolean; hasCustomFields?: boolean },
) {
  const hasUpdatedAt = options?.hasUpdatedAt ?? true
  const hasCustomFields = options?.hasCustomFields ?? true

  function hydrateRecord(
    rec: typeof dataTableRecords.$inferSelect,
    cells: Array<typeof dataTableRecordValues.$inferSelect>,
  ): TRow {
    const cellMap = new Map<string, { value: string; type: string }>()
    for (const c of cells) {
      cellMap.set(c.key, { value: c.value, type: c.type })
    }

    const obj: Record<string, unknown> = {
      id: rec.id,
      createdAt: rec.createdAt,
    }
    if (hasUpdatedAt) {
      obj.updatedAt = rec.updatedAt
    }

    const knownKeys = new Set<string>(Object.keys(schemaSpecs))
    for (const [key, spec] of Object.entries(schemaSpecs) as Array<[string, FieldSpec<unknown>]>) {
      const cell = cellMap.get(key)
      obj[key] = deserializeEavCell(cell?.value, spec)
    }

    if (hasCustomFields) {
      const customFields: Record<string, unknown> = {}
      const explicitCustom = cellMap.get('customFields')
      if (explicitCustom?.value) {
        try {
          Object.assign(customFields, JSON.parse(explicitCustom.value))
        } catch {
          // ignore
        }
      }
      for (const [k, cell] of cellMap.entries()) {
        if (!knownKeys.has(k) && k !== 'customFields') {
          if (cell.type === 'number' || cell.type === 'money') {
            customFields[k] = cell.value === '' ? '' : Number(cell.value) || 0
          } else if (cell.type === 'boolean') {
            customFields[k] = cell.value === 'true'
          } else {
            customFields[k] = cell.value
          }
        }
      }
      obj.customFields = customFields
    }

    return obj as TRow
  }

  return {
    async list(client: DbOrTx = db, order: 'asc' | 'desc' = 'desc'): Promise<TRow[]> {
      const [dt] = await client
        .select()
        .from(dataTables)
        .where(and(eq(dataTables.key, tableKey), eq(dataTables.isDeleted, false)))
        .limit(1)
      if (!dt) return []

      const records = await client
        .select()
        .from(dataTableRecords)
        .where(and(eq(dataTableRecords.dataTableId, dt.id), eq(dataTableRecords.isDeleted, false)))
        .orderBy(order === 'desc' ? desc(dataTableRecords.id) : asc(dataTableRecords.id))

      if (records.length === 0) return []

      const recordIds = records.map((r) => r.id)
      const values = await client
        .select()
        .from(dataTableRecordValues)
        .where(
          and(
            inArray(dataTableRecordValues.recordId, recordIds),
            eq(dataTableRecordValues.isDeleted, false),
          ),
        )

      const byRecord = new Map<number, Array<typeof dataTableRecordValues.$inferSelect>>()
      for (const v of values) {
        const list = byRecord.get(v.recordId) ?? []
        list.push(v)
        byRecord.set(v.recordId, list)
      }

      return records.map((r) => hydrateRecord(r, byRecord.get(r.id) ?? []))
    },

    async getById(id: number, client: DbOrTx = db): Promise<TRow | null> {
      const [rec] = await client
        .select()
        .from(dataTableRecords)
        .where(and(eq(dataTableRecords.id, id), eq(dataTableRecords.isDeleted, false)))
        .limit(1)
      if (!rec) return null

      const values = await client
        .select()
        .from(dataTableRecordValues)
        .where(
          and(
            eq(dataTableRecordValues.recordId, rec.id),
            eq(dataTableRecordValues.isDeleted, false),
          ),
        )

      return hydrateRecord(rec, values)
    },

    async findAll(client: DbOrTx = db, order: 'asc' | 'desc' = 'desc'): Promise<TRow[]> {
      return this.list(client, order)
    },

    async findById(id: number, client: DbOrTx = db): Promise<TRow | null> {
      return this.getById(id, client)
    },

    async insert(
      payload: Partial<Omit<TRow, 'id' | 'createdAt' | 'updatedAt'>> & {
        createdAt?: Date
        updatedAt?: Date
      },
      client: DbOrTx = db,
    ): Promise<TRow> {
      const dataTableId = await ensureDataTableId(client, tableKey)
      const fields = await client
        .select()
        .from(dataTableFields)
        .where(
          and(eq(dataTableFields.dataTableId, dataTableId), eq(dataTableFields.isDeleted, false)),
        )
      const fieldIdByKey = new Map(fields.map((f) => [f.key, f.id]))

      const [rec] = await client
        .insert(dataTableRecords)
        .values({
          dataTableId,
          isDeleted: false,
          createdAt: payload.createdAt ?? new Date(),
          updatedAt: payload.updatedAt ?? new Date(),
        })
        .returning()

      const rowsToInsert: Array<typeof dataTableRecordValues.$inferInsert> = []

      for (const [key, spec] of Object.entries(schemaSpecs) as Array<
        [string, FieldSpec<unknown>]
      >) {
        const rawVal = key in payload ? (payload as Record<string, unknown>)[key] : spec.default
        rowsToInsert.push({
          recordId: rec!.id,
          fieldId: fieldIdByKey.get(key) ?? null,
          key,
          value: serializeEavCell(rawVal, spec.type),
          type: spec.type,
          isDeleted: false,
        })
      }

      const customObj = (payload as { customFields?: Record<string, unknown> }).customFields
      if (customObj && typeof customObj === 'object') {
        for (const [cfKey, cfVal] of Object.entries(customObj)) {
          if (cfKey in schemaSpecs) continue
          const fieldDef = fields.find((f) => f.key === cfKey)
          const cfType: EavValueType =
            fieldDef?.type === 'number' || fieldDef?.type === 'money'
              ? (fieldDef.type as EavValueType)
              : fieldDef?.type === 'boolean'
                ? 'boolean'
                : typeof cfVal === 'number'
                  ? 'number'
                  : typeof cfVal === 'boolean'
                    ? 'boolean'
                    : 'text'
          rowsToInsert.push({
            recordId: rec!.id,
            fieldId: fieldDef?.id ?? null,
            key: cfKey,
            value: serializeEavCell(cfVal, cfType),
            type: cfType,
            isDeleted: false,
          })
        }
      }

      const insertedCells =
        rowsToInsert.length > 0
          ? await client.insert(dataTableRecordValues).values(rowsToInsert).returning()
          : []

      return hydrateRecord(rec!, insertedCells)
    },

    async insertMany(
      items: Array<
        Partial<Omit<TRow, 'id' | 'createdAt' | 'updatedAt'>> & {
          createdAt?: Date
          updatedAt?: Date
        }
      >,
      client: DbOrTx = db,
    ): Promise<TRow[]> {
      const results: TRow[] = []
      for (const item of items) {
        results.push(await this.insert(item, client))
      }
      return results
    },

    async update(
      id: number,
      patch: Partial<Omit<TRow, 'id' | 'createdAt'>>,
      client: DbOrTx = db,
    ): Promise<TRow | null> {
      const [rec] = await client
        .select()
        .from(dataTableRecords)
        .where(and(eq(dataTableRecords.id, id), eq(dataTableRecords.isDeleted, false)))
        .limit(1)
      if (!rec) return null

      const now = new Date()
      const [updatedRec] = await client
        .update(dataTableRecords)
        .set({ updatedAt: now })
        .where(eq(dataTableRecords.id, id))
        .returning()

      const fields = await client
        .select()
        .from(dataTableFields)
        .where(
          and(
            eq(dataTableFields.dataTableId, rec.dataTableId),
            eq(dataTableFields.isDeleted, false),
          ),
        )
      const fieldIdByKey = new Map(fields.map((f) => [f.key, f.id]))

      const existingCells = await client
        .select()
        .from(dataTableRecordValues)
        .where(
          and(eq(dataTableRecordValues.recordId, id), eq(dataTableRecordValues.isDeleted, false)),
        )
      const cellByKey = new Map(existingCells.map((c) => [c.key, c]))

      for (const [key, val] of Object.entries(patch)) {
        if (key === 'updatedAt' || key === 'id' || key === 'createdAt') continue
        if (key === 'customFields' && val && typeof val === 'object') {
          for (const [cfKey, cfVal] of Object.entries(val as Record<string, unknown>)) {
            const fieldDef = fields.find((f) => f.key === cfKey)
            const cfType: EavValueType =
              fieldDef?.type === 'number' || fieldDef?.type === 'money'
                ? (fieldDef.type as EavValueType)
                : fieldDef?.type === 'boolean'
                  ? 'boolean'
                  : typeof cfVal === 'number'
                    ? 'number'
                    : typeof cfVal === 'boolean'
                      ? 'boolean'
                      : 'text'
            const serialized = serializeEavCell(cfVal, cfType)
            const existing = cellByKey.get(cfKey)
            if (existing) {
              await client
                .update(dataTableRecordValues)
                .set({
                  fieldId: fieldDef?.id ?? existing.fieldId,
                  value: serialized,
                  type: cfType,
                  updatedAt: now,
                })
                .where(eq(dataTableRecordValues.id, existing.id))
            } else {
              await client.insert(dataTableRecordValues).values({
                recordId: id,
                fieldId: fieldDef?.id ?? null,
                key: cfKey,
                value: serialized,
                type: cfType,
                isDeleted: false,
              })
            }
          }
          continue
        }

        const spec = (schemaSpecs as Record<string, FieldSpec<unknown>>)[key]
        const cellType: EavValueType = spec?.type ?? 'text'
        const serialized = serializeEavCell(val, cellType)
        const existing = cellByKey.get(key)
        if (existing) {
          await client
            .update(dataTableRecordValues)
            .set({
              fieldId: fieldIdByKey.get(key) ?? existing.fieldId,
              value: serialized,
              type: cellType,
              updatedAt: now,
            })
            .where(eq(dataTableRecordValues.id, existing.id))
        } else {
          await client.insert(dataTableRecordValues).values({
            recordId: id,
            fieldId: fieldIdByKey.get(key) ?? null,
            key,
            value: serialized,
            type: cellType,
            isDeleted: false,
          })
        }
      }

      const freshCells = await client
        .select()
        .from(dataTableRecordValues)
        .where(
          and(eq(dataTableRecordValues.recordId, id), eq(dataTableRecordValues.isDeleted, false)),
        )

      return hydrateRecord(updatedRec!, freshCells)
    },

    async delete(id: number, client: DbOrTx = db): Promise<boolean> {
      const now = new Date()
      const deleted = await client
        .update(dataTableRecords)
        .set({ isDeleted: true, updatedAt: now })
        .where(and(eq(dataTableRecords.id, id), eq(dataTableRecords.isDeleted, false)))
        .returning()

      if (deleted.length > 0) {
        await client
          .update(dataTableRecordValues)
          .set({ isDeleted: true, updatedAt: now })
          .where(
            and(eq(dataTableRecordValues.recordId, id), eq(dataTableRecordValues.isDeleted, false)),
          )
      }
      return deleted.length > 0
    },
  }
}

// ============================================================================
// TYPED REPOSITORIES FOR SYSTEM TABLE VIEWS (backed 100% by [key | value | type])
// ============================================================================

export interface PartCategoryRow {
  id: number
  name: string
  sortOrder: number
  createdAt: Date
}

export const partCategoriesRepo = createEavRepository<PartCategoryRow>(
  'part_categories',
  {
    name: { type: 'text', default: '' },
    sortOrder: { type: 'number', default: 0 },
  },
  { hasUpdatedAt: false, hasCustomFields: false },
)

export interface PartRow {
  id: number
  name: string
  categoryId: number
  quantity: number
  costPrice: number
  salePrice: number
  customFields: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export const partsRepo = createEavRepository<PartRow>('parts', {
  name: { type: 'text', default: '' },
  categoryId: { type: 'number', default: 1 },
  quantity: { type: 'number', default: 0 },
  costPrice: { type: 'money', default: 0 },
  salePrice: { type: 'money', default: 0 },
})

export interface PartBatchRow {
  id: number
  supplierId: number | null
  supplierName: string
  totalCost: number
  paidAmount: number
  debtAmount: number
  itemsCount: number
  createdAt: Date
}

export const partBatchesRepo = createEavRepository<PartBatchRow>(
  'part_batches',
  {
    supplierId: { type: 'number', default: null },
    supplierName: { type: 'text', default: '' },
    totalCost: { type: 'money', default: 0 },
    paidAmount: { type: 'money', default: 0 },
    debtAmount: { type: 'money', default: 0 },
    itemsCount: { type: 'number', default: 0 },
  },
  { hasUpdatedAt: false, hasCustomFields: false },
)

export interface PhoneRow {
  id: number
  model: string
  color: string
  imei: string
  condition: string
  batteryHealth: number | null
  boxAndCharger: string
  sourceName: string
  supplierId: number | null
  purchasePrice: number
  extraExpenses: number
  costPrice: number
  salePrice: number
  soldPrice: number | null
  status: string
  isTradeIn: boolean
  customFields: Record<string, unknown>
  createdAt: Date
  soldAt: Date | null
}

export const phonesRepo = createEavRepository<PhoneRow>(
  'phones',
  {
    model: { type: 'text', default: '' },
    color: { type: 'text', default: 'Qora' },
    imei: { type: 'text', default: '' },
    condition: { type: 'text', default: 'new' },
    batteryHealth: { type: 'number', default: 100 },
    boxAndCharger: {
      type: 'text',
      default: 'To`liq (Quti + Quvvatlagich)',
    },
    sourceName: { type: 'text', default: '' },
    supplierId: { type: 'number', default: null },
    purchasePrice: { type: 'money', default: 0 },
    extraExpenses: { type: 'money', default: 0 },
    costPrice: { type: 'money', default: 0 },
    salePrice: { type: 'money', default: 0 },
    soldPrice: { type: 'money', default: null },
    status: { type: 'text', default: 'in_stock' },
    isTradeIn: { type: 'boolean', default: false },
    soldAt: { type: 'date', default: null },
  },
  { hasUpdatedAt: false, hasCustomFields: true },
)

export interface RepairRow {
  id: number
  customerType: string
  customerName: string
  customerPhone: string
  phoneModel: string
  imei: string | null
  issueDescription: string
  promisedAt: Date | null
  lockType: string
  lockCode: string | null
  partId: number | null
  partNameSnapshot: string | null
  partCostSnapshot: number
  partDeducted: boolean
  agreedPrice: number
  advancePayment: number
  finalPaidAmount: number
  status: string
  createdAt: Date
  readyAt: Date | null
  deliveredAt: Date | null
  notifiedDays: number
  customFields: Record<string, unknown>
}

export const repairsRepo = createEavRepository<RepairRow>(
  'repairs',
  {
    customerType: { type: 'text', default: 'regular' },
    customerName: { type: 'text', default: '' },
    customerPhone: { type: 'text', default: '' },
    phoneModel: { type: 'text', default: '' },
    imei: { type: 'text', default: '' },
    issueDescription: { type: 'text', default: '' },
    promisedAt: { type: 'date', default: null },
    lockType: { type: 'text', default: 'text' },
    lockCode: { type: 'text', default: '' },
    partId: { type: 'number', default: null },
    partNameSnapshot: {
      type: 'text',
      default: 'Zapchastsiz / Faqat xizmat',
    },
    partCostSnapshot: { type: 'money', default: 0 },
    partDeducted: { type: 'boolean', default: false },
    agreedPrice: { type: 'money', default: 0 },
    advancePayment: { type: 'money', default: 0 },
    finalPaidAmount: { type: 'money', default: 0 },
    status: { type: 'text', default: 'in_progress' },
    readyAt: { type: 'date', default: null },
    deliveredAt: { type: 'date', default: null },
    notifiedDays: { type: 'number', default: 0 },
  },
  { hasUpdatedAt: false, hasCustomFields: true },
)

export interface DebtRow {
  id: number
  debtType: string
  sourceType: string
  sourceId: number | null
  categoryTag: string
  counterpartyName: string
  counterpartyPhone: string | null
  supplierId: number | null
  description: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  dueDate: Date | null
  status: string
  customFields: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export const debtsRepo = createEavRepository<DebtRow>('debts', {
  debtType: { type: 'text', default: 'customer' },
  sourceType: { type: 'text', default: 'phone_sale' },
  sourceId: { type: 'number', default: null },
  categoryTag: { type: 'text', default: 'general' },
  counterpartyName: { type: 'text', default: '' },
  counterpartyPhone: { type: 'text', default: '' },
  supplierId: { type: 'number', default: null },
  description: { type: 'text', default: '' },
  totalAmount: { type: 'money', default: 0 },
  paidAmount: { type: 'money', default: 0 },
  remainingAmount: { type: 'money', default: 0 },
  dueDate: { type: 'date', default: null },
  status: { type: 'text', default: 'open' },
})

export interface DebtPaymentRow {
  id: number
  debtId: number
  amount: number
  paymentMethod: string
  note: string | null
  paidAt: Date
  createdAt: Date
}

export const debtPaymentsRepo = createEavRepository<DebtPaymentRow>(
  'debt_payments',
  {
    debtId: { type: 'number', default: 0 },
    amount: { type: 'money', default: 0 },
    paymentMethod: { type: 'text', default: 'cash' },
    note: { type: 'text', default: '' },
    paidAt: { type: 'date', default: new Date() },
  },
  { hasUpdatedAt: false, hasCustomFields: false },
)

export interface CustomerRow {
  id: number
  fullName: string
  phone: string
  address: string
  segment: string
  notes: string
  totalSpent: number
  ordersCount: number
  customFields: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export const customersRepo = createEavRepository<CustomerRow>('customers', {
  fullName: { type: 'text', default: '' },
  phone: { type: 'text', default: '' },
  address: { type: 'text', default: '' },
  segment: { type: 'text', default: 'regular' },
  notes: { type: 'text', default: '' },
  totalSpent: { type: 'money', default: 0 },
  ordersCount: { type: 'number', default: 0 },
})

export const EAV_REPOS_BY_KEY = {
  repairs: repairsRepo,
  phones: phonesRepo,
  parts: partsRepo,
  debts: debtsRepo,
  customers: customersRepo,
} as const
