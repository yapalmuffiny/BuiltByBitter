import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/main/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://builtbybitter:builtbybitter@127.0.0.1:5433/builtbybitter'
  },
  verbose: true,
  strict: true
})
