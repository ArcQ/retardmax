import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { posts } from '@/lib/db/schema';
import { requireUser } from '@/lib/server';
import { error, json } from '@/lib/utils';
import { getEnv } from '@/lib/env';

export const PATCH: APIRoute = async (context) => {
  const user = requireUser(context); const id = context.params.id!; const payload = await context.request.json() as { body?: string };
  const body = String(payload.body ?? '').trim(); if (!body || body.length > 280) return error('Write 1–280 characters.');
  const post = await db(getEnv(context.locals).DB).select().from(posts).where(and(eq(posts.id, id), eq(posts.userId, user.id))).get();
  if (!post) return error('Post not found.', 404);
  if (Date.now() - post.createdAt.getTime() > 10 * 60 * 1000) return error('The 10-minute edit window is closed.', 403);
  await db(getEnv(context.locals).DB).update(posts).set({ body }).where(eq(posts.id, id)); return json({ ok: true });
};
