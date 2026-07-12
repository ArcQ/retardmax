import { and, eq, gt } from 'drizzle-orm';
import { db } from './db/db';
import { sessions, users } from './db/schema';
import { ulid } from './utils';

const encode = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
export async function sha256(value: string) {
  return encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}
export function randomToken() {
  return encode(crypto.getRandomValues(new Uint8Array(32)).buffer);
}
export async function sessionCookie(database: D1Database, userId: string) {
  const token = randomToken();
  await db(database).insert(sessions).values({ id: await sha256(token), userId, expiresAt: new Date(Date.now() + 30 * 86400000) });
  return token;
}
export async function userFromToken(database: D1Database, token?: string) {
  if (!token) return null;
  const found = await db(database).select({ user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.id, await sha256(token)), gt(sessions.expiresAt, new Date()))).get();
  if (!found || found.user.isBanned) return null;
  return { id: found.user.id, email: found.user.email, handle: found.user.handle, xHandle: found.user.xHandle, avatarUrl: found.user.avatarUrl, streakCount: found.user.streakCount, isBanned: Boolean(found.user.isBanned) } satisfies User;
}
export async function deleteSession(database: D1Database, token?: string) {
  if (token) await db(database).delete(sessions).where(eq(sessions.id, await sha256(token)));
}
export function deriveHandle(email: string) {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || `max${Math.floor(Math.random() * 1000)}`;
}
export async function uniqueHandle(database: D1Database, base: string) {
  const d = db(database);
  let handle = base;
  for (let i = 1; await d.select({ id: users.id }).from(users).where(eq(users.handle, handle)).get(); i++) handle = `${base.slice(0, 24 - String(i).length)}${i}`;
  return handle;
}
export async function upsertGoogleUser(database: D1Database, profile: { sub: string; email: string; picture?: string }) {
  const d = db(database);
  const existing = await d.select().from(users).where(eq(users.googleId, profile.sub)).get();
  if (existing) return existing;
  const handle = await uniqueHandle(database, deriveHandle(profile.email));
  const user = { id: ulid(), googleId: profile.sub, email: profile.email, handle, avatarUrl: profile.picture ?? null };
  await d.insert(users).values(user);
  return await d.select().from(users).where(eq(users.id, user.id)).get();
}
