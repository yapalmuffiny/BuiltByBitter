import { Wrapper, Token, TokenType } from '@builtbybit/api-wrapper'
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

function toCamel(key: string): string {
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

export class BBBError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = 'BBBError'
    this.status = status
  }
}

const BBB_BASE = 'https://api.builtbybit.com'

function createWrapper(apiKey: string): InstanceType<typeof Wrapper> {
  const wrapper = new Wrapper()
  const token = new Token(TokenType.PRIVATE, apiKey)
  wrapper.init(token, false)
  return wrapper
}

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') search.set(k, String(v))
  }
  const str = search.toString()
  return str ? `?${str}` : ''
}

function idsParam(resourceIds?: number[]): string {
  if (!resourceIds || !resourceIds.length) return ''
  return queryString({ resource_ids: resourceIds.join(',') })
}

async function execute<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const res = await fn()
    return camelizeDeep<T>(res)
  } catch (err: unknown) {
    if (err instanceof BBBError) throw err
    if (err && typeof err === 'object') {
      const response = (err as { response?: { status?: number; data?: { error?: { message?: string } } } }).response
      if (response) {
        const message = response.data?.error?.message ?? 'BuiltByBit API error'
        throw new BBBError(message, response.status ?? 500)
      }
      const message = (err as { message?: string }).message
      if (message) throw new BBBError(message)
    }
    throw new BBBError('BuiltByBit request failed')
  }
}

interface ResourcesPayload {
  resources?: BBBResource[]
}
interface AddonsPayload {
  addons?: BBBAddon[]
}
interface VersionsPayload {
  versions?: BBBVersion[]
}
interface UpdatesPayload {
  updates?: BBBUpdate[]
}
interface PurchasesPayload {
  purchases?: BBBPurchase[]
}
interface LicensesPayload {
  licenses?: BBBLicense[]
}
interface ReviewsPayload {
  reviews?: BBBReview[]
}

export const bbb = {
  async getSelf(apiKey: string): Promise<BBBMember> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
      const data = (await wrapper.members().self()) as Record<string, unknown>
      const m = camelizeDeep<Record<string, unknown>>(data)
      return {
        memberId: (m.memberId as number) ?? (m.userId as number),
        username: m.username as string,
        avatarUrl: (m.avatarUrl as string) ?? (m.avatar as string),
        banned: Boolean(m.banned),
        suspended: Boolean(m.suspended),
        restricted: Boolean(m.restricted)
      }
    })
  },

  async getMember(
    apiKey: string,
    type: MemberLookupType,
    query?: string
  ): Promise<BBBMemberFull> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
      const q = (query ?? '').trim()
      let raw: unknown
      if (type === 'self') {
        raw = await wrapper.members().self()
      } else if (type === 'id') {
        raw = await wrapper.members().fetch(Number(q))
      } else if (type === 'username') {
        raw = await wrapper.members().fetchByUsername(q)
      } else {
        raw = await wrapper.members().fetchByDiscord(q)
      }
      return raw as BBBMemberFull
    })
  },

  async getResources(apiKey: string, resourceIds?: number[]): Promise<BBBResource[]> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
      const res = (await wrapper.http().get(`${BBB_BASE}/v2/resources/creator/resources${idsParam(resourceIds)}`)) as
        | ResourcesPayload
        | BBBResource[]
      return Array.isArray(res) ? res : (res?.resources ?? [])
    })
  },

  async getAddons(apiKey: string, resourceIds?: number[]): Promise<BBBAddon[]> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
      const res = (await wrapper.http().get(`${BBB_BASE}/v2/resources/creator/addons${idsParam(resourceIds)}`)) as
        | AddonsPayload
        | BBBAddon[]
      return Array.isArray(res) ? res : (res?.addons ?? [])
    })
  },

  async getVersions(apiKey: string, resourceIds?: number[]): Promise<BBBVersion[]> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
      const res = (await wrapper.http().get(`${BBB_BASE}/v2/resources/creator/versions${idsParam(resourceIds)}`)) as
        | VersionsPayload
        | BBBVersion[]
      return Array.isArray(res) ? res : (res?.versions ?? [])
    })
  },

  async getUpdates(apiKey: string, resourceIds?: number[]): Promise<BBBUpdate[]> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
      const res = (await wrapper.http().get(`${BBB_BASE}/v2/resources/creator/updates${idsParam(resourceIds)}`)) as
        | UpdatesPayload
        | BBBUpdate[]
      return Array.isArray(res) ? res : (res?.updates ?? [])
    })
  },

  async getPurchases(apiKey: string, resourceIds?: number[]): Promise<BBBPurchase[]> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
      const res = (await wrapper.http().get(`${BBB_BASE}/v2/resources/creator/purchases${idsParam(resourceIds)}`)) as
        | PurchasesPayload
        | BBBPurchase[]
      return Array.isArray(res) ? res : (res?.purchases ?? [])
    })
  },

  async getLicenses(apiKey: string, resourceIds?: number[]): Promise<BBBLicense[]> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
      const res = (await wrapper.http().get(`${BBB_BASE}/v2/resources/creator/licenses${idsParam(resourceIds)}`)) as
        | LicensesPayload
        | BBBLicense[]
      return Array.isArray(res) ? res : (res?.licenses ?? [])
    })
  },

  async getReviews(apiKey: string, resourceIds?: number[]): Promise<BBBReview[]> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
      const res = (await wrapper.http().get(`${BBB_BASE}/v2/resources/creator/reviews${idsParam(resourceIds)}`)) as
        | ReviewsPayload
        | BBBReview[]
      return Array.isArray(res) ? res : (res?.reviews ?? [])
    })
  },

  async postResourceUpdate(
    apiKey: string,
    payload: PostResourceUpdatePayload
  ): Promise<unknown> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
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
      return wrapper.http().post(`${BBB_BASE}/v2/resources/creator/update`, body)
    })
  },

  async postAddonUpdate(apiKey: string, payload: PostAddonUpdatePayload): Promise<unknown> {
    return execute(async () => {
      const wrapper = createWrapper(apiKey)
      return wrapper.http().post(`${BBB_BASE}/v2/resources/creator/addons/update`, {
        addon_id: payload.addonId,
        version_name: payload.versionName,
        file: { name: payload.file.name, data: payload.file.data }
      })
    })
  }
}
