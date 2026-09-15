// Loaded as the very FIRST import in the main process so that process.env is
// populated before any module (notably ../db) reads DATABASE_URL at import time.
import dotenv from 'dotenv'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

const candidates = [
  join(process.cwd(), '.env'),
  // out/main/index.js -> project root is two levels up in dev.
  join(__dirname, '../../.env'),
  join(process.resourcesPath ?? '', '.env')
]

for (const candidate of candidates) {
  if (candidate && existsSync(candidate)) {
    dotenv.config({ path: candidate })
    break
  }
}
