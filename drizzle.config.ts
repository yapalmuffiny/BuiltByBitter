import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

// SQLite (better-sqlite3). The runtime DB lives in the app's userData dir; this
// local file is only used by drizzle-kit for generate/push/studio during dev.
export default defineConfig({
  schema: './src/main/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_FILE ?? 'local.db'
  },
  verbose: true,
  strict: true
})
