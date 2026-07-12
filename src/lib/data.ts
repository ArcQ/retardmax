import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from './db/db';
import { groupMembers, groups, pins, postGroups, posts, users } from './db/schema';
import { utcDate } from './utils';

export type FeedPost = {
  id: string; body: string; visibility: 'private' | 'public'; postedOn: string; createdAt: Date;
  imageKey: string | null; authorId: string; handle: string; email: string; avatarUrl: string | null;
  xHandle: string | null; streakCount: number; wCount: number; boostCount: number; dailyScore: number; voted: boolean;
};

const counts = (date: string) => ({
  wCount: sql<number>`(select count(*) from votes v where v.post_id = posts.id)`,
  boostCount: sql<number>`(select count(*) from boosts b where b.post_id = posts.id)`,
  dailyScore: sql<number>`((select count(*) from votes v where v.post_id = posts.id and date(v.created_at / 1000, 'unixepoch') = ${date}) + 5 * (select count(*) from boosts b where b.post_id = posts.id and date(b.created_at / 1000, 'unixepoch') = ${date}))`,
});

export async function feedPosts(database: D1Database, options: { date?: string; publicOnly?: boolean; userId?: string; limit?: number; groupId?: string; postId?: string; authorId?: string } = {}) {
  const date = options.date ?? utcDate();
  const d = db(database);
  const conditions = [options.publicOnly ? eq(posts.visibility, 'public') : undefined, options.date ? eq(posts.postedOn, date) : undefined, options.postId ? eq(posts.id, options.postId) : undefined, options.authorId ? eq(posts.userId, options.authorId) : undefined].filter(Boolean) as any[];
  if (options.groupId) {
    const ids = await d.select({ postId: postGroups.postId }).from(postGroups).where(eq(postGroups.groupId, options.groupId)).all();
    if (!ids.length) return [] as FeedPost[];
    conditions.push(inArray(posts.id, ids.map((x) => x.postId)));
  }
  const dailyScore = counts(date).dailyScore;
  const rows = await d.select({
    id: posts.id, body: posts.body, visibility: posts.visibility, postedOn: posts.postedOn, createdAt: posts.createdAt, imageKey: posts.imageKey,
    authorId: users.id, handle: users.handle, email: users.email, avatarUrl: users.avatarUrl, xHandle: users.xHandle, streakCount: users.streakCount,
    ...counts(date), voted: options.userId ? sql<number>`case when exists (select 1 from votes uv where uv.post_id = posts.id and uv.user_id = ${options.userId}) then 1 else 0 end` : sql<number>`0`,
  }).from(posts).innerJoin(users, eq(posts.userId, users.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(dailyScore), asc(posts.createdAt)).limit(options.limit ?? 100).all();
  return rows.map((row) => ({ ...row, wCount: Number(row.wCount ?? 0), boostCount: Number(row.boostCount ?? 0), dailyScore: Number(row.dailyScore ?? 0), voted: Boolean(row.voted) })) as FeedPost[];
}

export async function topToday(database: D1Database, userId?: string) {
  const date = utcDate();
  const all = await feedPosts(database, { date, publicOnly: true, userId, limit: 100 });
  const pinned = await db(database).select({ postId: pins.postId }).from(pins).where(eq(pins.pinnedOn, date)).limit(3).all();
  const pinnedIds = new Set(pinned.map((p) => p.postId));
  const forced = pinned.map(({ postId }) => all.find((p) => p.id === postId)).filter(Boolean) as FeedPost[];
  return [...forced, ...all.filter((p) => !pinnedIds.has(p.id))].slice(0, 10);
}

export async function groupForUser(database: D1Database, groupId: string, userId: string) {
  return db(database).select({ id: groups.id, name: groups.name, inviteCode: groups.inviteCode, creatorUserId: groups.creatorUserId, createdAt: groups.createdAt }).from(groups).innerJoin(groupMembers, eq(groups.id, groupMembers.groupId)).where(and(eq(groups.id, groupId), eq(groupMembers.userId, userId))).get();
}

export async function userGroups(database: D1Database, userId: string) {
  return db(database).select({ id: groups.id, name: groups.name, inviteCode: groups.inviteCode, creatorUserId: groups.creatorUserId }).from(groups).innerJoin(groupMembers, eq(groups.id, groupMembers.groupId)).where(eq(groupMembers.userId, userId)).orderBy(desc(groups.createdAt)).all();
}
