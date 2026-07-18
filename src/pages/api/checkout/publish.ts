import type { APIRoute } from 'astro';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { posts, users } from '@/lib/db/schema';
import { grantDueDailyCredits } from '@/lib/credits';
import { requireUser } from '@/lib/server';
import { error, json, utcDate } from '@/lib/utils';
import { getEnv } from '@/lib/env';

/** Kept at the old URL so existing clients now spend one post credit instead of opening a $1 checkout. */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context); const env = getEnv(context.locals); const body = await context.request.json() as { postId?: string };
  if (!body.postId) return error('Post required.');
  await grantDueDailyCredits(env.DB, user.id);
  const d = db(env.DB); const post = await d.select().from(posts).where(and(eq(posts.id, body.postId), eq(posts.userId, user.id), eq(posts.postedOn, utcDate()), eq(posts.visibility, 'private'))).get();
  if (!post) return error('Only your private post from today can be published.', 404);
  const spent = await d.update(users).set({ postCredits: sql`${users.postCredits} - 1` }).where(and(eq(users.id, user.id), gt(users.postCredits, 0))).run();
  if (!spent.meta.changes) return error('You need a post credit. Load up first.', 402);
  await d.update(posts).set({ visibility: 'public' }).where(eq(posts.id, post.id));
  return json({ ok: true, redirect: `/p/${post.id}?published=1` });
};
