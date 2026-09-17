import { Wrapper, Token, TokenType } from '@builtbybit/api-wrapper'
import * as BuiltByBitApi from 'built_by_bit_api'
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

const ApiClient =
  BuiltByBitApi.ApiClient ??
  (BuiltByBitApi as unknown as { default: { ApiClient: typeof BuiltByBitApi.ApiClient } }).default?.ApiClient
const ResourcesCreatorApi =
  BuiltByBitApi.ResourcesCreatorApi ??
  (BuiltByBitApi as unknown as { default: { ResourcesCreatorApi: typeof BuiltByBitApi.ResourcesCreatorApi } }).default
    ?.ResourcesCreatorApi

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

function createWrapper(apiKey: string): InstanceType<typeof Wrapper> {
  const wrapper = new Wrapper()
  const token = new Token(TokenType.PRIVATE, apiKey)
  wrapper.init(token, false)
  return wrapper
}

function createV2CreatorApi(apiKey: string): BuiltByBitApi.ResourcesCreatorApi {
  const client = new ApiClient()
  const token = client.authentications.token
  token.apiKey = apiKey
  token.apiKeyPrefix = 'Private'
  client.defaultHeaders['Authorization'] = `Private ${apiKey}`
  return new ResourcesCreatorApi(client)
}

function promisifyApi<T>(
  fn: (cb: (error: Error | null, data: T, response: unknown) => void) => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    fn((error, data) => {
      if (error) reject(error)
      else resolve(data)
    })
  })
}

async function execute<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const res = await fn()
    return camelizeDeep<T>(res)
  } catch (err: unknown) {
    if (err instanceof BBBError) throw err
    if (err && typeof err === 'object') {
      const response = (
        err as {
          response?: {
            status?: number
            body?: { error?: { message?: string } }
            data?: { error?: { message?: string } }
            text?: string
          }
        }
      ).response
      if (response) {
        let message =
          response.body?.error?.message ??
          response.data?.error?.message ??
          'BuiltByBit API error'
        if (message === 'BuiltByBit API error' && response.text) {
          try {
            const parsed = JSON.parse(response.text) as { error?: { message?: string } }
            if (parsed.error?.message) message = parsed.error.message
          } catch {
            /* ignore */
          }
        }
        throw new BBBError(message, response.status ?? 500)
      }
      const message = (err as { message?: string }).message
      if (message) throw new BBBError(message)
    }
    throw new BBBError('BuiltByBit request failed')
  }
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
      const api = createV2CreatorApi(apiKey)
      const res = await promisifyApi<{ data?: { resources?: BBBResource[] } }>((cb) =>
        api.getV2ResourcesCreatorResources(
          resourceIds && resourceIds.length ? { resourceIds } : {},
          cb
        )
      )
      return res?.data?.resources ?? []
    })
  },

  async getAddons(apiKey: string, resourceIds?: number[]): Promise<BBBAddon[]> {
    return execute(async () => {
      const api = createV2CreatorApi(apiKey)
      const res = await promisifyApi<{ data?: { addons?: BBBAddon[] } }>((cb) =>
        api.getV2ResourcesCreatorAddons(
          resourceIds && resourceIds.length ? { resourceIds } : {},
          cb
        )
      )
      return res?.data?.addons ?? []
    })
  },

  async getVersions(apiKey: string, resourceIds?: number[]): Promise<BBBVersion[]> {
    return execute(async () => {
      const api = createV2CreatorApi(apiKey)
      const res = await promisifyApi<{ data?: { versions?: BBBVersion[] } }>((cb) =>
        api.getV2ResourcesCreatorVersions(
          resourceIds && resourceIds.length ? { resourceIds } : {},
          cb
        )
      )
      return res?.data?.versions ?? []
    })
  },

  async getUpdates(apiKey: string, resourceIds?: number[]): Promise<BBBUpdate[]> {
    return execute(async () => {
      const api = createV2CreatorApi(apiKey)
      const res = await promisifyApi<{ data?: { updates?: BBBUpdate[] } }>((cb) =>
        api.getV2ResourcesCreatorUpdates(
          resourceIds && resourceIds.length ? { resourceIds } : {},
          cb
        )
      )
      return res?.data?.updates ?? []
    })
  },

  async getPurchases(apiKey: string, resourceIds?: number[]): Promise<BBBPurchase[]> {
    return execute(async () => {
      const api = createV2CreatorApi(apiKey)
      const res = await promisifyApi<{ data?: { purchases?: BBBPurchase[] } }>((cb) =>
        api.getV2ResourcesCreatorPurchases(
          resourceIds && resourceIds.length ? { resourceIds } : {},
          cb
        )
      )
      return res?.data?.purchases ?? []
    })
  },

  async getLicenses(apiKey: string, resourceIds?: number[]): Promise<BBBLicense[]> {
    return execute(async () => {
      const api = createV2CreatorApi(apiKey)
      const res = await promisifyApi<{ data?: { licenses?: BBBLicense[] } }>((cb) =>
        api.getV2ResourcesCreatorLicenses(
          resourceIds && resourceIds.length ? { resourceIds } : {},
          cb
        )
      )
      return res?.data?.licenses ?? []
    })
  },

  async getReviews(apiKey: string, resourceIds?: number[]): Promise<BBBReview[]> {
    return execute(async () => {
      const api = createV2CreatorApi(apiKey)
      const res = await promisifyApi<{ data?: { reviews?: BBBReview[] } }>((cb) =>
        api.getV2ResourcesCreatorReviews(
          resourceIds && resourceIds.length ? { resourceIds } : {},
          cb
        )
      )
      return res?.data?.reviews ?? []
    })
  },

  async postResourceUpdate(
    apiKey: string,
    payload: PostResourceUpdatePayload
  ): Promise<unknown> {
    return execute(async () => {
      const api = createV2CreatorApi(apiKey)
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
      return promisifyApi((cb) =>
        api.postV2ResourcesCreatorUpdate(
          { postV2ResourcesCreatorUpdateRequest: body },
          cb
        )
      )
    })
  },

  async postAddonUpdate(apiKey: string, payload: PostAddonUpdatePayload): Promise<unknown> {
    return execute(async () => {
      const api = createV2CreatorApi(apiKey)
      const body = {
        addon_id: payload.addonId,
        version_name: payload.versionName,
        file: { name: payload.file.name, data: payload.file.data }
      }
      return promisifyApi((cb) =>
        api.postV2ResourcesCreatorAddonsUpdate(
          { postV2ResourcesCreatorAddonsUpdateRequest: body },
          cb
        )
      )
    })
  }
}
