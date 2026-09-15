import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { schema } from './schema'

const { Pool } = pg

let poolRef: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!poolRef) {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgres://builtbybitter:builtbybitter@127.0.0.1:5433/builtbybitter'
    poolRef = new Pool({ connectionString, max: 5 })
  }
  return poolRef
}

export const db = drizzle(getPool(), { schema })

export async function pingDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getPool().query('SELECT 1')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export { schema }
