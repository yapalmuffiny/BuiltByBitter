// Shared types across main / preload / renderer.
// BBB shapes mirror the built_by_bit_api v2 SDK models. Nested objects that the
// UI doesn't need are kept permissive on purpose.

export interface Price {
  currency?: string
  value?: number
  // Some endpoints spell the amount differently; keep both readable.
  amount?: number
  // BBB provides a pre-formatted string, e.g. "$11.99".
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
  // BBB's actual field names on the creator resources endpoint:
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

// ── Member (v1) ──────────────────────────────────────────────────────────────

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
  // discord_id exceeds JS safe-integer range, so it's carried as a string.
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

// ── Purchases / licenses / reviews ───────────────────────────────────────────

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

// ── The field-based "singular format" changelog ────────────────────────────

export interface ChangelogSection {
  id: string
  heading: string
  headingColor: string // rgb(...) string used in [COLOR=...]
  headingSize: number // BBCode [SIZE=n]
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

// ── Post payloads (renderer → local server → BBB) ───────────────────────────

export interface FilePayload {
  name: string
  /** base64-encoded file bytes (no data: prefix) */
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
    message: string // BBCode
  }
  dryRun?: boolean
}

export interface PostAddonUpdatePayload {
  addonId: number
  versionName: string
  file: FilePayload
  dryRun?: boolean
}

// ── History / audit ─────────────────────────────────────────────────────────

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

// ── Connection / identity ────────────────────────────────────────────────────

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

// ── Generic API envelope ─────────────────────────────────────────────────────

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number }

export interface AppRuntimeInfo {
  serverUrl: string
  authPort: number
  bbbOAuthConfigured: boolean
  discordConfigured: boolean
  platform: string
  version: string
}
