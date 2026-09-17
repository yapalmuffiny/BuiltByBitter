import type {
  AppRuntimeInfo,
  BBBAddon,
  BBBConnection,
  BBBLicense,
  BBBMemberFull,
  BBBPurchase,
  BBBResource,
  BBBReview,
  BBBUpdate,
  BBBVersionFull,
  ChangelogTemplate,
  MemberLookupType,
  PostAddonUpdatePayload,
  PostResourceUpdatePayload,
  SessionUser,
  UpdatePostRecord
} from '@shared/types'

const TOKEN_KEY = 'builtbybitter_token'

let runtimePromise: Promise<AppRuntimeInfo> | null = null

export function getRuntime(): Promise<AppRuntimeInfo> {
  if (!runtimePromise) runtimePromise = window.api.getRuntimeInfo()
  return runtimePromise
}

export function primeRuntime(runtime: AppRuntimeInfo): void {
  runtimePromise = Promise.resolve(runtime)
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { serverUrl } = await getRuntime()
  const token = getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const res = await fetch(`${serverUrl}${path}`, { ...init, headers })
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    if (json && typeof json === 'object' && 'error' in json) {
      message = String((json as { error: unknown }).error)
    }
    throw new ApiError(message, res.status)
  }
  return json as T
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = getToken()
  if (!token) return null
  try {
    const data = await apiFetch<{ user?: SessionUser } | null>('/api/auth/get-session')
    return data?.user ?? null
  } catch {
    return null
  }
}

export async function signOut(): Promise<void> {
  try {
    await apiFetch('/api/auth/sign-out', { method: 'POST' })
  } catch {
    /* ignore */
  }
  setToken(null)
}

export function getStatus(): Promise<BBBConnection> {
  return apiFetch<BBBConnection>('/api/bbb/status')
}

export function connectKey(apiKey: string): Promise<{ ok: boolean; member: unknown }> {
  return apiFetch('/api/bbb/connect', { method: 'POST', body: JSON.stringify({ apiKey }) })
}

export function disconnectKey(): Promise<{ ok: boolean }> {
  return apiFetch('/api/bbb/disconnect', { method: 'POST' })
}

export async function getResources(): Promise<BBBResource[]> {
  const data = await apiFetch<{ resources: BBBResource[] }>('/api/bbb/resources')
  return data.resources ?? []
}

export async function getAddons(resourceIds?: number[]): Promise<BBBAddon[]> {
  const q = resourceIds?.length ? `?resourceIds=${resourceIds.join(',')}` : ''
  const data = await apiFetch<{ addons: BBBAddon[] }>(`/api/bbb/addons${q}`)
  return data.addons ?? []
}

export function postResourceUpdate(
  payload: PostResourceUpdatePayload
): Promise<{ ok: boolean; dryRun?: boolean }> {
  return apiFetch('/api/bbb/post-update', { method: 'POST', body: JSON.stringify(payload) })
}

export function postAddonUpdate(
  payload: PostAddonUpdatePayload
): Promise<{ ok: boolean; dryRun?: boolean }> {
  return apiFetch('/api/bbb/post-addon-update', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getVersions(resourceIds?: number[]): Promise<BBBVersionFull[]> {
  const q = resourceIds?.length ? `?resourceIds=${resourceIds.join(',')}` : ''
  const data = await apiFetch<{ versions: BBBVersionFull[] }>(`/api/bbb/versions${q}`)
  return data.versions ?? []
}

export async function getUpdates(resourceIds?: number[]): Promise<BBBUpdate[]> {
  const q = resourceIds?.length ? `?resourceIds=${resourceIds.join(',')}` : ''
  const data = await apiFetch<{ updates: BBBUpdate[] }>(`/api/bbb/updates${q}`)
  return data.updates ?? []
}

export async function getReviews(resourceIds?: number[]): Promise<BBBReview[]> {
  const q = resourceIds?.length ? `?resourceIds=${resourceIds.join(',')}` : ''
  const data = await apiFetch<{ reviews: BBBReview[] }>(`/api/bbb/reviews${q}`)
  return data.reviews ?? []
}

export async function getPurchases(resourceIds?: number[]): Promise<BBBPurchase[]> {
  const q = resourceIds?.length ? `?resourceIds=${resourceIds.join(',')}` : ''
  const data = await apiFetch<{ purchases: BBBPurchase[] }>(`/api/bbb/purchases${q}`)
  return data.purchases ?? []
}

export async function getLicenses(resourceIds?: number[]): Promise<BBBLicense[]> {
  const q = resourceIds?.length ? `?resourceIds=${resourceIds.join(',')}` : ''
  const data = await apiFetch<{ licenses: BBBLicense[] }>(`/api/bbb/licenses${q}`)
  return data.licenses ?? []
}

export async function lookupMember(
  type: MemberLookupType,
  q?: string
): Promise<BBBMemberFull> {
  const params = new URLSearchParams({ type })
  if (q) params.set('q', q)
  const data = await apiFetch<{ member: BBBMemberFull }>(`/api/bbb/member?${params.toString()}`)
  return data.member
}

export async function getTemplates(): Promise<ChangelogTemplate[]> {
  const data = await apiFetch<{ templates: ChangelogTemplate[] }>('/api/templates')
  return data.templates ?? []
}

export function saveTemplate(t: ChangelogTemplate): Promise<{ ok: boolean; id: string }> {
  return apiFetch('/api/templates', { method: 'POST', body: JSON.stringify(t) })
}

export function deleteTemplate(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/templates/${id}`, { method: 'DELETE' })
}

export async function getHistory(): Promise<UpdatePostRecord[]> {
  const data = await apiFetch<{ records: UpdatePostRecord[] }>('/api/history')
  return data.records ?? []
}
