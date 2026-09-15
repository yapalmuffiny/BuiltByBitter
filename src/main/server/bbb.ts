import type {
  BBBAddon,
  BBBMember,
  BBBMemberFull,
  BBBLicense,
  BBBPurchase,
  BBBResource,
  BBBReview,
  BBBUpdate,
  BBBVersion,
  MemberLookupType,
  PostAddonUpdatePayload,
  PostResourceUpdatePayload
} from '@shared/types'

const BBB_BASE = 'https://api.builtbybit.com'

// ── snake_case → camelCase normalisation ─────────────────────────────────────

function toCamel(key: string): string {
  // BBB mixes snake_case (cover_image_url) with PascalCase (ListPrice, Addons),
  // so normalise both: strip underscores AND lowercase the first character.
  const camel = key.replace(/_([a-z0-9])/gi, (_m, c: string) => c.toUpperCase())
  return camel.charAt(0).toLowerCase() + camel.slice(1)
}

function camelizeDeep<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => camelizeDeep(v)) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[toCamel(k)] = camelizeDeep(v)
    }
    return out as T
  }
  return value as T
}

// ── Rate-limited request queue ───────────────────────────────────────────────
// BBB throttles per endpoint. We serialise requests with a minimum gap and back
// off on HTTP 429 using the Retry-After header.

const MIN_GAP_MS = 300
let chain: Promise<unknown> = Promise.resolve()
let lastRequestAt = 0

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastRequestAt)
    if (wait > 0) await sleep(wait)
    try {
      return await task()
    } finally {
      lastRequestAt = Date.now()
    }
  })
  // Keep the chain alive regardless of individual task failure.
  chain = run.then(
    () => undefined,
    () => undefined
  )
  return run as Promise<T>
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export class BBBError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'BBBError'
    this.status = status
  }
}

interface RequestOpts {
  method?: 'GET' | 'POST'
  path: string
  apiKey: string
  query?: Record<string, string | undefined>
  body?: unknown
}

async function request<T>(opts: RequestOpts, retries = 4): Promise<T> {
  const url = new URL(opts.path, BBB_BASE)
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v != null && v !== '') url.searchParams.set(k, v)
    }
  }

  return enqueue(async () => {
    let attempt = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await fetch(url, {
        method: opts.method ?? 'GET',
        headers: {
          Authorization: `Private ${opts.apiKey}`,
          Accept: 'application/json',
          ...(opts.body ? { 'Content-Type': 'application/json' } : {})
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined
      })

      if (res.status === 429 && attempt < retries) {
        const retryAfter = Number(res.headers.get('Retry-After')) || 5
        attempt += 1
        await sleep(retryAfter * 1000)
        continue
      }

      const text = await res.text()
      let json: unknown = null
      try {
        // discord_id (and similar snowflake ids) exceed JS's safe-integer range,
        // so quote them before parsing to avoid precision loss.
        const safe = text.replace(/"discord_id":\s*(\d+)/g, '"discord_id":"$1"')
        json = safe ? JSON.parse(safe) : null
      } catch {
        json = null
      }

      if (!res.ok) {
        const message = extractError(json) ?? `${res.status} ${res.statusText}`
        throw new BBBError(message, res.status)
      }

      // BBB envelope: { result: 'success', data: ... }
      const envelope = json as { result?: string; data?: unknown } | null
      const data = envelope && 'data' in envelope ? envelope.data : json
      return camelizeDeep<T>(data)
    }
  })
}

function extractError(json: unknown): string | null {
  if (json && typeof json === 'object') {
    const e = (json as { error?: unknown }).error
    if (typeof e === 'string') return e
    if (e && typeof e === 'object') {
      const msg = (e as { message?: string }).message
      if (msg) return msg
    }
    const message = (json as { message?: string }).message
    if (message) return message
  }
  return null
}

// ── Public API ───────────────────────────────────────────────────────────────

function idsQuery(resourceIds?: number[]): Record<string, string | undefined> {
  return resourceIds && resourceIds.length ? { resource_ids: resourceIds.join(',') } : {}
}

interface ResourcesResponse {
  resources?: BBBResource[]
  stats?: unknown
}
interface AddonsResponse {
  addons?: BBBAddon[]
}
interface VersionsResponse {
  versions?: BBBVersion[]
}
interface UpdatesResponse {
  updates?: BBBUpdate[]
}

