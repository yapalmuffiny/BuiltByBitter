import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' })
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
    .$defaultFn(() => new Date())
    .notNull()
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull()
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).$defaultFn(() => new Date())
})

export const bbbConnection = sqliteTable('bbb_connection', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  memberId: integer('member_id'),
  username: text('username'),
  avatarUrl: text('avatar_url'),
  keyValid: integer('key_valid', { mode: 'boolean' }).notNull().default(false),
  connectedAt: integer('connected_at', { mode: 'timestamp_ms' })
    .$defaultFn(() => new Date())
    .notNull()
})

export const changelogTemplate = sqliteTable('changelog_template', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fields: text('fields', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .$defaultFn(() => new Date())
    .notNull()
})

export const updatePost = sqliteTable('update_post', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  targetId: integer('target_id').notNull(),
  targetTitle: text('target_title'),
  versionName: text('version_name').notNull(),
  message: text('message'),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  status: text('status').notNull(),
  error: text('error'),
  dryRun: integer('dry_run', { mode: 'boolean' }).notNull().default(false),
  postedAt: integer('posted_at', { mode: 'timestamp_ms' })
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
