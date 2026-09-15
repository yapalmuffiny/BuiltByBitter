import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  bigint,
  jsonb
} from 'drizzle-orm/pg-core'

// ── BetterAuth core tables (field/column names must match BetterAuth) ────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updatedAt')
    .$defaultFn(() => new Date())
    .notNull()
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull()
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').$defaultFn(() => new Date()),
  updatedAt: timestamp('updatedAt').$defaultFn(() => new Date())
})

// ── App tables ───────────────────────────────────────────────────────────────

export const bbbConnection = pgTable('bbb_connection', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  memberId: integer('member_id'),
  username: text('username'),
  avatarUrl: text('avatar_url'),
  keyValid: boolean('key_valid').notNull().default(false),
  connectedAt: timestamp('connected_at')
    .$defaultFn(() => new Date())
    .notNull()
})

export const changelogTemplate = pgTable('changelog_template', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fields: jsonb('fields').notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull()
})

export const updatePost = pgTable('update_post', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // 'resource' | 'addon'
  targetId: integer('target_id').notNull(),
  targetTitle: text('target_title'),
  versionName: text('version_name').notNull(),
  message: text('message'),
  fileName: text('file_name').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  status: text('status').notNull(), // 'success' | 'error' | 'dry-run'
  error: text('error'),
  dryRun: boolean('dry_run').notNull().default(false),
  postedAt: timestamp('posted_at')
    .$defaultFn(() => new Date())
    .notNull()
})

export const schema = {
  user,
  session,
  account,
  verification,
  bbbConnection,
  changelogTemplate,
  updatePost
}
