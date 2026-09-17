import { app, safeStorage } from 'electron'
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

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
    throw new Error('OS encryption is unavailable; cannot store the API key securely.')
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
    throw new Error('OS encryption is unavailable; cannot store OAuth credentials securely.')
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
