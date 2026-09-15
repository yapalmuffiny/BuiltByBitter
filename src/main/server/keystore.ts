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

// ── BuiltByBit OAuth application credentials ─────────────────────────────────
// The login OAuth app's Client ID + Secret are user-supplied (this is a public
// app — each user registers their own BBB OAuth application). They're stored
// encrypted via the OS keychain, never written to Postgres, and the secret is
// never returned to the renderer.

export interface StoredOAuthCreds {
  clientId: string
  clientSecret: string
}

function oauthFilePath(): string {
  return join(app.getPath('userData'), 'secrets', 'bbb-oauth.bin')
}

export function hasOAuthCreds(): boolean {
  return existsSync(oauthFilePath())
}

export function setOAuthCreds(clientId: string, clientSecret: string): void {
  const id = clientId.trim()
  const secret = clientSecret.trim()
  if (!id || !secret) throw new Error('Client ID and Client Secret are both required')
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption (Keychain) is unavailable; cannot store OAuth credentials securely.')
  }
  const encrypted = safeStorage.encryptString(JSON.stringify({ clientId: id, clientSecret: secret }))
  const path = oauthFilePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, encrypted)
}

export function getOAuthCreds(): StoredOAuthCreds | null {
  const path = oauthFilePath()
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(safeStorage.decryptString(readFileSync(path))) as Partial<StoredOAuthCreds>
    if (parsed.clientId && parsed.clientSecret) {
      return { clientId: parsed.clientId, clientSecret: parsed.clientSecret }
    }
    return null
  } catch {
    return null
  }
}

export function clearOAuthCreds(): void {
  const path = oauthFilePath()
  if (existsSync(path)) rmSync(path)
}
