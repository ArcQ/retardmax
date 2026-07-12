import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { posts, reports } from '@/lib/db/schema';
import { requireUser } from '@/lib/server';
import { error, json, ulid } from '@/lib/utils';
import { getEnv } from '@/lib/env';

export const POST: APIRoute = async (context) => {
  const user = requireUser(context); const id = context.params.id!; const d = db(getEnv(context.locals).DB); const post = await d.select().from(posts).where(eq(posts.id, id)).get(); if (!post) return error('Post not found.', 404);
  const input = context.request.headers.get('content-type')?.includes('json') ? await context.request.json() as { reason?: string } : Object.fromEntries(await (await context.request.formData()).entries()) as { reason?: string };
  await d.insert(reports).values({ id: ulid(), postId: id, reporterUserId: user.id, reason: String(input.reason ?? 'No reason provided').slice(0, 500) }); return json({ ok: true });
};
