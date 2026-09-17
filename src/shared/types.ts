export interface Price {
  currency?: string
  value?: number
  amount?: number
  formatted?: string
}

export interface BBBMember {
  memberId?: number
  username?: string
  avatarUrl?: string
  banned?: boolean
  suspended?: boolean
  restricted?: boolean
}

export interface BBBVersionSummary {
  versionId?: number
  resourceId?: number
  name?: string
  releaseDate?: number
  downloadCount?: number
}

export interface BBBUpdateSummary {
  updateId?: number
  resourceId?: number
  title?: string
  message?: string
  postDate?: number
}

export interface BBBResource {
  resourceId: number
  title?: string
  summary?: string
  url?: string
  listPrice?: Price
  finalPrice?: Price
  purchases?: number
  downloads?: number
  purchaseCount?: number
  downloadCount?: number
  creatorId?: number
  categoryId?: number
  reviewCount?: number
  reviewAverage?: number
  price?: number
  currency?: string
  description?: unknown
  category?: unknown
  creator?: BBBMember
  publishedAt?: number
  lastUpdatedAt?: number
  latestVersion?: BBBVersionSummary
  latestUpdate?: BBBUpdateSummary
  coverImageUrl?: string
  carouselImageUrls?: string[]
  addons?: Record<string, BBBAddon>
}

export type AddonState = 'visible' | 'disabled' | string

export interface BBBAddon {
  addonId: number
  resourceId: number
  title?: string
  description?: string
  type?: string
  state?: AddonState
  displayOrder?: number
  default?: boolean
  listPrice?: Price
  finalPrice?: Price
}

export interface BBBVersion {
  versionId?: number
  resourceId?: number
  name?: string
  releaseDate?: number
  downloadCount?: number
  updateId?: number
}

export interface BBBUpdate {
  updateId?: number
  resourceId?: number
  title?: string
  message?: string
  postDate?: number
  createdAt?: number
  likeCount?: number
}

export interface BBBVersionFull {
  versionId?: number
  resourceId?: number
  versionString?: string
  createdAt?: number
  downloadCount?: number
  reviewAverage?: number
  reviewCount?: number
  updateId?: number
}

export interface BBBMemberFull {
  memberId?: number
  username?: string
  joinDate?: number
  lastActivityDate?: number | null
  banned?: boolean
  suspended?: boolean
  restricted?: boolean
  disabled?: boolean
  premium?: boolean
  supreme?: boolean
  ultimate?: boolean
  discordId?: string | number
  avatarUrl?: string
  postCount?: number
  resourceCount?: number
  purchaseCount?: number
  feedbackPositive?: number
  feedbackNeutral?: number
  feedbackNegative?: number
}

export type MemberLookupType = 'self' | 'id' | 'username' | 'discord'

export interface BBBPurchase {
  purchaseId?: number
  resourceId?: number
  purchaserId?: number
  renewal?: boolean
  price?: Price
  validated?: number
  [key: string]: unknown
}

export interface BBBLicense {
  licenseId?: number
  resourceId?: number
  purchaserId?: number
  startDate?: number
  endDate?: number
  active?: boolean
  [key: string]: unknown
}

export interface BBBReview {
  reviewId?: number
  resourceId?: number
  authorId?: number
  rating?: number
  message?: string
  responseMessage?: string
  createdAt?: number
  [key: string]: unknown
}

export interface ChangelogSection {
  id: string
  heading: string
  headingColor: string
  headingSize: number
  items: string[]
}

export interface ChangelogFields {
  intro: string
  sections: ChangelogSection[]
  closing: string
  closingColor: string
  signatureName: string
  signatureStudio: string
}

export interface ChangelogTemplate {
  id: string
  name: string
  fields: ChangelogFields
  updatedAt: number
}

export interface FilePayload {
  name: string
  data: string
  size: number
}

export interface PostResourceUpdatePayload {
  resourceId: number
  versionName: string
  file: FilePayload
  update?: {
    post: boolean
    title?: string
    message: string
  }
  dryRun?: boolean
}

export interface PostAddonUpdatePayload {
  addonId: number
  versionName: string
  file: FilePayload
  dryRun?: boolean
}

export interface UpdatePostRecord {
  id: string
  kind: 'resource' | 'addon'
  targetId: number
  targetTitle: string | null
  versionName: string
  message: string | null
  fileName: string
  fileSize: number
  status: 'success' | 'error' | 'dry-run'
  error: string | null
  dryRun: boolean
  postedAt: number
}

export interface BBBConnection {
  connected: boolean
  keyValid: boolean
  member?: BBBMember
  connectedAt?: number
}

export interface SessionUser {
  id: string
  name: string
  email: string | null
  image: string | null
  provider: string | null
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number }

export interface AppRuntimeInfo {
  serverUrl: string
  authPort: number
  bbbOAuthConfigured: boolean
  discordConfigured: boolean
  platform: string
  version: string
}

export interface OAuthConfigStatus {
  configured: boolean
  clientId: string | null
  source: 'keystore' | 'env' | null
}
