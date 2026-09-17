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

  const pendingOAuth = new Map<string, { token: string | null; user: unknown; at: number }>()

  app.use(
    '/api/*',
    cors({
      origin: (origin) => {
        if (!origin) return origin
        if (
          origin === url ||
          origin === 'http://localhost:5173' ||
          origin === 'http://127.0.0.1:5173' ||
          origin === 'app://.' ||
          origin === 'null' ||
          origin.startsWith('file://')
        ) {
          return origin
        }
        return null
      },
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      maxAge: 600
    })
  )

  app.get('/health', (c) => c.json({ ok: true }))

  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

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
    document.body.innerHTML = '<div style="max-width:420px;text-align:center;padding:24px">' +
      '<div style="font-size:15px;font-weight:600;margin-bottom:8px">Could not start sign-in</div>' +
      '<div style="font-size:13px;color:#9aa4b2">HTTP ' + res.status + (data && data.message ? (' — ' + data.message) : (text ? (' — ' + text.slice(0,200)) : '')) + '</div>' +
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
    const token = extractSessionCookie(c.req.header('cookie') ?? '') ?? session?.session.token ?? null
    if (linkId) pendingOAuth.set(linkId, { token, user, at: Date.now() })
    const payload = JSON.stringify({ token, user })
    const ok = Boolean(token)
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${ok ? 'Signed in' : 'Sign-in failed'}</title>
<style>body{background:#0b0d10;color:#e5e7eb;font-family:-apple-system,system-ui,sans-serif;display:flex;height:100vh;margin:0;align-items:center;justify-content:center;text-align:center}
.card{background:#13171f;border:1px solid #222938;border-radius:14px;padding:28px 36px;max-width:380px}
h1{font-size:17px;margin:0 0 8px;font-weight:600}
p{font-size:13px;color:#9aa4b2;margin:0 0 16px;line-height:1.4}
.badge{display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;background:#1a202c;color:#e5e7eb}
</style></head><body>
<div class="card">
  <h1>${ok ? 'Signed in to BuiltByBitter' : 'Sign-in incomplete'}</h1>
  <p>${ok ? 'You can return to the BuiltByBitter desktop app now.' : 'Something went wrong completing authentication. You can close this tab and try again.'}</p>
  <div class="badge">${ok ? 'Authenticated' : 'Failed'}</div>
</div>
<script>
window.__authPayload = ${payload};
</script></body></html>`
    return c.html(html)
  })

  app.get('/oauth-token', (c) => {
    const linkId = c.req.query('linkId') ?? ''
    const hit = pendingOAuth.get(linkId)
    if (!hit) return c.json({ pending: true }, 404)
    pendingOAuth.delete(linkId)
    return c.json({ token: hit.token, user: hit.user })
  })

  const api = new Hono<AppEnv>()

  api.use('/*', async (c, next) => {
    if (c.req.path.startsWith('/api/auth')) return next()
    const session = (await auth.api.getSession({ headers: c.req.raw.headers })) as SessionResult
    if (!session?.user?.id) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    c.set('userId', session.user.id)
    return next()
  })

  function requireKey(): string {
    const key = getApiKey()
    if (!key) throw new BBBError('No BuiltByBit API key configured. Visit Settings to add one.', 400)
    return key
  }

  function parseIds(val?: string): number[] | undefined {
    if (!val) return undefined
    const list = val
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
    return list.length ? list : undefined
  }

  api.get('/bbb/status', async (c) => {
    const uid = c.get('userId')
    const hasKey = hasApiKey()
    const row = await db.select().from(bbbConnection).where(eq(bbbConnection.userId, uid)).limit(1)
    const conn = row[0]
    const keyValid = Boolean(conn?.keyValid)
    return c.json({
      connected: Boolean(hasKey && keyValid),
      keyValid,
      hasKey,
      member: conn
        ? {
            memberId: conn.memberId ?? undefined,
            username: conn.username ?? undefined,
            avatarUrl: conn.avatarUrl ?? undefined
          }
        : null,
      connectedAt: conn?.connectedAt ? conn.connectedAt.getTime() : null
    })
  })

  api.post('/bbb/connect', async (c) => {
    const uid = c.get('userId')
    const body = (await c.req.json()) as { apiKey?: string }
    const key = body.apiKey?.trim()
    if (!key) return c.json({ error: 'API key required' }, 400)

    try {
      const member = await bbb.getSelf(key)
      setApiKey(key)
      await db.delete(bbbConnection).where(eq(bbbConnection.userId, uid))
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

  const server = await new Promise<ReturnType<typeof serve>>((resolve, reject) => {
    const s = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
      resolve(s)
    })
    s.once('error', (err: NodeJS.ErrnoException) => {
      reject(err)
    })
  })

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
        ;(server as unknown as { closeAllConnections?: () => void }).closeAllConnections?.()
      })
  }
}
