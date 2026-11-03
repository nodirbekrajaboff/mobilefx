import { and, count, eq, sql } from 'drizzle-orm'

import { db } from '#/db'
import {
  customersRepo,
  debtPaymentsRepo,
  debtsRepo,
  partBatchesRepo,
  partCategoriesRepo,
  partsRepo,
  phonesRepo,
  repairsRepo,
} from '#/db/eav'
import {
  dataTableFields,
  dataTableFieldTranslations,
  dataTables,
  dataTableTranslations,
  languages,
  posSales,
  storeSettings,
  suppliers,
  user,
} from '#/db/schema'
import { auth } from '#/lib/auth'
import { DEFAULT_SYSTEM_TABLE_FIELDS, type ManagedTableKey } from '#/lib/table-schema'

export { DEFAULT_SYSTEM_TABLE_FIELDS, type ManagedTableKey }

const SEED_LANGUAGES = [
  { code: 'uz-UZ', name: "O'zbekcha", isDefault: true },
  { code: 'ru-RU', name: 'Русский', isDefault: false },
  { code: 'en-US', name: 'English', isDefault: false },
] as const

const SEED_DATA_TABLES: Array<{
  key: ManagedTableKey
  sortOrder: number
  translations: Record<'uz-UZ' | 'ru-RU' | 'en-US', { name: string; description: string }>
}> = [
  {
    key: 'repairs',
    sortOrder: 1,
    translations: {
      'uz-UZ': {
        name: "Ustaxona (Ta'mirlash)",
        description: '/repairs — Buyurtmalar va ustaxona jadvali ustunlari',
      },
      'ru-RU': {
        name: 'Мастерская (Ремонт)',
        description: '/repairs — Колонки таблицы заказов и мастерской',
      },
      'en-US': {
        name: 'Workshop (Repairs)',
        description: '/repairs — Repair orders and workshop table columns',
      },
    },
  },
  {
    key: 'phones',
    sortOrder: 2,
    translations: {
      'uz-UZ': {
        name: 'Telefonlar ombori',
        description: '/phones — Telefonlar va kapital jadvali ustunlari',
      },
      'ru-RU': {
        name: 'Склад телефонов',
        description: '/phones — Колонки таблицы телефонов и капитала',
      },
      'en-US': {
        name: 'Phones Inventory',
        description: '/phones — Phones inventory and capital table columns',
      },
    },
  },
  {
    key: 'parts',
    sortOrder: 3,
    translations: {
      'uz-UZ': {
        name: 'Ehtiyot qismlar',
        description: '/parts — Ehtiyot qismlar ombori jadvali ustunlari',
      },
      'ru-RU': {
        name: 'Запчасти и детали',
        description: '/parts — Колонки таблицы склада запчастей',
      },
      'en-US': {
        name: 'Spare Parts',
        description: '/parts — Spare parts inventory table columns',
      },
    },
  },
  {
    key: 'debts',
    sortOrder: 4,
    translations: {
      'uz-UZ': {
        name: 'Qarz daftari',
        description: "/debts — Mijozlar va ta'minotchilar qarzi jadvali ustunlari",
      },
      'ru-RU': {
        name: 'Долговая книга',
        description: '/debts — Колонки таблицы долгов клиентов и поставщиков',
      },
      'en-US': {
        name: 'Debt Ledger',
        description: '/debts — Customer and supplier debts table columns',
      },
    },
  },
  {
    key: 'customers',
    sortOrder: 5,
    translations: {
      'uz-UZ': {
        name: 'Mijozlar bazasi',
        description: '/customers — Doimiy, VIP va ulgurji mijozlar jadvali ustunlari',
      },
      'ru-RU': {
        name: 'База клиентов',
        description: '/customers — Колонки таблицы постоянных, VIP и оптовых клиентов',
      },
      'en-US': {
        name: 'Customers Database',
        description: '/customers — Regular, VIP and wholesale customers table',
      },
    },
  },
]

const SEED_FIELD_TRANSLATIONS: Record<string, Record<'uz-UZ' | 'ru-RU' | 'en-US', string>> = {
  'repairs:id': { 'uz-UZ': '№', 'ru-RU': '№', 'en-US': '#' },
  'repairs:customerName': {
    'uz-UZ': 'Mijoz',
    'ru-RU': 'Клиент',
    'en-US': 'Customer',
  },
  'repairs:phoneModel': {
    'uz-UZ': 'Model',
    'ru-RU': 'Модель',
    'en-US': 'Model',
  },
  'repairs:issueDescription': {
    'uz-UZ': 'Nosozlik',
    'ru-RU': 'Неисправность',
    'en-US': 'Issue',
  },
  'repairs:partNameSnapshot': {
    'uz-UZ': 'Ehtiyot qism',
    'ru-RU': 'Запчасть',
    'en-US': 'Spare Part',
  },
  'repairs:agreedPrice': {
    'uz-UZ': 'Narx',
    'ru-RU': 'Цена',
    'en-US': 'Price',
  },
  'repairs:status': {
    'uz-UZ': 'Holati',
    'ru-RU': 'Статус',
    'en-US': 'Status',
  },
  'repairs:createdAt': {
    'uz-UZ': 'Sana',
    'ru-RU': 'Дата',
    'en-US': 'Date',
  },

  'phones:model': {
    'uz-UZ': 'Model va Xotira',
    'ru-RU': 'Модель и Память',
    'en-US': 'Model & Storage',
  },
  'phones:color': { 'uz-UZ': 'Rangi', 'ru-RU': 'Цвет', 'en-US': 'Color' },
  'phones:imei': { 'uz-UZ': 'IMEI', 'ru-RU': 'IMEI', 'en-US': 'IMEI' },
  'phones:condition': {
    'uz-UZ': 'Holati',
    'ru-RU': 'Состояние',
    'en-US': 'Condition',
  },
  'phones:boxAndCharger': {
    'uz-UZ': 'Quti / Quvvatlagich',
    'ru-RU': 'Коробка / Зарядка',
    'en-US': 'Box / Charger',
  },
  'phones:sourceName': {
    'uz-UZ': 'Qabul manbasi',
    'ru-RU': 'Источник',
    'en-US': 'Source',
  },
  'phones:costPrice': {
    'uz-UZ': 'Tannarxi',
    'ru-RU': 'Себестоимость',
    'en-US': 'Cost Price',
  },
  'phones:salePrice': {
    'uz-UZ': 'Sotuv narxi',
    'ru-RU': 'Цена продажи',
    'en-US': 'Sale Price',
  },
  'phones:status': {
    'uz-UZ': 'Holat',
    'ru-RU': 'Статус',
    'en-US': 'Status',
  },

  'parts:name': {
    'uz-UZ': 'Ehtiyot qism nomi',
    'ru-RU': 'Название запчасти',
    'en-US': 'Part Name',
  },
  'parts:categoryName': {
    'uz-UZ': 'Toifa',
    'ru-RU': 'Категория',
    'en-US': 'Category',
  },
  'parts:quantity': {
    'uz-UZ': 'Qoldiq',
    'ru-RU': 'Остаток',
    'en-US': 'Stock',
  },
  'parts:costPrice': {
    'uz-UZ': 'Tannarxi (1 dona)',
    'ru-RU': 'Себестоимость (1 шт)',
    'en-US': 'Unit Cost',
  },
  'parts:salePrice': {
    'uz-UZ': 'Sotuv narxi (1 dona)',
    'ru-RU': 'Цена продажи (1 шт)',
    'en-US': 'Unit Sale Price',
  },
  'parts:totalSaleValue': {
    'uz-UZ': 'Jami summa (Qoldiq × Sotuv)',
    'ru-RU': 'Общая сумма (Остаток × Цена)',
    'en-US': 'Total Value (Stock × Price)',
  },
  'parts:actions': {
    'uz-UZ': 'Amal',
    'ru-RU': 'Действие',
    'en-US': 'Action',
  },

  'debts:counterpartyName': {
    'uz-UZ': "Mijoz / Ta'minotchi",
    'ru-RU': 'Клиент / Поставщик',
    'en-US': 'Customer / Supplier',
  },
  'debts:description': {
    'uz-UZ': 'Manba va tavsif',
    'ru-RU': 'Источник и описание',
    'en-US': 'Source & Description',
  },
  'debts:totalAmount': {
    'uz-UZ': 'Jami summa',
    'ru-RU': 'Общая сумма',
    'en-US': 'Total Amount',
  },
  'debts:paidAmount': {
    'uz-UZ': "To'langan",
    'ru-RU': 'Оплачено',
    'en-US': 'Paid',
  },
  'debts:remainingAmount': {
    'uz-UZ': 'Qoldiq',
    'ru-RU': 'Остаток',
    'en-US': 'Remaining',
  },
  'debts:dueDate': {
    'uz-UZ': "To'lov muddati",
    'ru-RU': 'Срок оплаты',
    'en-US': 'Due Date',
  },
  'debts:actions': {
    'uz-UZ': "To'lov amali",
    'ru-RU': 'Действие',
    'en-US': 'Action',
  },

  'customers:fullName': {
    'uz-UZ': 'Mijoz F.I.Sh',
    'ru-RU': 'Ф.И.О клиента',
    'en-US': 'Customer Name',
  },
  'customers:phone': {
    'uz-UZ': 'Telefon raqami',
    'ru-RU': 'Номер телефона',
    'en-US': 'Phone Number',
  },
  'customers:segment': {
    'uz-UZ': 'Toifasi',
    'ru-RU': 'Категория',
    'en-US': 'Segment',
  },
  'customers:address': {
    'uz-UZ': 'Manzil va izoh',
    'ru-RU': 'Адрес и примечание',
    'en-US': 'Address & Notes',
  },
  'customers:ordersCount': {
    'uz-UZ': 'Murojaatlar soni',
    'ru-RU': 'Кол-во обращений',
    'en-US': 'Orders Count',
  },
  'customers:totalSpent': {
    'uz-UZ': 'Jami xarid aylanmasi',
    'ru-RU': 'Общий оборот покупок',
    'en-US': 'Total Spent',
  },
  'customers:actions': {
    'uz-UZ': 'Amal',
    'ru-RU': 'Действие',
    'en-US': 'Action',
  },
}