export const bbb = {
  async getResources(apiKey: string, resourceIds?: number[]): Promise<BBBResource[]> {
    const data = await request<ResourcesResponse | BBBResource[]>({
      path: '/v2/resources/creator/resources',
      apiKey,
      query: idsQuery(resourceIds)
    })
    return Array.isArray(data) ? data : (data.resources ?? [])
  },

  async getAddons(apiKey: string, resourceIds?: number[]): Promise<BBBAddon[]> {
    const data = await request<AddonsResponse | BBBAddon[]>({
      path: '/v2/resources/creator/addons',
      apiKey,
      query: idsQuery(resourceIds)
    })
    return Array.isArray(data) ? data : (data.addons ?? [])
  },

  async getVersions(apiKey: string, resourceIds?: number[]): Promise<BBBVersion[]> {
    const data = await request<VersionsResponse | BBBVersion[]>({
      path: '/v2/resources/creator/versions',
      apiKey,
      query: idsQuery(resourceIds)
    })
    return Array.isArray(data) ? data : (data.versions ?? [])
  },

  async getUpdates(apiKey: string, resourceIds?: number[]): Promise<BBBUpdate[]> {
    const data = await request<UpdatesResponse | BBBUpdate[]>({
      path: '/v2/resources/creator/updates',
      apiKey,
      query: idsQuery(resourceIds)
    })
    return Array.isArray(data) ? data : (data.updates ?? [])
  },

  /** Identity of the authenticated member (BBB v1). Used to validate the key. */
  async getSelf(apiKey: string): Promise<BBBMember> {
    const data = await request<Record<string, unknown>>({
      path: '/v1/members/self',
      apiKey
    })
    const m = data as Record<string, unknown>
    return {
      memberId: (m.memberId as number) ?? (m.userId as number),
      username: m.username as string,
      avatarUrl: (m.avatarUrl as string) ?? (m.avatar as string),
      banned: m.banned as boolean,
      suspended: m.suspended as boolean,
      restricted: m.restricted as boolean
    }
  },

  async postResourceUpdate(
    apiKey: string,
    payload: PostResourceUpdatePayload
  ): Promise<unknown> {
    const body: Record<string, unknown> = {
      resource_id: payload.resourceId,
      version_name: payload.versionName,
      file: { name: payload.file.name, data: payload.file.data }
    }
    if (payload.update) {
      body.update = {
        post: payload.update.post,
        title: payload.update.title ?? undefined,
        message: payload.update.message
      }
    }
    return request<unknown>({
      method: 'POST',
      path: '/v2/resources/creator/update',
      apiKey,
      body
    })
  },

  async postAddonUpdate(apiKey: string, payload: PostAddonUpdatePayload): Promise<unknown> {
    return request<unknown>({
      method: 'POST',
      path: '/v2/resources/creator/addons/update',
      apiKey,
      body: {
        addon_id: payload.addonId,
        version_name: payload.versionName,
        file: { name: payload.file.name, data: payload.file.data }
      }
    })
  },

  // ── Member lookup (v1) ─────────────────────────────────────────────────────
  async getMember(
    apiKey: string,
    type: MemberLookupType,
    query?: string
  ): Promise<BBBMemberFull> {
    const q = encodeURIComponent((query ?? '').trim())
    const path =
      type === 'self'
        ? '/v1/members/self'
        : type === 'id'
          ? `/v1/members/${q}`
          : type === 'username'
            ? `/v1/members/usernames/${q}`
            : `/v1/members/discords/${q}`
    return request<BBBMemberFull>({ path, apiKey })
  },

  // ── Creator collections ────────────────────────────────────────────────────
  async getPurchases(apiKey: string, resourceIds?: number[]): Promise<BBBPurchase[]> {
    const data = await request<{ purchases?: BBBPurchase[] } | BBBPurchase[]>({
      path: '/v2/resources/creator/purchases',
      apiKey,
      query: idsQuery(resourceIds)
    })
    return Array.isArray(data) ? data : (data.purchases ?? [])
  },

  async getLicenses(apiKey: string, resourceIds?: number[]): Promise<BBBLicense[]> {
    const data = await request<{ licenses?: BBBLicense[] } | BBBLicense[]>({
      path: '/v2/resources/creator/licenses',
      apiKey,
      query: idsQuery(resourceIds)
    })
    return Array.isArray(data) ? data : (data.licenses ?? [])
  },

  async getReviews(apiKey: string, resourceIds?: number[]): Promise<BBBReview[]> {
    const data = await request<{ reviews?: BBBReview[] } | BBBReview[]>({
      path: '/v2/resources/creator/reviews',
      apiKey,
      query: idsQuery(resourceIds)
    })
    return Array.isArray(data) ? data : (data.reviews ?? [])
  }
}
