import type { APIRoute } from 'astro';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { posts, votes } from '@/lib/db/schema';
import { requireUser } from '@/lib/server';
import { error, json, utcDate } from '@/lib/utils';
import { getEnv } from '@/lib/env';
import { capture } from '@/lib/analytics';

export const POST: APIRoute = async (context) => {
  const user = requireUser(context); const id = context.params.id!; const d = db(getEnv(context.locals).DB);
  const post = await d.select().from(posts).where(eq(posts.id, id)).get(); if (!post || post.visibility !== 'public') return error('Only public posts can collect Ws.', 404); if (post.userId === user.id) return error('You cannot W your own post.');
  const since = new Date(`${utcDate()}T00:00:00.000Z`); const todayVotes = await d.select({ count: sql<number>`count(*)` }).from(votes).where(and(eq(votes.userId, user.id), gte(votes.createdAt, since))).get(); if (Number(todayVotes?.count ?? 0) >= 100) return error('Daily W limit reached.', 429);
  const prior = await d.select().from(votes).where(and(eq(votes.userId, user.id), eq(votes.postId, id))).get();
  if (prior) await d.delete(votes).where(and(eq(votes.userId, user.id), eq(votes.postId, id))); else await d.insert(votes).values({ userId: user.id, postId: id });
  capture(getEnv(context.locals), 'w_given', user.id, { post_id: id, given: !prior });
  return json({ voted: !prior });
};
