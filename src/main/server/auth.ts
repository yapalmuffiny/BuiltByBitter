import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer, genericOAuth } from 'better-auth/plugins'
import { db } from '../db'
import { schema } from '../db/schema'
import { getOAuthCreds } from './keystore'

export interface AuthConfigFlags {
  bbbConfigured: boolean
  discordConfigured: boolean
}

function serverBaseUrl(): string {
  const port = process.env.AUTH_PORT ?? '8788'
  return `http://localhost:${port}`
}

interface OAuthUserInfo {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string
  [key: string]: unknown
}

// Identity lookup for the BBB generic OAuth provider. BBB's OAuth scopes/userinfo
// aren't publicly documented, so we defensively fetch the member "self" endpoint
// with the access token and synthesise a stable email if none is returned.
async function bbbGetUserInfo(tokens: { accessToken?: string }): Promise<OAuthUserInfo | null> {
  const accessToken = tokens.accessToken
  if (!accessToken) return null
  // OAuth tokens only work against v2 members/self (v1 is privilege-restricted).
  // The member object is nested under data.self.
  try {
    const res = await fetch('https://api.builtbybit.com/v2/members/self', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { self?: Record<string, unknown> } }
    const m = json.data?.self ?? {}
    const memberId = (m.user_id ?? m.userId ?? 'unknown') as string | number
    const username = (m.username as string) ?? `member-${memberId}`
    const avatar = (m.avatar_url_medium ??
      m.avatar_url_large ??
      m.avatar_url_small ??
      m.avatar_url) as string | undefined
    const email = (m.email as string) ?? `bbb-${memberId}@builtbybit.local`
    return {
      id: String(memberId),
      name: username,
      email,
      emailVerified: true,
      image: avatar
    }
  } catch {
    return null
  }
}

export function createAuth() {
  // Prefer user-supplied credentials from the keychain (public-app flow); fall
  // back to .env for local development. The `.env.example` placeholder contains
  // "xxxx", so env creds are only trusted when they've actually been filled in.
  const stored = getOAuthCreds()
  let bbbClientId: string | undefined
  let bbbClientSecret: string | undefined
  if (stored) {
    bbbClientId = stored.clientId.trim()
    bbbClientSecret = stored.clientSecret.trim()
  } else {
    const envId = process.env.BBB_OAUTH_CLIENT_ID?.trim()
    const envSecret = process.env.BBB_OAUTH_CLIENT_SECRET?.trim()
    if (envId && envSecret && !envId.includes('xxxx')) {
      bbbClientId = envId
      bbbClientSecret = envSecret
    }
  }
  const bbbConfigured = Boolean(bbbClientId && bbbClientSecret)

  const discordClientId = process.env.DISCORD_CLIENT_ID?.trim()
  const discordClientSecret = process.env.DISCORD_CLIENT_SECRET?.trim()
  const discordConfigured = Boolean(discordClientId && discordClientSecret)

  // BBB rejects the authorize request ("must request at least one scope") unless
  // a scope is sent, and `members.self` is the ONLY OAuth2-allowed scope, so it's
  // the default. (The env var only exists to override it in dev.)
  const bbbScopes = (process.env.BBB_OAUTH_SCOPES ?? 'members.self')
    .split(/[ ,]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const genericProviders = bbbConfigured
    ? [
        {
          providerId: 'builtbybit',
          clientId: bbbClientId!,
          clientSecret: bbbClientSecret!,
          authorizationUrl: 'https://builtbybit.com/account/external/authorize',
          tokenUrl: 'https://api.builtbybit.com/oauth2/token',
          // BBB wants HTTP Basic client auth with the RAW secret. better-auth's
          // built-in basic auth form-url-encodes credentials (RFC 6749 §2.3.1),
          // turning the "/" in the secret into %2F, which BBB rejects. So set a
          // raw Basic header ourselves.
          tokenEndpointAuth: {
            method: 'custom' as const,
            customizeRequest: async ({ headers }: { headers: Record<string, string> }) => {
              const raw = `${bbbClientId}:${bbbClientSecret}`
              headers.authorization = `Basic ${Buffer.from(raw).toString('base64')}`
            }
          },
          scopes: bbbScopes.length ? bbbScopes : ['members.self'],
          pkce: false,
          overrideUserInfo: true,
          getUserInfo: bbbGetUserInfo
        }
      ]
    : []

  const auth = betterAuth({
    baseURL: serverBaseUrl(),
    basePath: '/api/auth',
    secret: process.env.BETTER_AUTH_SECRET ?? 'dev-insecure-secret-change-me',
    trustedOrigins: [
      serverBaseUrl(),
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'app://.'
    ],
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    emailAndPassword: { enabled: false },
    socialProviders: discordConfigured
      ? { discord: { clientId: discordClientId!, clientSecret: discordClientSecret! } }
      : {},
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24
    },
    plugins: [bearer(), genericOAuth({ config: genericProviders })]
  })

  return { auth, flags: { bbbConfigured, discordConfigured } }
}
