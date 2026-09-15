import { serve } from '@hono/node-server'
import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { eq, desc, and } from 'drizzle-orm'
import { db } from '../db'
import { bbbConnection, changelogTemplate, updatePost } from '../db/schema'
import { createAuth, type AuthConfigFlags } from './auth'
import { bbb, BBBError } from './bbb'
import { getApiKey, setApiKey, clearApiKey, hasApiKey } from './keystore'
import { defaultChangelogFields } from '@shared/bbcode'
import { cryptoId } from '@shared/bbcode'
import type {
  ChangelogTemplate,
  PostAddonUpdatePayload,
  PostResourceUpdatePayload,
  UpdatePostRecord
} from '@shared/types'

export interface RunningServer {
  url: string
  port: number
  flags: AuthConfigFlags
  stop: () => Promise<void>
}

type SessionResult = { session: { token: string }; user: { id: string; name: string } } | null

type AppEnv = { Variables: { userId: string } }

/** Extract better-auth's session-token cookie value from a Cookie header. */
function extractSessionCookie(cookieHeader: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const name = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (name.endsWith('session_token') && value) return decodeURIComponent(value)
  }
  return null
}

export async function startServer(): Promise<RunningServer> {
  const port = Number(process.env.AUTH_PORT ?? 8788)
  const url = `http://localhost:${port}`
  const { auth, flags } = createAuth()

  const app = new Hono()

  // One-time relay for the external-browser OAuth flow: the browser callback
  // stores the captured session token here keyed by a random linkId, and the
  // Electron app polls /oauth-token to retrieve it. Loopback-only, short TTL.
  const pendingOAuth = new Map<string, { token: string | null; user: unknown; at: number }>()

  app.use(
    '/api/*',
    cors({
      origin: (origin) => origin ?? '*',
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      maxAge: 600
    })
  )

  app.get('/health', (c) => c.json({ ok: true }))

  // ── BetterAuth (session + OAuth) ───────────────────────────────────────────
  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

  // ── OAuth bridge windows (same-origin as the server) ───────────────────────
  app.get('/oauth-start', (c) => {
    const provider = c.req.query('provider') === 'discord' ? 'discord' : 'builtbybit'
    const linkId = c.req.query('linkId') ?? ''
    const callbackURL = `${url}/oauth-complete${linkId ? `?linkId=${encodeURIComponent(linkId)}` : ''}`
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Signing in…</title>
<style>body{background:#0b0d10;color:#e5e7eb;font-family:-apple-system,system-ui,sans-serif;display:flex;height:100vh;margin:0;align-items:center;justify-content:center}</style>
</head><body><div>Redirecting to sign in…</div><script>
(async () => {
  try {
    const provider = ${JSON.stringify(provider)};
    // better-auth 1.7+ routes generic OAuth providers through /sign-in/social.
    const endpoint = '/api/auth/sign-in/social';
    const body = { provider: provider, callbackURL: ${JSON.stringify(callbackURL)} };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) {}
    if (res.ok && data && data.url) { window.location.href = data.url; return; }
    const hint = (res.status >= 500)
      ? 'The local database may be unreachable. Make sure Postgres is running, then try again.'
      : '';
    document.body.innerHTML = '<div style="max-width:420px;text-align:center;padding:24px">' +
      '<div style="font-size:15px;font-weight:600;margin-bottom:8px">Could not start sign-in</div>' +
      '<div style="font-size:13px;color:#9aa4b2">HTTP ' + res.status + (data && data.message ? (' — ' + data.message) : (text ? (' — ' + text.slice(0,200)) : '')) + '</div>' +
      (hint ? '<div style="font-size:12px;color:#e0b978;margin-top:10px">' + hint + '</div>' : '') +
      '</div>';
  } catch (e) {
    document.body.innerHTML = '<div style="padding:24px;text-align:center;font-size:13px;color:#9aa4b2">OAuth start failed: ' + (e && e.message) + '</div>';
  }
})();
</script></body></html>`
    return c.html(html)
  })

  app.get('/oauth-complete', async (c) => {
    const linkId = c.req.query('linkId') ?? ''
    const session = (await auth.api.getSession({ headers: c.req.raw.headers })) as SessionResult
    const user = session?.user ?? null
    // The bearer plugin expects better-auth's own signed session-cookie value
    // (a reconstructed raw token is NOT accepted), so hand back the real cookie.
    const token = extractSessionCookie(c.req.header('cookie') ?? '') ?? session?.session.token ?? null
    if (linkId) pendingOAuth.set(linkId, { token, user, at: Date.now() })
    const payload = JSON.stringify({ token, user })
    const ok = Boolean(token)
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${ok ? 'Signed in' : 'Sign-in failed'}</title>
<style>body{background:#0b0d10;color:#e5e7eb;font-family:-apple-system,system-ui,sans-serif;display:flex;height:100vh;margin:0;align-items:center;justify-content:center;text-align:center}
.card{max-width:360px;padding:28px}.badge{width:54px;height:54px;border-radius:16px;background:${ok ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)'};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:26px}
h1{font-size:17px;margin:0 0 6px}p{font-size:13px;color:#9aa4b2;margin:0}</style>
</head><body><div class="card"><div class="badge">${ok ? '✓' : '⚠︎'}</div>
<h1>${ok ? 'Signed in to BuiltByBitter' : 'Sign-in didn’t complete'}</h1>
<p>${ok ? 'You can close this tab and return to the app.' : 'Please return to the app and try again.'}</p></div>
<script>window.__AUTH_RESULT__ = ${payload};setTimeout(function(){window.close()},1200);</script></body></html>`
    return c.html(html)
  })

  // Polled by the Electron app to retrieve the token captured by the browser
  // callback for its linkId. Single-use; entries expire after 5 minutes.
  app.get('/oauth-token', (c) => {
    const linkId = c.req.query('linkId') ?? ''
    const now = Date.now()
    for (const [k, v] of pendingOAuth) if (now - v.at > 5 * 60 * 1000) pendingOAuth.delete(k)
    const entry = linkId ? pendingOAuth.get(linkId) : undefined
    if (entry) {
      pendingOAuth.delete(linkId)
      return c.json({ token: entry.token, user: entry.user })
    }
    return c.json({ pending: true })
  })

  // ── Session guard for everything under /api (except /api/auth) ─────────────
  async function requireSession(headers: Headers): Promise<SessionResult> {
    return (await auth.api.getSession({ headers })) as SessionResult
  }

  const api = new Hono<AppEnv>()

  api.use('*', async (c, next) => {
    const session = await requireSession(c.req.raw.headers)
    if (!session) return c.json({ error: 'Not authenticated' }, 401)
    c.set('userId', session.user.id)
    await next()
  })

  function requireKey(): string {
    const key = getApiKey()
    if (!key) throw new BBBError('BuiltByBit API key not connected', 400)
    return key
  }

  function parseIds(raw?: string): number[] | undefined {
    if (!raw) return undefined
    const ids = raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n))
    return ids.length ? ids : undefined
  }

  // ── BBB connection ─────────────────────────────────────────────────────────
  api.get('/bbb/status', async (c) => {
    const uid = c.get('userId')
    const rows = await db.select().from(bbbConnection).where(eq(bbbConnection.userId, uid)).limit(1)
    const row = rows[0]
    return c.json({
      connected: hasApiKey(),
      keyValid: row?.keyValid ?? false,
      member: row
        ? { memberId: row.memberId ?? undefined, username: row.username ?? undefined, avatarUrl: row.avatarUrl ?? undefined }
        : undefined,
      connectedAt: row ? row.connectedAt.getTime() : undefined
    })
  })

  api.post('/bbb/connect', async (c) => {
    const uid = c.get('userId')
    const body = (await c.req.json().catch(() => ({}))) as { apiKey?: string }
    const apiKey = body.apiKey?.trim()
    if (!apiKey) return c.json({ error: 'Missing apiKey' }, 400)

    try {
      const member = await bbb.getSelf(apiKey)
      setApiKey(apiKey)
      await db
        .delete(bbbConnection)
        .where(eq(bbbConnection.userId, uid))
      await db.insert(bbbConnection).values({
        id: cryptoId(),
        userId: uid,
        memberId: member.memberId ?? null,
        username: member.username ?? null,
        avatarUrl: member.avatarUrl ?? null,
        keyValid: true,
        connectedAt: new Date()
      })
      await seedDefaultTemplate(uid, member.username ?? '')
      return c.json({ ok: true, member })
    } catch (err) {
      const status = err instanceof BBBError ? err.status : 500
      return c.json({ error: err instanceof Error ? err.message : 'Failed to validate key' }, status as 400)
    }
  })

  api.post('/bbb/disconnect', async (c) => {
    const uid = c.get('userId')
    clearApiKey()
    await db.update(bbbConnection).set({ keyValid: false }).where(eq(bbbConnection.userId, uid))
    return c.json({ ok: true })
  })

  // ── BBB reads ──────────────────────────────────────────────────────────────
  api.get('/bbb/resources', async (c) => {
    const key = requireKey()
    const resources = await bbb.getResources(key, parseIds(c.req.query('resourceIds')))
    return c.json({ resources })
  })
  api.get('/bbb/addons', async (c) => {
    const key = requireKey()
    const addons = await bbb.getAddons(key, parseIds(c.req.query('resourceIds')))
    return c.json({ addons })
  })
  api.get('/bbb/versions', async (c) => {
    const key = requireKey()
    const versions = await bbb.getVersions(key, parseIds(c.req.query('resourceIds')))
    return c.json({ versions })
  })
  api.get('/bbb/updates', async (c) => {
    const key = requireKey()
    const updates = await bbb.getUpdates(key, parseIds(c.req.query('resourceIds')))
    return c.json({ updates })
  })
  api.get('/bbb/purchases', async (c) => {
    const key = requireKey()
    const purchases = await bbb.getPurchases(key, parseIds(c.req.query('resourceIds')))
    return c.json({ purchases })
  })
  api.get('/bbb/licenses', async (c) => {
    const key = requireKey()
    const licenses = await bbb.getLicenses(key, parseIds(c.req.query('resourceIds')))
    return c.json({ licenses })
  })
  api.get('/bbb/reviews', async (c) => {
    const key = requireKey()
    const reviews = await bbb.getReviews(key, parseIds(c.req.query('resourceIds')))
    return c.json({ reviews })
  })

  // ── Member lookup (v1) ───────────────────────────────────────────────────────
  api.get('/bbb/member', async (c) => {
    const key = requireKey()
    const type = (c.req.query('type') ?? 'self') as
      | 'self'
      | 'id'
      | 'username'
      | 'discord'
    const query = c.req.query('q') ?? undefined
    try {
      const member = await bbb.getMember(key, type, query)
      return c.json({ member })
    } catch (err) {
      const status = err instanceof BBBError ? err.status : 500
      return c.json(
        { error: err instanceof Error ? err.message : 'Lookup failed' },
        status as 400
      )
    }
  })

  // ── Post a resource version + changelog ────────────────────────────────────
  api.post('/bbb/post-update', async (c) => {
    const uid = c.get('userId')
    const payload = (await c.req.json()) as PostResourceUpdatePayload
    return handlePost(c, uid, 'resource', payload)
  })

  api.post('/bbb/post-addon-update', async (c) => {
    const uid = c.get('userId')
    const payload = (await c.req.json()) as PostAddonUpdatePayload
    return handlePost(c, uid, 'addon', payload)
  })

  async function handlePost(
    c: Context<AppEnv>,
    uid: string,
    kind: 'resource' | 'addon',
    payload: PostResourceUpdatePayload | PostAddonUpdatePayload
  ): Promise<Response> {
    const dryRun = Boolean(payload.dryRun)
    const targetId =
      kind === 'resource'
        ? (payload as PostResourceUpdatePayload).resourceId
        : (payload as PostAddonUpdatePayload).addonId
    const message =
      kind === 'resource' ? (payload as PostResourceUpdatePayload).update?.message ?? null : null

    const logId = cryptoId()
    const base = {
      id: logId,
      userId: uid,
      kind,
      targetId,
      targetTitle: null as string | null,
      versionName: payload.versionName,
      message,
      fileName: payload.file.name,
      fileSize: payload.file.size,
      dryRun
    }

    if (dryRun) {
      await db.insert(updatePost).values({ ...base, status: 'dry-run', error: null, postedAt: new Date() })
      return c.json({ ok: true, dryRun: true })
    }

    try {
      const key = requireKey()
      if (kind === 'resource') {
        await bbb.postResourceUpdate(key, payload as PostResourceUpdatePayload)
      } else {
        await bbb.postAddonUpdate(key, payload as PostAddonUpdatePayload)
      }
      await db.insert(updatePost).values({ ...base, status: 'success', error: null, postedAt: new Date() })
      return c.json({ ok: true })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Post failed'
      const status = err instanceof BBBError ? err.status : 500
      await db.insert(updatePost).values({ ...base, status: 'error', error: errorMsg, postedAt: new Date() })
      return c.json({ error: errorMsg }, status as 400)
    }
  }

  // ── Templates ────────────────────────────────────────────────────────────────
  api.get('/templates', async (c) => {
    const uid = c.get('userId')
    const rows = await db
      .select()
      .from(changelogTemplate)
      .where(eq(changelogTemplate.userId, uid))
      .orderBy(desc(changelogTemplate.updatedAt))
    const templates: ChangelogTemplate[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      fields: r.fields as ChangelogTemplate['fields'],
      updatedAt: r.updatedAt.getTime()
    }))
    return c.json({ templates })
  })

  api.post('/templates', async (c) => {
    const uid = c.get('userId')
    const t = (await c.req.json()) as ChangelogTemplate
    const id = t.id && t.id.length > 3 ? t.id : cryptoId()
    const existing = await db
      .select()
      .from(changelogTemplate)
      .where(and(eq(changelogTemplate.userId, uid), eq(changelogTemplate.id, id)))
      .limit(1)
    if (existing.length) {
      await db
        .update(changelogTemplate)
        .set({ name: t.name, fields: t.fields, updatedAt: new Date() })
        .where(eq(changelogTemplate.id, id))
    } else {
      await db.insert(changelogTemplate).values({
        id,
        userId: uid,
        name: t.name,
        fields: t.fields,
        updatedAt: new Date()
      })
    }
    return c.json({ ok: true, id })
  })

  api.delete('/templates/:id', async (c) => {
    const uid = c.get('userId')
    const id = c.req.param('id')
    await db
      .delete(changelogTemplate)
      .where(and(eq(changelogTemplate.userId, uid), eq(changelogTemplate.id, id)))
    return c.json({ ok: true })
  })

  // ── History ──────────────────────────────────────────────────────────────────
  api.get('/history', async (c) => {
    const uid = c.get('userId')
    const rows = await db
      .select()
      .from(updatePost)
      .where(eq(updatePost.userId, uid))
      .orderBy(desc(updatePost.postedAt))
      .limit(200)
    const records: UpdatePostRecord[] = rows.map((r) => ({
      id: r.id,
      kind: r.kind as 'resource' | 'addon',
      targetId: r.targetId,
      targetTitle: r.targetTitle,
      versionName: r.versionName,
      message: r.message,
      fileName: r.fileName,
      fileSize: r.fileSize,
      status: r.status as UpdatePostRecord['status'],
      error: r.error,
      dryRun: r.dryRun,
      postedAt: r.postedAt.getTime()
    }))
    return c.json({ records })
  })

  app.route('/api', api)

  async function seedDefaultTemplate(uid: string, username: string): Promise<void> {
    const existing = await db
      .select()
      .from(changelogTemplate)
      .where(eq(changelogTemplate.userId, uid))
      .limit(1)
    if (existing.length) return
    await db.insert(changelogTemplate).values({
      id: cryptoId(),
      userId: uid,
      name: 'House style',
      fields: defaultChangelogFields(username, 'Zero Development'),
      updatedAt: new Date()
    })
  }

  const server = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' })
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[server] Port ${port} is already in use — another BuiltByBitter instance may be running.`
      )
    } else {
      console.error('[server] error:', err)
    }
  })

  return {
    url,
    port,
    flags,
    stop: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
  }
}
