# BuiltByBitter

A native-feeling **macOS** desktop app for BuiltByBit creators. See all your resources and addons
(with cover images), and post a new version by **dragging a file onto a card** — with a field-based
changelog composer that emits your studio's "house style" BBCode.

- **Stack:** Electron + electron-vite, React, Tailwind + shadcn/ui, Lucide icons (dark, macOS-native).
- **Backend:** an embedded Hono server in the Electron main process running **BetterAuth** (login) and
  a session-guarded proxy to the BuiltByBit API. **Postgres** via Drizzle ORM.
- **Auth:** log in with **BuiltByBit OAuth** (Discord optional fallback). OAuth is identity only; your
  **Ultimate API key** does the resource work and is stored encrypted in the macOS Keychain
  (`safeStorage`) — never in Postgres, never in the renderer.

## Prerequisites

- Node 20+ (developed on Node 26) and npm.
- A Postgres database (set `DATABASE_URL`). `docker-compose.yml` provides one, or point at your own.
- A BuiltByBit **OAuth application** (client id/secret) and your **Ultimate API key**.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
```

Edit `.env`:

- `DATABASE_URL` — your Postgres connection string.
- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`.
- `BBB_OAUTH_CLIENT_ID` / `BBB_OAUTH_CLIENT_SECRET` — from your BBB OAuth app.
- `BBB_OAUTH_SCOPES=members.self` — the only OAuth2-allowed scope on BBB (identity for login).
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — optional fallback login.

In your **BuiltByBit OAuth application**, register this redirect URI **exactly**:

```
http://localhost:8788/api/auth/callback/builtbybit
```

Create the tables:

```bash
npm run db:generate   # writes drizzle/*.sql from the schema
npm run db:push       # (interactive) — or apply drizzle/*.sql to your DB
```

## Run

```bash
npm run dev     # electron-vite dev
# or a production-style run:
npm run build && npx electron .
```

1. **Log in** — "Login with BuiltByBit" opens your system browser (reusing your BBB login) and the app
   completes automatically.
2. **Connect** — Settings → paste your Ultimate API key (validated, then Keychain-stored).
3. **Resources** — your catalog loads with cover images.
4. **Post an update** — drag a file onto a resource card, fill the changelog fields, preview the BBCode,
   then **Save dry run** (safe) or turn off Dry run and **confirm** to publish a live version.

## Notes

- BBB OAuth only grants `members.self` (identity). All resource/update operations require the API key.
- Addons accept a version file but **no changelog message** via the API (the composer notes this).
- Posting a live version creates a public version and notifies buyers — it's gated behind a dry-run
  preview and an explicit confirm.
- `.env` is gitignored. Never commit real secrets.

## Package (macOS)

```bash
npm run build   # produces a .dmg in dist/ via electron-builder
```
