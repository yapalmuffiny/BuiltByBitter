import { app, safeStorage } from 'electron'
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

// The BuiltByBit Ultimate API key is stored encrypted on disk via the OS
// keychain (macOS Keychain through Electron safeStorage). It is NEVER written to
// Postgres and NEVER sent to the renderer — only the local server reads it.

function keyFilePath(): string {
  return join(app.getPath('userData'), 'secrets', 'bbb-api-key.bin')
}

export function hasApiKey(): boolean {
  return existsSync(keyFilePath())
}

export function setApiKey(plain: string): void {
  const trimmed = plain.trim()
  if (!trimmed) throw new Error('API key is empty')
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption (Keychain) is unavailable; cannot store the API key securely.')
  }
  const encrypted = safeStorage.encryptString(trimmed)
  const path = keyFilePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, encrypted)
}

export function getApiKey(): string | null {
  const path = keyFilePath()
  if (!existsSync(path)) return null
  try {
    const buf = readFileSync(path)
    return safeStorage.decryptString(buf)
  } catch {
    return null
  }
}

export function clearApiKey(): void {
  const path = keyFilePath()
  if (existsSync(path)) rmSync(path)
}
