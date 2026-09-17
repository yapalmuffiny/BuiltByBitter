import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatNumber(n?: number): string {
  if (n == null) return '—'
  return new Intl.NumberFormat().format(n)
}

export function formatPrice(price?: {
  currency?: string
  value?: number
  amount?: number
  formatted?: string
}): string {
  if (!price) return '—'
  const value = price.value ?? price.amount
  if (value === 0) return 'Free'
  if (price.formatted) return price.formatted
  if (value == null) return '—'
  const currency = price.currency ?? 'USD'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

export function formatDate(ms?: number): string {
  if (!ms) return '—'
  const value = ms < 1e12 ? ms * 1000 : ms
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`
}

export function toHttps(url?: string): string | undefined {
  if (!url) return undefined
  return url.startsWith('http://') ? 'https://' + url.slice('http://'.length) : url
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
