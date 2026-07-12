import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { groupMembers, postGroups, posts } from '@/lib/db/schema';
import { requireUser } from '@/lib/server';
import { error, json } from '@/lib/utils';
import { getEnv } from '@/lib/env';

export const POST: APIRoute = async (context) => {
  const user = requireUser(context); const id = context.params.id!; const body = await context.request.json() as { groupId?: string }; if (!body.groupId) return error('Choose a group.'); const d = db(getEnv(context.locals).DB);
  const post = await d.select().from(posts).where(and(eq(posts.id, id), eq(posts.userId, user.id))).get(); const member = await d.select().from(groupMembers).where(and(eq(groupMembers.groupId, body.groupId), eq(groupMembers.userId, user.id))).get(); if (!post || !member) return error('Post or group not found.', 404);
  await d.insert(postGroups).values({ postId: id, groupId: body.groupId }).onConflictDoNothing(); return json({ ok: true });
};
