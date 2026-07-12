import type { APIRoute } from 'astro';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { groupMembers, postGroups, posts, users } from '@/lib/db/schema';
import { requireUser } from '@/lib/server';
import { error, json, ulid, utcDate, yesterday } from '@/lib/utils';
import { getEnv } from '@/lib/env';
import { capture } from '@/lib/analytics';

export const POST: APIRoute = async (context) => {
  const user = requireUser(context); const env = getEnv(context.locals); const form = await context.request.formData();
  const body = String(form.get('body') ?? '').trim();
  if (!body || body.length > 280) return error('Write 1–280 characters.');
  const today = utcDate(); const id = ulid();
  let imageKey: string | null = null;
  const image = form.get('image');
  if (image instanceof File && image.size > 0) {
    if (image.size > 2 * 1024 * 1024) return error('Images must be 2 MB or smaller.');
    const ext = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : image.type === 'image/jpeg' ? 'jpg' : '';
    if (!ext) return error('Use a JPEG, PNG, or WebP image.');
    imageKey = `posts/${id}.${ext}`;
    await env.MEDIA.put(imageKey, await image.arrayBuffer(), { httpMetadata: { contentType: image.type } });
  }
  try {
    const d = db(env.DB);
    const alreadyPosted = await d.select({ id: posts.id }).from(posts).where(and(eq(posts.userId, user.id), eq(posts.postedOn, today))).get();
    if (alreadyPosted) { if (imageKey) await env.MEDIA.delete(imageKey); return error('You already posted today. Your next move is tomorrow.', 409); }
    await d.insert(posts).values({ id, userId: user.id, body, imageKey, visibility: 'private', postedOn: today });
    const existing = await d.select({ streak: users.streakCount, last: users.lastPostedOn }).from(users).where(eq(users.id, user.id)).get();
    const streak = existing?.last === yesterday() ? (existing.streak ?? 0) + 1 : 1;
    await d.update(users).set({ streakCount: streak, lastPostedOn: today }).where(eq(users.id, user.id));
    const groupValues = [...new Set(form.getAll('group_ids[]').map(String).filter(Boolean))];
    if (groupValues.length) {
      const memberships = await d.select({ groupId: groupMembers.groupId }).from(groupMembers).where(and(eq(groupMembers.userId, user.id), inArray(groupMembers.groupId, groupValues))).all();
      if (memberships.length) await d.insert(postGroups).values(memberships.map((m) => ({ postId: id, groupId: m.groupId })));
    }
    capture(env, 'post_created', user.id, { post_id: id, streak });
    return json({ ok: true, postId: id, streak });
  } catch (err) {
    if (imageKey) await env.MEDIA.delete(imageKey);
    if (String(err).toLowerCase().includes('unique') || String(err).toLowerCase().includes('constraint')) return error('You already posted today. Your next move is tomorrow.', 409);
    return error('Could not save that post.', 500);
  }
};
