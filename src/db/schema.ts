import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ============================================================================
// 1. BETTER AUTH TABLES (user, session, account, verification)
// ============================================================================
export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    role: text('role').notNull().default('admin'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_email_active_idx')
      .on(table.email)
      .where(sql`${table.isDeleted} = false`),
  ],
)

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    deviceName: text('device_name'),
    deviceType: text('device_type'),
    browser: text('browser'),
    os: text('os'),
    platform: text('platform'),
    screenResolution: text('screen_resolution'),
    timezone: text('timezone'),
    language: text('language'),
    lastActiveAt: timestamp('last_active_at').defaultNow(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('session_token_active_idx')
      .on(table.token)
      .where(sql`${table.isDeleted} = false`),
  ],
)

export const loginSessionDevices = pgTable(
  'login_session_devices',
  {
    id: serial('id').primaryKey(),
    sessionToken: text('session_token').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    userLogin: text('user_login').notNull(),
    ipAddress: text('ip_address').notNull().default('127.0.0.1'),
    userAgent: text('user_agent').notNull().default(''),
    deviceName: text('device_name').notNull().default('Desktop'),
    deviceType: text('device_type').notNull().default('desktop'), // 'desktop' | 'mobile' | 'tablet'
    browser: text('browser').notNull().default('Unknown'),
    os: text('os').notNull().default('Unknown'),
    platform: text('platform').default(''),
    screenResolution: text('screen_resolution').default(''),
    timezone: text('timezone').default(''),
    language: text('language').default(''),
    isActive: boolean('is_active').notNull().default(true),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at').notNull().defaultNow(),
    loggedOutAt: timestamp('logged_out_at'),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [
    uniqueIndex('login_session_devices_token_active_idx')
      .on(table.sessionToken)
      .where(sql`${table.isDeleted} = false`),
  ],
)

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ============================================================================
// 2. STORE SETTINGS ("Mobile Fix", Valyuta kursi, Printer & Telegram Bot)
// ============================================================================
export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  storeName: text('store_name').notNull().default('Mobile Fix'),
  storePhone: text('store_phone').notNull().default('+998 90 123 45 67'),
  storeAddress: text('store_address')
    .notNull()
    .default('Toshkent sh., Malika savdo majmuasi, B-blok'),
  cbuRate: integer('cbu_rate').notNull().default(12800),
  internalRate: integer('internal_rate').notNull().default(12820),
  defaultCurrency: text('default_currency').notNull().default('UZS'),
  telegramChatId: text('telegram_chat_id').default(''),
  dailyReportTime: text('daily_report_time').notNull().default('21:00'),
  printerPaperWidth: text('printer_paper_width').notNull().default('58mm'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================================
// 3. LANGUAGES TABLE (uz-UZ, ru-RU, en-US — used as relation on *_translations)
// ============================================================================
export const languages = pgTable(
  'languages',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(), // 'uz-UZ' | 'ru-RU' | 'en-US'
    name: text('name').notNull(), // "O'zbekcha" | "Русский" | "English"
    isDefault: boolean('is_default').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('languages_code_active_idx')
      .on(table.code)
      .where(sql`${table.isDeleted} = false`),
  ],
)

// ============================================================================
// 4. DATA TABLES & DATA TABLE TRANSLATIONS (Jadval nomlari va tavsiflari)
// ============================================================================
export const dataTables = pgTable(
  'data_tables',
  {
    id: serial('id').primaryKey(),
    key: text('key').notNull(), // unique latin key among non-deleted tables
    isSystem: boolean('is_system').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('data_tables_key_active_idx')
      .on(table.key)
      .where(sql`${table.isDeleted} = false`),
  ],
)

export const dataTableTranslations = pgTable(
  'data_table_translations',
  {
    id: serial('id').primaryKey(),
    dataTableId: integer('data_table_id')
      .notNull()
      .references(() => dataTables.id, { onDelete: 'cascade' }),
    languageId: integer('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'), // Optional description field
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('data_table_translations_active_idx')
      .on(table.dataTableId, table.languageId)
      .where(sql`${table.isDeleted} = false`),
  ],
)

// ============================================================================
// 5. DATA TABLE FIELDS ([key | value | type]) & FIELD TRANSLATIONS
// ============================================================================
export const dataTableFields = pgTable(
  'data_table_fields',
  {
    id: serial('id').primaryKey(),
    dataTableId: integer('data_table_id')
      .notNull()
      .references(() => dataTables.id, { onDelete: 'cascade' }),
    key: text('key').notNull(), // Unique Latin key generated from field name (per active table)
    value: text('value').notNull().default(''), // Default / stored field value
    type: text('type').notNull().default('text'), // 'system' | 'text' | 'number' | 'money' | 'date' | 'select' | 'boolean'
    optionsJson: text('options_json').notNull().default('[]'),
    isSystem: boolean('is_system').notNull().default(false),
    isVisible: boolean('is_visible').notNull().default(true),
    isRequired: boolean('is_required').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('data_table_fields_table_key_active_idx')
      .on(table.dataTableId, table.key)
      .where(sql`${table.isDeleted} = false`),
  ],
)

export const dataTableFieldTranslations = pgTable(
  'data_table_field_translations',
  {
    id: serial('id').primaryKey(),
    fieldId: integer('field_id')
      .notNull()
      .references(() => dataTableFields.id, { onDelete: 'cascade' }),
    languageId: integer('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('data_table_field_translations_active_idx')
      .on(table.fieldId, table.languageId)
      .where(sql`${table.isDeleted} = false`),
  ],
)

// ============================================================================
// 6. DYNAMIC TABLE RECORDS & CELL VALUES ([key | value | type] EAV storage)
// ============================================================================
export const dataTableRecords = pgTable('data_table_records', {
  id: serial('id').primaryKey(),
  dataTableId: integer('data_table_id')
    .notNull()
    .references(() => dataTables.id, { onDelete: 'cascade' }),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const dataTableRecordValues = pgTable(
  'data_table_record_values',
  {
    id: serial('id').primaryKey(),
    recordId: integer('record_id')
      .notNull()
      .references(() => dataTableRecords.id, { onDelete: 'cascade' }),
    fieldId: integer('field_id').references(() => dataTableFields.id, {
      onDelete: 'set null',
    }),
    key: text('key').notNull(),
    value: text('value').notNull().default(''),
    type: text('type').notNull().default('text'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('data_table_record_values_record_key_active_idx')
      .on(table.recordId, table.key)
      .where(sql`${table.isDeleted} = false`),
  ],
)

// ============================================================================
// 7. SUPPLIERS & POS SALES (Transactional POS Checkout & Suppliers)
// ============================================================================
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').default(''),
  type: text('type').notNull().default('general'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const posSales = pgTable('pos_sales', {
  id: serial('id').primaryKey(),
  saleType: text('sale_type').notNull(), // 'phone' | 'part'
  phoneId: integer('phone_id'),
  tradeInPhoneId: integer('trade_in_phone_id'),
  tradeInModel: text('trade_in_model'),
  tradeInImei: text('trade_in_imei'),
  tradeInAcceptedPrice: bigint('trade_in_accepted_price', { mode: 'number' }).notNull().default(0),
  partId: integer('part_id'),
  itemTitle: text('item_title').notNull(),
  quantity: integer('quantity').notNull().default(1),
  customerName: text('customer_name').default('Chakana mijoz'),
  customerPhone: text('customer_phone').default(''),
  totalAmount: bigint('total_amount', { mode: 'number' }).notNull().default(0),
  payableAmount: bigint('payable_amount', { mode: 'number' }).notNull().default(0),
  costAmount: bigint('cost_amount', { mode: 'number' }).notNull().default(0),
  profitAmount: bigint('profit_amount', { mode: 'number' }).notNull().default(0),
  paymentMethod: text('payment_method').notNull().default('cash'),
  cashPaid: bigint('cash_paid', { mode: 'number' }).notNull().default(0),
  cardPaid: bigint('card_paid', { mode: 'number' }).notNull().default(0),
  creditAmount: bigint('credit_amount', { mode: 'number' }).notNull().default(0),
  warrantyMonths: integer('warranty_months').notNull().default(1),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================================
// 8. DRIZZLE RELATIONS
// ============================================================================
export const languagesRelations = relations(languages, ({ many }) => ({
  dataTableTranslations: many(dataTableTranslations),
  dataTableFieldTranslations: many(dataTableFieldTranslations),
}))

export const dataTablesRelations = relations(dataTables, ({ many }) => ({
  translations: many(dataTableTranslations),
  fields: many(dataTableFields),
  records: many(dataTableRecords),
}))

export const dataTableTranslationsRelations = relations(dataTableTranslations, ({ one }) => ({
  dataTable: one(dataTables, {
    fields: [dataTableTranslations.dataTableId],
    references: [dataTables.id],
  }),
  language: one(languages, {
    fields: [dataTableTranslations.languageId],
    references: [languages.id],
  }),
}))

export const dataTableFieldsRelations = relations(dataTableFields, ({ one, many }) => ({
  dataTable: one(dataTables, {
    fields: [dataTableFields.dataTableId],
    references: [dataTables.id],
  }),
  translations: many(dataTableFieldTranslations),
  recordValues: many(dataTableRecordValues),
}))

export const dataTableFieldTranslationsRelations = relations(
  dataTableFieldTranslations,
  ({ one }) => ({
    field: one(dataTableFields, {
      fields: [dataTableFieldTranslations.fieldId],
      references: [dataTableFields.id],
    }),
    language: one(languages, {
      fields: [dataTableFieldTranslations.languageId],
      references: [languages.id],
    }),
  }),
)

export const dataTableRecordsRelations = relations(dataTableRecords, ({ one, many }) => ({
  dataTable: one(dataTables, {
    fields: [dataTableRecords.dataTableId],
    references: [dataTables.id],
  }),
  values: many(dataTableRecordValues),
}))

export const dataTableRecordValuesRelations = relations(dataTableRecordValues, ({ one }) => ({
  record: one(dataTableRecords, {
    fields: [dataTableRecordValues.recordId],
    references: [dataTableRecords.id],
  }),
  field: one(dataTableFields, {
    fields: [dataTableRecordValues.fieldId],
    references: [dataTableFields.id],
  }),
}))
