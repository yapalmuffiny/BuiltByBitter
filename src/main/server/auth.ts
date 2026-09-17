import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer, genericOAuth } from 'better-auth/plugins'
import { db } from '../db'
import { schema } from '../db/schema'
import { getOAuthCreds, getOrSetAuthSecret } from './keystore'

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

async function bbbGetUserInfo(tokens: { accessToken?: string }): Promise<OAuthUserInfo | null> {
  const accessToken = tokens.accessToken
  if (!accessToken) return null
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
    secret: getOrSetAuthSecret(),
    trustedOrigins: [
      serverBaseUrl(),
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'app://.',
      'file://',
      'null'
    ],
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    emailAndPassword: { enabled: false },
    socialProviders: discordConfigured
      ? { discord: { clientId: discordClientId!, clientSecret: discordClientSecret! } }
      : {},
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24
    },
    plugins: [bearer(), genericOAuth({ config: genericProviders })]
  })

  return { auth, flags: { bbbConfigured, discordConfigured } }
}
