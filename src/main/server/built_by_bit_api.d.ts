declare module 'built_by_bit_api' {
  export class ApiClient {
    basePath: string
    authentications: {
      token: {
        type: string
        in: string
        name: string
        apiKey?: string
        apiKeyPrefix?: string
      }
      oauth2: {
        type: string
        accessToken?: string
      }
    }
    defaultHeaders: Record<string, string>
    timeout: number
    constructor(basePath?: string)
  }

  export type ApiCallback<T = any> = (error: Error | null, data: T, response: unknown) => void

  export class ResourcesCreatorApi {
    constructor(apiClient?: ApiClient)
    getV2ResourcesCreatorResources(
      opts: { resourceIds?: number[] },
      callback: ApiCallback
    ): unknown
    getV2ResourcesCreatorAddons(
      opts: { resourceIds?: number[] },
      callback: ApiCallback
    ): unknown
    getV2ResourcesCreatorVersions(
      opts: { resourceIds?: number[] },
      callback: ApiCallback
    ): unknown
    getV2ResourcesCreatorUpdates(
      opts: { resourceIds?: number[] },
      callback: ApiCallback
    ): unknown
    getV2ResourcesCreatorPurchases(
      opts: { resourceIds?: number[] },
      callback: ApiCallback
    ): unknown
    getV2ResourcesCreatorLicenses(
      opts: { resourceIds?: number[] },
      callback: ApiCallback
    ): unknown
    getV2ResourcesCreatorReviews(
      opts: { resourceIds?: number[] },
      callback: ApiCallback
    ): unknown
    postV2ResourcesCreatorUpdate(
      opts: { postV2ResourcesCreatorUpdateRequest?: unknown },
      callback: ApiCallback
    ): unknown
    postV2ResourcesCreatorAddonsUpdate(
      opts: { postV2ResourcesCreatorAddonsUpdateRequest?: unknown },
      callback: ApiCallback
    ): unknown
  }

  export namespace BuiltByBitApi {
    export type ApiClient = import('built_by_bit_api').ApiClient
    export type ResourcesCreatorApi = import('built_by_bit_api').ResourcesCreatorApi
  }

  const BuiltByBitApi: {
    ApiClient: typeof ApiClient
    ResourcesCreatorApi: typeof ResourcesCreatorApi
    [key: string]: unknown
  }

  export default BuiltByBitApi
}
