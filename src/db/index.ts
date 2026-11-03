import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

config({ path: ['.env.local', '.env'] })

const connectionString =
  process.env.DATABASE_URL || 'postgresql://nodirbekrajaboff@localhost:5432/mobile_fix_store'

export const pool = new Pool({
  connectionString,
})

export const db = drizzle(pool, { schema })
