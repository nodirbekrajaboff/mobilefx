import fs from 'node:fs'
import { join, resolve } from 'node:path'

import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

import { db } from '#/db'

const cwdMigrationsFolder = join(process.cwd(), 'drizzle')
const migrationsFolder = fs.existsSync(cwdMigrationsFolder)
  ? cwdMigrationsFolder
  : resolve(import.meta.dir, '../../drizzle')

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required for migrator!')
    process.exit(1)
  }

  console.log(`Running database migrations from ${migrationsFolder}...`)

  await migrate(db, { migrationsFolder })

  // Ensure soft-delete columns and partial unique indexes exist on upgraded databases
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

    ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_email_key;
    ALTER TABLE "session" DROP CONSTRAINT IF EXISTS session_token_key;
    ALTER TABLE login_session_devices DROP CONSTRAINT IF EXISTS login_session_devices_session_token_key;
    ALTER TABLE languages DROP CONSTRAINT IF EXISTS languages_code_key;
    ALTER TABLE data_tables DROP CONSTRAINT IF EXISTS data_tables_key_key;

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

  console.log('Database migrations completed successfully.')
  process.exit(0)
}

main().catch((error) => {
  console.error('Database migration failed:', error)
  process.exit(1)
})