let seedPromise: Promise<void> | null = null

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise
  seedPromise = runSeed().catch((err) => {
    console.error('Seed error:', err)
    seedPromise = null
  })
  return seedPromise
}

async function runSeed(): Promise<void> {
  // 0. Drop legacy table-view tables and ensure all relational + EAV + translation tables exist
  await db.execute(sql`
    DROP TABLE IF EXISTS
      table_field_definitions,
      debt_payments,
      debts,
      repairs,
      phones,
      part_batches,
      parts,
      part_categories,
      customers
    CASCADE;
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT false,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "session" (
      id TEXT PRIMARY KEY,
      expires_at TIMESTAMP NOT NULL,
      token TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      device_name TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      platform TEXT,
      screen_resolution TEXT,
      timezone TEXT,
      language TEXT,
      last_active_at TIMESTAMP DEFAULT NOW(),
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "account" (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at TIMESTAMP,
      refresh_token_expires_at TIMESTAMP,
      scope TEXT,
      password TEXT,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "verification" (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      id SERIAL PRIMARY KEY,
      store_name TEXT NOT NULL DEFAULT 'Mobile Fix',
      store_phone TEXT NOT NULL DEFAULT '+998 90 123 45 67',
      store_address TEXT NOT NULL DEFAULT 'Toshkent sh., Malika savdo majmuasi, B-blok',
      cbu_rate INTEGER NOT NULL DEFAULT 12800,
      internal_rate INTEGER NOT NULL DEFAULT 12820,
      default_currency TEXT NOT NULL DEFAULT 'UZS',
      telegram_chat_id TEXT DEFAULT '',
      daily_report_time TEXT NOT NULL DEFAULT '21:00',
      printer_paper_width TEXT NOT NULL DEFAULT '58mm',
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      type TEXT NOT NULL DEFAULT 'general',
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pos_sales (
      id SERIAL PRIMARY KEY,
      sale_type TEXT NOT NULL,
      phone_id INTEGER,
      trade_in_phone_id INTEGER,
      trade_in_model TEXT,
      trade_in_imei TEXT,
      trade_in_accepted_price BIGINT NOT NULL DEFAULT 0,
      part_id INTEGER,
      item_title TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      customer_name TEXT DEFAULT 'Chakana mijoz',
      customer_phone TEXT DEFAULT '',
      total_amount BIGINT NOT NULL DEFAULT 0,
      payable_amount BIGINT NOT NULL DEFAULT 0,
      cost_amount BIGINT NOT NULL DEFAULT 0,
      profit_amount BIGINT NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      cash_paid BIGINT NOT NULL DEFAULT 0,
      card_paid BIGINT NOT NULL DEFAULT 0,
      credit_amount BIGINT NOT NULL DEFAULT 0,
      warranty_months INTEGER NOT NULL DEFAULT 1,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  await db.execute(sql`
    ALTER TABLE "session"
      ADD COLUMN IF NOT EXISTS device_name TEXT,
      ADD COLUMN IF NOT EXISTS device_type TEXT,
      ADD COLUMN IF NOT EXISTS browser TEXT,
      ADD COLUMN IF NOT EXISTS os TEXT,
      ADD COLUMN IF NOT EXISTS platform TEXT,
      ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
      ADD COLUMN IF NOT EXISTS timezone TEXT,
      ADD COLUMN IF NOT EXISTS language TEXT,
      ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT NOW();
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS login_session_devices (
      id SERIAL PRIMARY KEY,
      session_token TEXT NOT NULL,
      user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
      user_login TEXT NOT NULL,
      ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
      user_agent TEXT NOT NULL DEFAULT '',
      device_name TEXT NOT NULL DEFAULT 'Desktop',
      device_type TEXT NOT NULL DEFAULT 'desktop',
      browser TEXT NOT NULL DEFAULT 'Unknown',
      os TEXT NOT NULL DEFAULT 'Unknown',
      platform TEXT DEFAULT '',
      screen_resolution TEXT DEFAULT '',
      timezone TEXT DEFAULT '',
      language TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
      logged_out_at TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS languages (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT false,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_tables (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL,
      is_system BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_table_translations (
      id SERIAL PRIMARY KEY,
      data_table_id INTEGER NOT NULL REFERENCES data_tables(id) ON DELETE CASCADE,
      language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_table_fields (
      id SERIAL PRIMARY KEY,
      data_table_id INTEGER NOT NULL REFERENCES data_tables(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'text',
      options_json TEXT NOT NULL DEFAULT '[]',
      is_system BOOLEAN NOT NULL DEFAULT false,
      is_visible BOOLEAN NOT NULL DEFAULT true,
      is_required BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_table_field_translations (
      id SERIAL PRIMARY KEY,
      field_id INTEGER NOT NULL REFERENCES data_table_fields(id) ON DELETE CASCADE,
      language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_table_records (
      id SERIAL PRIMARY KEY,
      data_table_id INTEGER NOT NULL REFERENCES data_tables(id) ON DELETE CASCADE,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_table_record_values (
      id SERIAL PRIMARY KEY,
      record_id INTEGER NOT NULL REFERENCES data_table_records(id) ON DELETE CASCADE,
      field_id INTEGER REFERENCES data_table_fields(id) ON DELETE SET NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'text',
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  // Ensure is_deleted column exists on all tables for soft-delete preservation
  await db.execute(sql`
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "session" ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "account" ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE login_session_devices ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE languages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE data_tables ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE data_table_translations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE data_table_fields ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE data_table_field_translations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE data_table_records ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE data_table_record_values ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
  `)

  // Drop unconditional UNIQUE constraints and replace with partial unique indexes (WHERE is_deleted = false)
  await db.execute(sql`
    ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_email_key;
    ALTER TABLE "session" DROP CONSTRAINT IF EXISTS session_token_key;
    ALTER TABLE login_session_devices DROP CONSTRAINT IF EXISTS login_session_devices_session_token_key;
    ALTER TABLE languages DROP CONSTRAINT IF EXISTS languages_code_key;
    ALTER TABLE data_tables DROP CONSTRAINT IF EXISTS data_tables_key_key;
  `)

  // Soft-delete any older duplicate active rows before creating partial unique indexes
  await db.execute(sql`
    UPDATE data_table_fields a
    SET is_deleted = true
    FROM data_table_fields b
    WHERE a.is_deleted = false AND b.is_deleted = false
      AND a.data_table_id = b.data_table_id
      AND a.key = b.key
      AND a.id < b.id;

    UPDATE data_table_translations a
    SET is_deleted = true
    FROM data_table_translations b
    WHERE a.is_deleted = false AND b.is_deleted = false
      AND a.data_table_id = b.data_table_id
      AND a.language_id = b.language_id
      AND a.id < b.id;

    UPDATE data_table_field_translations a
    SET is_deleted = true
    FROM data_table_field_translations b
    WHERE a.is_deleted = false AND b.is_deleted = false
      AND a.field_id = b.field_id
      AND a.language_id = b.language_id
      AND a.id < b.id;

    UPDATE data_table_record_values a
    SET is_deleted = true
    FROM data_table_record_values b
    WHERE a.is_deleted = false AND b.is_deleted = false
      AND a.record_id = b.record_id
      AND a.key = b.key
      AND a.id < b.id;
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS user_email_active_idx
      ON "user" (email) WHERE is_deleted = false;
    CREATE UNIQUE INDEX IF NOT EXISTS session_token_active_idx
      ON "session" (token) WHERE is_deleted = false;
    CREATE UNIQUE INDEX IF NOT EXISTS login_session_devices_token_active_idx
      ON login_session_devices (session_token) WHERE is_deleted = false;
    CREATE UNIQUE INDEX IF NOT EXISTS languages_code_active_idx
      ON languages (code) WHERE is_deleted = false;
    CREATE UNIQUE INDEX IF NOT EXISTS data_tables_key_active_idx
      ON data_tables (key) WHERE is_deleted = false;
    CREATE UNIQUE INDEX IF NOT EXISTS data_table_translations_active_idx
      ON data_table_translations (data_table_id, language_id) WHERE is_deleted = false;
    CREATE UNIQUE INDEX IF NOT EXISTS data_table_fields_table_key_active_idx
      ON data_table_fields (data_table_id, key) WHERE is_deleted = false;
    CREATE UNIQUE INDEX IF NOT EXISTS data_table_field_translations_active_idx
      ON data_table_field_translations (field_id, language_id) WHERE is_deleted = false;
    CREATE UNIQUE INDEX IF NOT EXISTS data_table_record_values_record_key_active_idx
      ON data_table_record_values (record_id, key) WHERE is_deleted = false;
  `)

  // 1. Seed languages: uz-UZ, ru-RU, en-US
  const existingLangs = await db.select().from(languages).where(eq(languages.isDeleted, false))
  const langIdByCode = new Map<string, number>(existingLangs.map((l) => [l.code, l.id]))

  for (const lang of SEED_LANGUAGES) {
    if (!langIdByCode.has(lang.code)) {
      const [inserted] = await db
        .insert(languages)
        .values({
          code: lang.code,
          name: lang.name,
          isDefault: lang.isDefault,
          isDeleted: false,
        })
        .returning()
      langIdByCode.set(lang.code, inserted!.id)
    }
  }

  // 2. Seed Data Tables & Data Table Translations + System Fields & Field Translations
  const existingDataTables = await db
    .select()
    .from(dataTables)
    .where(eq(dataTables.isDeleted, false))
  const dataTableByKey = new Map(existingDataTables.map((t) => [t.key, t]))

  for (const dtSpec of SEED_DATA_TABLES) {
    let dt = dataTableByKey.get(dtSpec.key)
    if (!dt) {
      const [insertedDt] = await db
        .insert(dataTables)
        .values({
          key: dtSpec.key,
          isSystem: true,
          sortOrder: dtSpec.sortOrder,
          isDeleted: false,
        })
        .returning()
      dt = insertedDt!
      dataTableByKey.set(dt.key, dt)
    }

    const existingTranslations = await db
      .select()
      .from(dataTableTranslations)
      .where(
        and(
          eq(dataTableTranslations.dataTableId, dt.id),
          eq(dataTableTranslations.isDeleted, false),
        ),
      )

    if (existingTranslations.length === 0) {
      for (const [langCode, tr] of Object.entries(dtSpec.translations) as Array<
        ['uz-UZ' | 'ru-RU' | 'en-US', { name: string; description: string }]
      >) {
        const langId = langIdByCode.get(langCode)
        if (!langId) continue
        await db.insert(dataTableTranslations).values({
          dataTableId: dt.id,
          languageId: langId,
          name: tr.name,
          description: tr.description,
        })
      }
    }

    // Seed system fields for this data_table
    const existingFields = await db
      .select()
      .from(dataTableFields)
      .where(eq(dataTableFields.dataTableId, dt.id))

    if (existingFields.length === 0) {
      const defaultCols = DEFAULT_SYSTEM_TABLE_FIELDS[dtSpec.key]
      for (const def of defaultCols) {
        const [insertedField] = await db
          .insert(dataTableFields)
          .values({
            dataTableId: dt.id,
            key: def.fieldKey,
            value: '',
            type: 'system',
            optionsJson: '[]',
            isSystem: true,
            isVisible: true,
            isRequired: false,
            sortOrder: def.sortOrder,
          })
          .returning()

        const trMap = SEED_FIELD_TRANSLATIONS[`${dtSpec.key}:${def.fieldKey}`] ?? {
          'uz-UZ': def.label,
          'ru-RU': def.label,
          'en-US': def.label,
        }

        for (const [langCode, name] of Object.entries(trMap) as Array<
          ['uz-UZ' | 'ru-RU' | 'en-US', string]
        >) {
          const langId = langIdByCode.get(langCode)
          if (!langId) continue
          await db.insert(dataTableFieldTranslations).values({
            fieldId: insertedField!.id,
            languageId: langId,
            name,
            description: null,
          })
        }
      }
    }
  }

  // 3. Seed default customers into [key | value | type] EAV records
  const defaultCustomersSeed = [
    {
      fullName: 'Sanjar Rahimov',
      phone: '+998 90 111 22 33',
      address: 'Toshkent sh., Yunusobod tumani, 12-mavze',
      segment: 'vip' as const,
      notes: 'Doimiy iPhone xaridorimiz, Trade-In orqali yangilaydi',
      totalSpent: 28500000,
      ordersCount: 4,
    },
    {
      fullName: 'Bekzod Tursunov',
      phone: '+998 97 444 55 66',
      address: 'Toshkent sh., Chilonzor tumani, Qatortol ko`chasi',
      segment: 'regular' as const,
      notes: 'Samsung ekran ta`mirlash va g`ilof xaridi',
      totalSpent: 4102400,
      ordersCount: 2,
    },
    {
      fullName: 'Dilnoza Karimova',
      phone: '+998 93 333 44 55',
      address: 'Toshkent sh., Mirzo Ulug`bek tumani, Parkent ko`chasi',
      segment: 'vip' as const,
      notes: 'Oila a`zolari uchun telefon va ehtiyot qism oladi',
      totalSpent: 19450000,
      ordersCount: 3,
    },
    {
      fullName: 'Shoxrux Olimov',
      phone: '+998 99 888 77 66',
      address: 'Toshkent vil., Zangiota tumani',
      segment: 'regular' as const,
      notes: 'Batareya almashtirish xizmati',
      totalSpent: 487160,
      ordersCount: 1,
    },
    {
      fullName: 'Mirzohid Usta (Hamkor servis)',
      phone: '+998 94 600 70 80',
      address: 'Malika savdo majmuasi, A-blok, 28-do`kon',
      segment: 'wholesale' as const,
      notes: 'Ulgurji ekran va batareya oluvchi usta',
      totalSpent: 42800000,
      ordersCount: 9,
    },
    {
      fullName: 'Javohir Abdullayev (VIP Korporativ)',
      phone: '+998 90 950 10 20',
      address: 'Toshkent sh., Shayxontohur tumani, Tashkent City',
      segment: 'vip' as const,
      notes: 'Kompaniya xodimlari uchun 5 ta iPhone va Samsung xarid qilgan',
      totalSpent: 64200000,
      ordersCount: 6,
    },
    {
      fullName: 'Usta Otabek (Chorsu Servis)',
      phone: '+998 98 300 40 50',
      address: 'Toshkent sh., Chorsu bozori, Texnika qatori',
      segment: 'wholesale' as const,
      notes: 'Har hafta OLED ekranlar va Type-C portlar oladi',
      totalSpent: 31900000,
      ordersCount: 11,
    },
    {
      fullName: 'Madina Saidova',
      phone: '+998 91 165 77 88',
      address: 'Toshkent sh., Yakkasaroy tumani, Shota Rustaveli ko`chasi',
      segment: 'vip' as const,
      notes: 'iPhone 15 Pro Max va original MagSafe aksessuarlar xaridori',
      totalSpent: 17850000,
      ordersCount: 3,
    },
    {
      fullName: 'Usta Davron (Sergeli filiali)',
      phone: '+998 93 512 90 09',
      address: 'Toshkent sh., Sergeli-5 mavzesi',
      segment: 'wholesale' as const,
      notes: 'Mikrosxema, shleyf va batareyalar bo`yicha doimiy hamkor',
      totalSpent: 24600000,
      ordersCount: 8,
    },
    {
      fullName: 'Kamoliddin Yo`ldoshev',
      phone: '+998 97 717 33 22',
      address: 'Toshkent sh., Olmazor tumani, Beruniy ko`chasi',
      segment: 'regular' as const,
      notes: 'Redmi Note 13 Pro xarid qilgan (Karta + Naqd)',
      totalSpent: 3890000,
      ordersCount: 2,
    },
    {
      fullName: 'Nigora Usmonova',
      phone: '+998 90 321 65 43',
      address: 'Toshkent sh., Mirobod tumani, Oybek metro yaqinida',
      segment: 'regular' as const,
      notes: 'Orqa oyna lazer almashtirish va g`ilof xaridi',
      totalSpent: 950000,
      ordersCount: 2,
    },
    {
      fullName: 'Sardorbek Alimov',
      phone: '+998 99 800 55 44',
      address: 'Toshkent sh., Uchtepa tumani, Farhod bozori yaqinida',
      segment: 'regular' as const,
      notes: 'Nasiya asosida telefon xarid qilgan mijoz',
      totalSpent: 12400000,
      ordersCount: 2,
    },
  ]

  const existingCustomers = await customersRepo.list()
  if (existingCustomers.length < 8) {
    const existingPhonesSet = new Set(existingCustomers.map((c) => c.phone))
    const missingCustomers = defaultCustomersSeed.filter((c) => !existingPhonesSet.has(c.phone))
    if (missingCustomers.length > 0) {
      await customersRepo.insertMany(missingCustomers)
    }
  }

  // 4. Ensure Store Settings
  const [settingsCount] = await db.select({ value: count() }).from(storeSettings)
  if (!settingsCount || settingsCount.value === 0) {
    await db.insert(storeSettings).values({
      storeName: 'Mobile Fix',
      storePhone: '+998 90 123 45 67',
      storeAddress: 'Toshkent sh., Malika savdo majmuasi, B-blok, 14-do`kon',
      cbuRate: 12800,
      internalRate: 12820,
      defaultCurrency: 'UZS',
      telegramChatId: process.env.ADMIN_CHAT_ID || '',
      dailyReportTime: '21:00',
      printerPaperWidth: '58mm',
    })
  }

  // 5. Ensure Default Admin User via Better Auth
  const existingAdmin = await db
    .select()
    .from(user)
    .where(eq(user.email, 'admin@mobilefix.uz'))
    .limit(1)

  if (existingAdmin.length === 0) {
    try {
      await auth.api.signUpEmail({
        body: {
          email: 'admin@mobilefix.uz',
          password: 'password123',
          name: 'Sardor Usta (Mobile Fix)',
        },
      })
    } catch {
      // Ignore if already created concurrently
    }
  }

  // 6. Seed Part Categories, Parts, Phones, Repairs, POS Sales, and Debts into EAV
  const existingCategories = await partCategoriesRepo.list()
  if (existingCategories.length < 7) {
    await db.transaction(async (tx) => {
      const categorySpecs = [
        { name: '📱 Ekranlar', sortOrder: 1 },
        { name: '🔋 Batareyalar', sortOrder: 2 },
        { name: '🔌 Quvvat portlari', sortOrder: 3 },
        { name: '📷 Kameralar', sortOrder: 4 },
        { name: '🪞 Orqa oyna va korpuslar', sortOrder: 5 },
        { name: '🔬 Mikrosxema va Shleyflar', sortOrder: 6 },
        { name: '🎧 Aksessuar va Himoya oynalar', sortOrder: 7 },
      ]

      const currentCats = await partCategoriesRepo.list(tx)
      const catByName = new Map(currentCats.map((c) => [c.name, c]))
      const missingCats = categorySpecs.filter((c) => !catByName.has(c.name))
      if (missingCats.length > 0) {
        const newlyInserted = await partCategoriesRepo.insertMany(missingCats, tx)
        for (const c of newlyInserted) {
          catByName.set(c.name, c)
        }
      }

      const screenCat = catByName.get('📱 Ekranlar')!
      const batteryCat = catByName.get('🔋 Batareyalar')!
      const portCat = catByName.get('🔌 Quvvat portlari')!
      const cameraCat = catByName.get('📷 Kameralar')!
      const housingCat = catByName.get('🪞 Orqa oyna va korpuslar')!
      const icCat = catByName.get('🔬 Mikrosxema va Shleyflar')!
      const accCat = catByName.get('🎧 Aksessuar va Himoya oynalar')!

      // Suppliers
      const supplierSpecs = [
        {
          name: 'Malika Ehtiyot Qismlar Markazi (Jamshid)',
          phone: '+998 97 700 11 22',
          type: 'part',
        },
        {
          name: 'Dubay Mobile Import (Otabek)',
          phone: '+998 99 888 33 44',
          type: 'phone',
        },
        {
          name: 'Abu Saxiy Ekran Markazi (Dilshod)',
          phone: '+998 90 911 55 66',
          type: 'part',
        },
        {
          name: 'Shenzhen Cargo Express (Azamat)',
          phone: '+998 93 180 22 44',
          type: 'part',
        },
        {
          name: 'Malika B-Blok Ulgurji Telefonlar (Sardor)',
          phone: '+998 94 650 88 99',
          type: 'phone',
        },
      ]

      const existingSuppliers = await tx.select().from(suppliers)
      const supplierByName = new Map(existingSuppliers.map((s) => [s.name, s]))
      const missingSuppliers = supplierSpecs.filter((s) => !supplierByName.has(s.name))
      if (missingSuppliers.length > 0) {
        const insertedSup = await tx.insert(suppliers).values(missingSuppliers).returning()
        for (const s of insertedSup) {
          supplierByName.set(s.name, s)
        }
      }

      const partSupplier = supplierByName.get('Malika Ehtiyot Qismlar Markazi (Jamshid)')!
      const phoneSupplier = supplierByName.get('Dubay Mobile Import (Otabek)')!
      const screenSupplier = supplierByName.get('Abu Saxiy Ekran Markazi (Dilshod)')!
      const shenzhenSupplier = supplierByName.get('Shenzhen Cargo Express (Azamat)')!
      const malikaPhoneSupplier = supplierByName.get('Malika B-Blok Ulgurji Telefonlar (Sardor)')!

      // Parts Inventory (18 diverse parts across all 7 categories)
      const partSpecs = [
        {
          name: 'iPhone 13 Pro Original OLED Ekran',
          categoryId: screenCat.id,
          quantity: 8,
          costPrice: 1282000,
          salePrice: 1666600,
        },
        {
          name: 'iPhone 15 Pro Max Original OLED Ekran (120Hz)',
          categoryId: screenCat.id,
          quantity: 4,
          costPrice: 2850000,
          salePrice: 3450000,
        },
        {
          name: 'Samsung S23 Ultra Amoled Service Pack',
          categoryId: screenCat.id,
          quantity: 4,
          costPrice: 2307600,
          salePrice: 2820400,
        },
        {
          name: 'Samsung A54 / A34 Super AMOLED Ekran (Rama bilan)',
          categoryId: screenCat.id,
          quantity: 9,
          costPrice: 680000,
          salePrice: 920000,
        },
        {
          name: 'Redmi Note 12 / 13 Incell Ekran',
          categoryId: screenCat.id,
          quantity: 15,
          costPrice: 230000,
          salePrice: 380000,
        },
        {
          name: 'iPhone 11 / XR GX Hard OLED Ekran',
          categoryId: screenCat.id,
          quantity: 11,
          costPrice: 340000,
          salePrice: 550000,
        },
        {
          name: 'iPhone 12 / 12 Pro Kuchaytirilgan Batareya (Hoco)',
          categoryId: batteryCat.id,
          quantity: 18,
          costPrice: 150000,
          salePrice: 280000,
        },
        {
          name: 'iPhone 14 Pro Max Original Batareya (100% チP bilan)',
          categoryId: batteryCat.id,
          quantity: 10,
          costPrice: 260000,
          salePrice: 450000,
        },
        {
          name: 'Samsung S22 / S23 Original Batareya (EB-BS901)',
          categoryId: batteryCat.id,
          quantity: 7,
          costPrice: 190000,
          salePrice: 320000,
        },
        {
          name: 'Redmi Note 11 / 12 BN5D Batareya',
          categoryId: batteryCat.id,
          quantity: 14,
          costPrice: 95000,
          salePrice: 180000,
        },
        {
          name: 'Samsung A54 Type-C Quvvat platasi (Original)',
          categoryId: portCat.id,
          quantity: 22,
          costPrice: 65000,
          salePrice: 150000,
        },
        {
          name: 'iPhone 13 / 13 Pro Quvvat shleyfi (Original mikrofon bilan)',
          categoryId: portCat.id,
          quantity: 12,
          costPrice: 140000,
          salePrice: 280000,
        },
        {
          name: 'iPhone 13 Pro Asosiy 3x Kamera moduli',
          categoryId: cameraCat.id,
          quantity: 5,
          costPrice: 641000,
          salePrice: 950000,
        },
        {
          name: 'iPhone 14 Pro / 14 Pro Max 48MP Kamera moduli',
          categoryId: cameraCat.id,
          quantity: 2,
          costPrice: 920000,
          salePrice: 1350000,
        },
        {
          name: 'iPhone 14 Pro Max Orqa oyna (Deep Purple / MagSafe)',
          categoryId: housingCat.id,
          quantity: 8,
          costPrice: 120000,
          salePrice: 350000,
        },
        {
          name: 'iPhone 15 Pro Natural Titanium Korpus (To`liq original)',
          categoryId: housingCat.id,
          quantity: 2,
          costPrice: 1150000,
          salePrice: 1650000,
        },
        {
          name: 'iPhone FaceID Dot Projector & TrueTone TagOn Shleyf',
          categoryId: icCat.id,
          quantity: 16,
          costPrice: 110000,
          salePrice: 250000,
        },
        {
          name: 'Apple 20W USB-C Original Adapter + MagSafe G`ilof to`plami',
          categoryId: accCat.id,
          quantity: 25,
          costPrice: 185000,
          salePrice: 320000,
        },
      ]

      const currentParts = await partsRepo.list(tx)
      const partByName = new Map(currentParts.map((p) => [p.name, p]))
      const missingParts = partSpecs.filter((p) => !partByName.has(p.name))
      if (missingParts.length > 0) {
        const newlyInsertedParts = await partsRepo.insertMany(missingParts, tx)
        for (const p of newlyInsertedParts) {
          partByName.set(p.name, p)
        }
      }
      const allSeededParts = await partsRepo.list(tx)

      // Part Batches
      const existingBatches = await partBatchesRepo.list(tx)
      if (existingBatches.length < 3) {
        await partBatchesRepo.insert(
          {
            supplierId: partSupplier.id,
            supplierName: partSupplier.name,
            totalCost: 18500000,
            paidAmount: 12000000,
            debtAmount: 6500000,
            itemsCount: 8,
          },
          tx,
        )
        await partBatchesRepo.insert(
          {
            supplierId: screenSupplier.id,
            supplierName: screenSupplier.name,
            totalCost: 14200000,
            paidAmount: 14200000,
            debtAmount: 0,
            itemsCount: 6,
          },
          tx,
        )
        await partBatchesRepo.insert(
          {
            supplierId: shenzhenSupplier.id,
            supplierName: shenzhenSupplier.name,
            totalCost: 9800000,
            paidAmount: 6000000,
            debtAmount: 3800000,
            itemsCount: 4,
          },
          tx,
        )
      }

      // Phones Inventory (13 diverse phones across New, Used, Trade-In, In Stock & Sold)
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000

      const phoneSpecs = [
        {
          model: 'iPhone 16 Pro Max 256GB',
          color: 'Desert Titanium',
          imei: '358901223410988',
          condition: 'new' as const,
          batteryHealth: 100,
          boxAndCharger: 'To`liq (Yangi muhrlangan quti)',
          sourceName: phoneSupplier.name,
          supplierId: phoneSupplier.id,
          purchasePrice: 16950000,
          extraExpenses: 0,
          costPrice: 16950000,
          salePrice: 18200000,
          status: 'in_stock' as const,
          isTradeIn: false,
        },
        {
          model: 'iPhone 15 Pro Max 256GB',
          color: 'Natural Titanium',
          imei: '354891124509811',
          condition: 'new' as const,
          batteryHealth: 100,
          boxAndCharger: 'To`liq (Quti + Kabel)',
          sourceName: phoneSupplier.name,
          supplierId: phoneSupplier.id,
          purchasePrice: 14743000,
          extraExpenses: 0,
          costPrice: 14743000,
          salePrice: 15640400,
          status: 'in_stock' as const,
          isTradeIn: false,
        },
        {
          model: 'iPhone 15 Pro 128GB',
          color: 'Blue Titanium',
          imei: '356612098745112',
          condition: 'used' as const,
          batteryHealth: 94,
          boxAndCharger: 'To`liq (Quti + Original kabel)',
          sourceName: 'Sanjar Rahimov (Trade-In mijoz)',
          purchasePrice: 10900000,
          extraExpenses: 150000,
          costPrice: 11050000,
          salePrice: 12150000,
          status: 'in_stock' as const,
          isTradeIn: true,
        },
        {
          model: 'iPhone 14 Pro 128GB',
          color: 'Deep Purple',
          imei: '359201448102344',
          condition: 'used' as const,
          batteryHealth: 89,
          boxAndCharger: 'Faqat Quti',
          sourceName: 'Rustam (Trade-In mijoz)',
          purchasePrice: 8974000,
          extraExpenses: 256400,
          costPrice: 9230400,
          salePrice: 10256000,
          status: 'in_stock' as const,
          isTradeIn: true,
        },
        {
          model: 'Samsung Galaxy S24 Ultra 256GB',
          color: 'Titanium Gray',
          imei: '357712098841209',
          condition: 'new' as const,
          batteryHealth: 100,
          boxAndCharger: 'To`liq (Quti + Kabel)',
          sourceName: phoneSupplier.name,
          supplierId: phoneSupplier.id,
          purchasePrice: 12820000,
          extraExpenses: 0,
          costPrice: 12820000,
          salePrice: 13845600,
          status: 'in_stock' as const,
          isTradeIn: false,
        },
        {
          model: 'Samsung Galaxy S23 Ultra 256GB',
          color: 'Phantom Black',
          imei: '352499108823411',
          condition: 'used' as const,
          batteryHealth: 92,
          boxAndCharger: 'To`liq (Quti + 45W Adapter)',
          sourceName: malikaPhoneSupplier.name,
          supplierId: malikaPhoneSupplier.id,
          purchasePrice: 9400000,
          extraExpenses: 100000,
          costPrice: 9500000,
          salePrice: 10650000,
          status: 'in_stock' as const,
          isTradeIn: false,
        },
        {
          model: 'iPhone 13 128GB',
          color: 'Midnight (Qora)',
          imei: '351129803349182',
          condition: 'used' as const,
          batteryHealth: 86,
          boxAndCharger: 'To`liq (Quti + Quvvatlagich)',
          sourceName: 'Alisher (Xaridordan qabul qilindi)',
          purchasePrice: 5512600,
          extraExpenses: 128200,
          costPrice: 5640800,
          salePrice: 6410000,
          status: 'in_stock' as const,
          isTradeIn: false,
        },
        {
          model: 'Samsung Galaxy A55 5G 8/256GB',
          color: 'Awesome Iceblue',
          imei: '354188092311765',
          condition: 'new' as const,
          batteryHealth: 100,
          boxAndCharger: 'To`liq (Quti + Kabel)',
          sourceName: malikaPhoneSupplier.name,
          supplierId: malikaPhoneSupplier.id,
          purchasePrice: 4150000,
          extraExpenses: 0,
          costPrice: 4150000,
          salePrice: 4680000,
          status: 'in_stock' as const,
          isTradeIn: false,
        },
        {
          model: 'Xiaomi 14 12/512GB (Leica)',
          color: 'Jade Green',
          imei: '867721094451908',
          condition: 'new' as const,
          batteryHealth: 100,
          boxAndCharger: 'To`liq (Quti + 90W HyperCharge)',
          sourceName: malikaPhoneSupplier.name,
          supplierId: malikaPhoneSupplier.id,
          purchasePrice: 8200000,
          extraExpenses: 0,
          costPrice: 8200000,
          salePrice: 9150000,
          status: 'in_stock' as const,
          isTradeIn: false,
        },
        {
          model: 'Honor X9b 5G 12/256GB',
          color: 'Sunrise Orange',
          imei: '863309128874102',
          condition: 'used' as const,
          batteryHealth: 95,
          boxAndCharger: 'To`liq (Quti + 35W blok)',
          sourceName: 'Jasur (Trade-In mijoz)',
          purchasePrice: 2650000,
          extraExpenses: 0,
          costPrice: 2650000,
          salePrice: 3250000,
          status: 'in_stock' as const,
          isTradeIn: true,
        },
        {
          model: 'Redmi Note 13 Pro 8/256GB',
          color: 'Forest Green',
          imei: '864411092238175',
          condition: 'new' as const,
          batteryHealth: 100,
          boxAndCharger: 'To`liq (Quti + 67W blok)',
          sourceName: phoneSupplier.name,
          supplierId: phoneSupplier.id,
          purchasePrice: 3076800,
          extraExpenses: 0,
          costPrice: 3076800,
          salePrice: 3589600,
          soldPrice: 3589600,
          status: 'sold' as const,
          isTradeIn: false,
          soldAt: new Date(now - 2 * 60 * 60 * 1000),
        },
        {
          model: 'iPhone 14 Pro Max 256GB',
          color: 'Space Black',
          imei: '359812004519283',
          condition: 'used' as const,
          batteryHealth: 91,
          boxAndCharger: 'To`liq (Quti + Kabel)',
          sourceName: phoneSupplier.name,
          supplierId: phoneSupplier.id,
          purchasePrice: 10800000,
          extraExpenses: 0,
          costPrice: 10800000,
          salePrice: 11950000,
          soldPrice: 11950000,
          status: 'sold' as const,
          isTradeIn: false,
          soldAt: new Date(now - 1 * dayMs),
        },
        {
          model: 'iPhone 13 Pro 256GB',
          color: 'Sierra Blue',
          imei: '355109882341099',
          condition: 'used' as const,
          batteryHealth: 88,
          boxAndCharger: 'Faqat Quti',
          sourceName: malikaPhoneSupplier.name,
          supplierId: malikaPhoneSupplier.id,
          purchasePrice: 7300000,
          extraExpenses: 150000,
          costPrice: 7450000,
          salePrice: 8400000,
          soldPrice: 8400000,
          status: 'sold' as const,
          isTradeIn: false,
          soldAt: new Date(now - 2 * dayMs),
        },
      ]

      const currentPhones = await phonesRepo.list(tx)
      const phoneByImei = new Map(currentPhones.map((p) => [p.imei, p]))
      const missingPhones = phoneSpecs.filter((p) => !phoneByImei.has(p.imei))
      if (missingPhones.length > 0) {
        await phonesRepo.insertMany(missingPhones, tx)
      }
      const allSeededPhones = await phonesRepo.list(tx)

      // Repairs Workshop (12 diverse repairs: in_progress, ready, 10/20/30+ days overdue, delivered)
      const currentRepairs = await repairsRepo.list(tx)
      if (currentRepairs.length < 10) {
        const existingRepairImeis = new Set(currentRepairs.map((r) => r.imei))
        const p0 = allSeededParts[0]!
        const p1 = allSeededParts[1] ?? p0
        const p2 = allSeededParts[2] ?? p0
        const p3 = allSeededParts[3] ?? p0
        const p4 = allSeededParts[4] ?? p0
        const p5 = allSeededParts[5] ?? p0
        const p6 = allSeededParts[6] ?? p0

        const repairSpecs = [
          {
            customerType: 'regular' as const,
            customerName: 'Azizbek Karimov',
            customerPhone: '+998 90 345 67 89',
            phoneModel: 'iPhone 13 Pro',
            imei: '356781092231001',
            issueDescription: 'Ekran singan, sensor ishlamayapti',
            promisedAt: new Date(now + 4 * 60 * 60 * 1000),
            lockType: 'pattern' as const,
            lockCode: '1-2-5-8-9',
            partId: p0.id,
            partNameSnapshot: p0.name,
            partCostSnapshot: 0,
            partDeducted: false,
            agreedPrice: 1850000,
            advancePayment: 500000,
            status: 'in_progress' as const,
            createdAt: new Date(now - 3 * 60 * 60 * 1000),
          },
          {
            customerType: 'partner' as const,
            customerName: 'Usta Otabek (Chorsu Servis)',
            customerPhone: '+998 98 300 40 50',
            phoneModel: 'iPhone 15 Pro Max',
            imei: '359100228374611',
            issueDescription: 'FaceID Dot Projector tiklash va TrueTone yozish',
            promisedAt: new Date(now + 6 * 60 * 60 * 1000),
            lockType: 'text' as const,
            lockCode: '889900',
            partId: p6.id,
            partNameSnapshot: p6.name,
            partCostSnapshot: 0,
            partDeducted: false,
            agreedPrice: 650000,
            advancePayment: 200000,
            status: 'in_progress' as const,
            createdAt: new Date(now - 5 * 60 * 60 * 1000),
          },
          {
            customerType: 'regular' as const,
            customerName: 'Sardorbek Alimov',
            customerPhone: '+998 99 800 55 44',
            phoneModel: 'Samsung Galaxy S23 Ultra',
            imei: '354491002938471',
            issueDescription: 'Service Pack original ekran o`rnatish',
            promisedAt: new Date(now + 8 * 60 * 60 * 1000),
            lockType: 'pattern' as const,
            lockCode: '1-5-9-8-7',
            partId: p2.id,
            partNameSnapshot: p2.name,
            partCostSnapshot: 0,
            partDeducted: false,
            agreedPrice: 3100000,
            advancePayment: 1000000,
            status: 'in_progress' as const,
            createdAt: new Date(now - 2 * 60 * 60 * 1000),
          },
          {
            customerType: 'partner' as const,
            customerName: 'Usta Bekzod (Chorsu filiali)',
            customerPhone: '+998 93 555 12 34',
            phoneModel: 'Samsung A54 5G',
            imei: '358812094451230',
            issueDescription: 'Quvvat olmayapti (Type-C port almashtirish)',
            promisedAt: new Date(now + 2 * 60 * 60 * 1000),
            lockType: 'text' as const,
            lockCode: '1995',
            partId: p5.id,
            partNameSnapshot: p5.name,
            partCostSnapshot: p5.costPrice,
            partDeducted: true,
            agreedPrice: 220000,
            advancePayment: 0,
            status: 'ready' as const,
            createdAt: new Date(now - 2 * dayMs),
            readyAt: new Date(now - 1 * dayMs),
          },
          {
            customerType: 'regular' as const,
            customerName: 'Madina Saidova',
            customerPhone: '+998 91 165 77 88',
            phoneModel: 'iPhone 14 Pro Max',
            imei: '357711009988221',
            issueDescription: 'Orqa oyna lazerda almashtirish + MagSafe halqa',
            promisedAt: new Date(now + 1 * 60 * 60 * 1000),
            lockType: 'text' as const,
            lockCode: '0707',
            partId: p4.id,
            partNameSnapshot: p4.name,
            partCostSnapshot: p4.costPrice,
            partDeducted: true,
            agreedPrice: 480000,
            advancePayment: 150000,
            status: 'ready' as const,
            createdAt: new Date(now - 6 * 60 * 60 * 1000),
            readyAt: new Date(now - 1 * 60 * 60 * 1000),
          },
          {
            customerType: 'regular' as const,
            customerName: 'Shoxrux Mirzayev',
            customerPhone: '+998 94 611 22 33',
            phoneModel: 'Redmi Note 12',
            imei: '869102039481726',
            issueDescription: 'Ekran almashtirish va tozalash',
            promisedAt: new Date(now - 11 * dayMs),
            lockType: 'pattern' as const,
            lockCode: '1-4-7-8-9',
            partId: p2.id,
            partNameSnapshot: p2.name,
            partCostSnapshot: p2.costPrice,
            partDeducted: true,
            agreedPrice: 480000,
            advancePayment: 100000,
            status: 'ready' as const,
            createdAt: new Date(now - 13 * dayMs),
            readyAt: new Date(now - 12 * dayMs),
          },
          {
            customerType: 'regular' as const,
            customerName: 'Ulug`bek Nazarov',
            customerPhone: '+998 90 808 19 20',
            phoneModel: 'iPhone 11 128GB',
            imei: '356112098374550',
            issueDescription: 'GX OLED ekran + tru-tone tiklash',
            promisedAt: new Date(now - 14 * dayMs),
            lockType: 'text' as const,
            lockCode: '1212',
            partId: p5.id,
            partNameSnapshot: p5.name,
            partCostSnapshot: p5.costPrice,
            partDeducted: true,
            agreedPrice: 650000,
            advancePayment: 100000,
            status: 'ready' as const,
            createdAt: new Date(now - 16 * dayMs),
            readyAt: new Date(now - 15 * dayMs),
          },
          {
            customerType: 'partner' as const,
            customerName: 'Jasur (Yunusobod filiali)',
            customerPhone: '+998 97 404 88 99',
            phoneModel: 'iPhone 12 Pro',
            imei: '353911109283741',
            issueDescription: 'Batareya shishgan + FaceID tekshirish',
            promisedAt: new Date(now - 21 * dayMs),
            lockType: 'text' as const,
            lockCode: '000000',
            partId: p3.id,
            partNameSnapshot: p3.name,
            partCostSnapshot: p3.costPrice,
            partDeducted: true,
            agreedPrice: 380000,
            advancePayment: 50000,
            status: 'ready' as const,
            createdAt: new Date(now - 23 * dayMs),
            readyAt: new Date(now - 22 * dayMs),
          },
          {
            customerType: 'regular' as const,
            customerName: 'Muzaffar Tursunov',
            customerPhone: '+998 91 122 00 11',
            phoneModel: 'Samsung S21 FE',
            imei: '352091882736455',
            issueDescription: 'Suv tushgan, ona platani tiklash (Ehtiyot qismsiz)',
            promisedAt: new Date(now - 31 * dayMs),
            lockType: 'text' as const,
            lockCode: 'Parolsiz',
            partId: null,
            partNameSnapshot: 'Ehtiyot qismsiz / Faqat xizmat',
            partCostSnapshot: 0,
            partDeducted: false,
            agreedPrice: 450000,
            advancePayment: 0,
            status: 'ready' as const,
            createdAt: new Date(now - 34 * dayMs),
            readyAt: new Date(now - 32 * dayMs),
          },
          {
            customerType: 'regular' as const,
            customerName: 'Dilnoza Rahimova',
            customerPhone: '+998 90 998 77 66',
            phoneModel: 'iPhone 14 Pro Max',
            imei: '357890123456780',
            issueDescription: 'Original batareya qo`yish',
            promisedAt: new Date(now - 4 * 60 * 60 * 1000),
            lockType: 'text' as const,
            lockCode: '2580',
            partId: p4.id,
            partNameSnapshot: p4.name,
            partCostSnapshot: p4.costPrice,
            partDeducted: true,
            agreedPrice: 550000,
            advancePayment: 200000,
            finalPaidAmount: 350000,
            status: 'delivered' as const,
            createdAt: new Date(now - 8 * 60 * 60 * 1000),
            readyAt: new Date(now - 3 * 60 * 60 * 1000),
            deliveredAt: new Date(now - 1 * 60 * 60 * 1000),
          },
          {
            customerType: 'partner' as const,
            customerName: 'Usta Davron (Sergeli filiali)',
            customerPhone: '+998 93 512 90 09',
            phoneModel: 'iPhone 13 Pro Max',
            imei: '358199203411229',
            issueDescription: '3x Kamera moduli almashtirish + linza tozalash',
            promisedAt: new Date(now - 2 * dayMs),
            lockType: 'text' as const,
            lockCode: '112233',
            partId: p1.id,
            partNameSnapshot: p1.name,
            partCostSnapshot: 641000,
            partDeducted: true,
            agreedPrice: 1100000,
            advancePayment: 400000,
            finalPaidAmount: 700000,
            status: 'delivered' as const,
            createdAt: new Date(now - 3 * dayMs),
            readyAt: new Date(now - 2 * dayMs),
            deliveredAt: new Date(now - 2 * dayMs + 3 * 60 * 60 * 1000),
          },
          {
            customerType: 'regular' as const,
            customerName: 'Nigora Usmonova',
            customerPhone: '+998 90 321 65 43',
            phoneModel: 'Samsung A54 5G',
            imei: '359981203344511',
            issueDescription: 'Super AMOLED ekran o`rnatish',
            promisedAt: new Date(now - 4 * dayMs),
            lockType: 'pattern' as const,
            lockCode: '2-5-8-0',
            partId: p3.id,
            partNameSnapshot: p3.name,
            partCostSnapshot: 680000,
            partDeducted: true,
            agreedPrice: 1050000,
            advancePayment: 300000,
            finalPaidAmount: 750000,
            status: 'delivered' as const,
            createdAt: new Date(now - 5 * dayMs),
            readyAt: new Date(now - 4 * dayMs),
            deliveredAt: new Date(now - 4 * dayMs + 2 * 60 * 60 * 1000),
          },
        ]

        const missingRepairs = repairSpecs.filter((r) => !existingRepairImeis.has(r.imei))
        if (missingRepairs.length > 0) {
          await repairsRepo.insertMany(missingRepairs, tx)
        }
      }

      // POS Sales (Rich sales across cash, card, mixed, credit, trade_in)
      const [salesCount] = await tx.select({ value: count() }).from(posSales)
      if (!salesCount || salesCount.value < 6) {
        const soldPhones = allSeededPhones.filter((p) => p.status === 'sold')
        const phoneA = soldPhones[0] ?? allSeededPhones[0]!
        const phoneB = soldPhones[1] ?? allSeededPhones[1] ?? phoneA
        const phoneC = soldPhones[2] ?? allSeededPhones[2] ?? phoneA
        const partScreen = allSeededParts[0]!
        const partBattery = allSeededParts[6] ?? allSeededParts[1] ?? partScreen
        const partAcc = allSeededParts[allSeededParts.length - 1] ?? partScreen

        await tx.insert(posSales).values([
          {
            saleType: 'phone',
            phoneId: phoneA.id,
            itemTitle: `${phoneA.model} (${phoneA.color})`,
            quantity: 1,
            customerName: 'Farrux Xolmatov',
            customerPhone: '+998 90 111 22 33',
            totalAmount: 3589600,
            payableAmount: 3589600,
            costAmount: 3076800,
            profitAmount: 512800,
            paymentMethod: 'cash',
            cashPaid: 3589600,
            cardPaid: 0,
            creditAmount: 0,
            warrantyMonths: 6,
            createdAt: new Date(now - 2 * 60 * 60 * 1000),
          },
          {
            saleType: 'part',
            partId: partAcc.id,
            itemTitle: partAcc.name,
            quantity: 2,
            customerName: 'Madina Saidova',
            customerPhone: '+998 91 165 77 88',
            totalAmount: 640000,
            payableAmount: 640000,
            costAmount: 370000,
            profitAmount: 270000,
            paymentMethod: 'card',
            cashPaid: 0,
            cardPaid: 640000,
            creditAmount: 0,
            warrantyMonths: 3,
            createdAt: new Date(now - 4 * 60 * 60 * 1000),
          },
          {
            saleType: 'part',
            partId: partScreen.id,
            itemTitle: partScreen.name,
            quantity: 1,
            customerName: 'Mirzohid Usta (Hamkor servis)',
            customerPhone: '+998 94 600 70 80',
            totalAmount: 1666600,
            payableAmount: 1666600,
            costAmount: 1282000,
            profitAmount: 384600,
            paymentMethod: 'mixed',
            cashPaid: 1000000,
            cardPaid: 666600,
            creditAmount: 0,
            warrantyMonths: 1,
            createdAt: new Date(now - 6 * 60 * 60 * 1000),
          },
          {
            saleType: 'phone',
            phoneId: phoneB.id,
            tradeInModel: 'iPhone 13 128GB',
            tradeInImei: '351129803349182',
            tradeInAcceptedPrice: 5500000,
            itemTitle: `${phoneB.model} (${phoneB.color})`,
            quantity: 1,
            customerName: 'Sanjar Rahimov',
            customerPhone: '+998 90 111 22 33',
            totalAmount: 11950000,
            payableAmount: 6450000,
            costAmount: 10800000,
            profitAmount: 1150000,
            paymentMethod: 'trade_in',
            cashPaid: 4000000,
            cardPaid: 2450000,
            creditAmount: 0,
            warrantyMonths: 6,
            createdAt: new Date(now - 1 * dayMs),
          },
          {
            saleType: 'phone',
            phoneId: phoneC.id,
            itemTitle: `${phoneC.model} (${phoneC.color})`,
            quantity: 1,
            customerName: 'Sardorbek Alimov',
            customerPhone: '+998 99 800 55 44',
            totalAmount: 8400000,
            payableAmount: 8400000,
            costAmount: 7450000,
            profitAmount: 950000,
            paymentMethod: 'credit',
            cashPaid: 5836000,
            cardPaid: 0,
            creditAmount: 2564000,
            warrantyMonths: 6,
            createdAt: new Date(now - 2 * dayMs),
          },
          {
            saleType: 'part',
            partId: partBattery.id,
            itemTitle: partBattery.name,
            quantity: 4,
            customerName: 'Usta Otabek (Chorsu Servis)',
            customerPhone: '+998 98 300 40 50',
            totalAmount: 1120000,
            payableAmount: 1120000,
            costAmount: 600000,
            profitAmount: 520000,
            paymentMethod: 'cash',
            cashPaid: 1120000,
            cardPaid: 0,
            creditAmount: 0,
            warrantyMonths: 3,
            createdAt: new Date(now - 3 * dayMs),
          },
          {
            saleType: 'part',
            partId: partScreen.id,
            itemTitle: 'Samsung S23 Ultra Amoled Service Pack',
            quantity: 1,
            customerName: 'Javohir Abdullayev (VIP Korporativ)',
            customerPhone: '+998 90 950 10 20',
            totalAmount: 2820400,
            payableAmount: 2820400,
            costAmount: 2307600,
            profitAmount: 512800,
            paymentMethod: 'card',
            cashPaid: 0,
            cardPaid: 2820400,
            creditAmount: 0,
            warrantyMonths: 6,
            createdAt: new Date(now - 5 * dayMs),
          },
        ])
      }

      // Debts Ledger (Customer & Supplier debts across phone_sale, repair, part_sale, phone_intake, part_intake)
      const currentDebts = await debtsRepo.list(tx)
      if (currentDebts.length < 6) {
        const existingDebtDesc = new Set(currentDebts.map((d) => d.description))
        const debtSpecs = [
          {
            debtType: 'customer' as const,
            sourceType: 'phone_sale' as const,
            categoryTag: 'phone' as const,
            counterpartyName: 'Sardorbek Alimov',
            counterpartyPhone: '+998 99 800 55 44',
            description: 'iPhone 13 Pro 256GB sotuvidan nasiya qoldiq',
            totalAmount: 3846000,
            paidAmount: 1282000,
            remainingAmount: 2564000,
            dueDate: new Date(now - 1 * dayMs),
            status: 'open' as const,
          },
          {
            debtType: 'customer' as const,
            sourceType: 'repair' as const,
            categoryTag: 'repair' as const,
            counterpartyName: 'Usta Sherzod (Hamkor)',
            counterpartyPhone: '+998 93 111 99 88',
            description: 'Samsung S22 ekran almashtirish xizmati (Nasiya)',
            totalAmount: 1600000,
            paidAmount: 600000,
            remainingAmount: 1000000,
            dueDate: new Date(now + 3 * dayMs),
            status: 'open' as const,
          },
          {
            debtType: 'customer' as const,
            sourceType: 'part_sale' as const,
            categoryTag: 'part' as const,
            counterpartyName: 'Usta Davron (Sergeli filiali)',
            counterpartyPhone: '+998 93 512 90 09',
            description: '4 dona OLED ekran va 6 dona batareya ulgurji nasiya',
            totalAmount: 5400000,
            paidAmount: 3000000,
            remainingAmount: 2400000,
            dueDate: new Date(now - 2 * dayMs),
            status: 'open' as const,
          },
          {
            debtType: 'customer' as const,
            sourceType: 'phone_sale' as const,
            categoryTag: 'phone' as const,
            counterpartyName: 'Kamoliddin Yo`ldoshev',
            counterpartyPhone: '+998 97 717 33 22',
            description: 'Samsung A55 5G xarididan qisqa muddatli qoldiq (Yopilgan)',
            totalAmount: 2000000,
            paidAmount: 2000000,
            remainingAmount: 0,
            dueDate: new Date(now - 3 * dayMs),
            status: 'paid' as const,
          },
          {
            debtType: 'supplier' as const,
            sourceType: 'phone_intake' as const,
            categoryTag: 'phone' as const,
            counterpartyName: phoneSupplier.name,
            counterpartyPhone: phoneSupplier.phone || '+998 99 888 33 44',
            supplierId: phoneSupplier.id,
            description:
              'iPhone 16 Pro Max, 15 Pro Max va S24 Ultra partiyasi (20 mln dan 10 mln berildi)',
            totalAmount: 20000000,
            paidAmount: 10000000,
            remainingAmount: 10000000,
            dueDate: new Date(now + 2 * dayMs),
            status: 'open' as const,
          },
          {
            debtType: 'supplier' as const,
            sourceType: 'part_intake' as const,
            categoryTag: 'part' as const,
            counterpartyName: partSupplier.name,
            counterpartyPhone: partSupplier.phone || '+998 97 700 11 22',
            supplierId: partSupplier.id,
            description: 'OLED ekranlar va original batareyalar partiyasi',
            totalAmount: 18500000,
            paidAmount: 12000000,
            remainingAmount: 6500000,
            dueDate: new Date(now - 1 * dayMs),
            status: 'open' as const,
          },
          {
            debtType: 'supplier' as const,
            sourceType: 'part_intake' as const,
            categoryTag: 'part' as const,
            counterpartyName: shenzhenSupplier.name,
            counterpartyPhone: shenzhenSupplier.phone || '+998 93 180 22 44',
            supplierId: shenzhenSupplier.id,
            description: 'FaceID shleyflar, korpuslar va kamera modullari yukidan qoldiq',
            totalAmount: 9800000,
            paidAmount: 6000000,
            remainingAmount: 3800000,
            dueDate: new Date(now + 5 * dayMs),
            status: 'open' as const,
          },
        ]

        const missingDebts = debtSpecs.filter((d) => !existingDebtDesc.has(d.description))
        const insertedDebts =
          missingDebts.length > 0 ? await debtsRepo.insertMany(missingDebts, tx) : []

        if (insertedDebts[0]) {
          await debtPaymentsRepo.insert(
            {
              debtId: insertedDebts[0].id,
              amount: 1282000,
              paymentMethod: 'cash',
              note: 'Boshlang`ich qisman to`lov (Naqd)',
            },
            tx,
          )
        }
        if (insertedDebts[1]) {
          await debtPaymentsRepo.insert(
            {
              debtId: insertedDebts[1].id,
              amount: 600000,
              paymentMethod: 'card',
              note: 'Uzcard orqali birinchi to`lov',
            },
            tx,
          )
        }
      }
    })
  }
}

if (import.meta.main) {
  await ensureSeeded()
  console.log(
    '✅ Database seeded (languages: uz-UZ, ru-RU, en-US + data_tables + fields + rich EAV showcase records).',
  )
  process.exit(0)
}
