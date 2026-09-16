import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { sql } from 'drizzle-orm'
import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { schema } from './schema'

// Embedded, per-user SQLite database. The file lives in the OS app-data dir so a
// downloaded copy of the app works with zero setup — no external Postgres.

type DB = BetterSQLite3Database<typeof schema>

let instance: DB | null = null

function dbFilePath(): string {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'builtbybitter.db')
}

function migrationsFolder(): string {
  // Bundled next to the app via electron-builder `extraResources` in production.
  return app.isPackaged
    ? join(process.resourcesPath, 'drizzle')
    : join(process.cwd(), 'drizzle')
}

// Open the database, enable FK enforcement, and apply migrations. Idempotent —
// safe to call at startup and lazily. Must run after app.whenReady (needs the
// userData path), which is why `db` below is a lazy proxy rather than opened at
// import time.
export function initDatabase(): DB {
  if (instance) return instance
  const sqlite = new Database(dbFilePath())
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const d = drizzle(sqlite, { schema })
  migrate(d, { migrationsFolder: migrationsFolder() })
  instance = d
  return instance
}

// Lazy handle: any use initializes the DB on first access (after app-ready).
export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const d = instance ?? initDatabase()
    const value = Reflect.get(d as object, prop, receiver)
    return typeof value === 'function' ? value.bind(d) : value
  }
})

export function pingDatabase(): { ok: boolean; error?: string } {
  try {
    initDatabase().get(sql`SELECT 1`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export { schema }
