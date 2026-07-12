import { integer, primaryKey, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const now = sql`(unixepoch() * 1000)`;

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  googleId: text('google_id').unique(),
  email: text('email').notNull(),
  handle: text('handle').notNull().unique(),
  xHandle: text('x_handle'),
  avatarUrl: text('avatar_url'),
  streakCount: integer('streak_count').notNull().default(0),
  lastPostedOn: text('last_posted_on'),
  isBanned: integer('is_banned', { mode: 'boolean' }).notNull().default(false),
  postCredits: integer('post_credits').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
});

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  imageKey: text('image_key'),
  visibility: text('visibility', { enum: ['private', 'public'] }).notNull().default('private'),
  postedOn: text('posted_on').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
}, (table) => ({
  userDate: uniqueIndex('posts_user_posted_on').on(table.userId, table.postedOn),
  visibilityDate: index('posts_visibility_posted_on').on(table.visibility, table.postedOn),
}));

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: text('post_id').references(() => posts.id, { onDelete: 'set null' }),
  kind: text('kind', { enum: ['publish', 'boost'] }).notNull(),
  stripeSessionId: text('stripe_session_id').unique(),
  amountCents: integer('amount_cents').notNull().default(100),
  status: text('status', { enum: ['pending', 'paid'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
});

export const votes = sqliteTable('votes', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
}, (table) => ({ pk: primaryKey({ columns: [table.userId, table.postId] }), date: index('votes_created_at').on(table.createdAt) }));

export const boosts = sqliteTable('boosts', {
  id: text('id').primaryKey(),
  payerUserId: text('payer_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
});

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  creatorUserId: text('creator_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
});

export const groupMembers = sqliteTable('group_members', {
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: integer('joined_at', { mode: 'timestamp_ms' }).notNull().default(now),
}, (table) => ({ pk: primaryKey({ columns: [table.groupId, table.userId] }) }));

export const postGroups = sqliteTable('post_groups', {
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
}, (table) => ({ pk: primaryKey({ columns: [table.postId, table.groupId] }) }));

export const pins = sqliteTable('pins', {
  postId: text('post_id').primaryKey().references(() => posts.id, { onDelete: 'cascade' }),
  pinnedOn: text('pinned_on').notNull(),
  pinnedBy: text('pinned_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  reporterUserId: text('reporter_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
});

export type Post = typeof posts.$inferSelect;
export type UserRow = typeof users.$inferSelect;
