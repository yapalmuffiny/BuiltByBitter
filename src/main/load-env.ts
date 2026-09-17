import dotenv from 'dotenv'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

const candidates = [
  join(process.cwd(), '.env'),
  join(__dirname, '../../.env'),
  join(process.resourcesPath ?? '', '.env')
]

for (const candidate of candidates) {
  if (candidate && existsSync(candidate)) {
    dotenv.config({ path: candidate })
    break
  }
}
