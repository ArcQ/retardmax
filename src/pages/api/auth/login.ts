import type { APIRoute } from 'astro';
import { sessionCookie, uniqueHandle } from '@/lib/auth';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { cookieOptions, safeNext, ulid } from '@/lib/utils';
import { eq } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { capture } from '@/lib/analytics';

export const GET: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const env = getEnv(locals);
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  if (env.DEV_FAKE_AUTH === 'true') {
    const email = `${(url.searchParams.get('as') ?? 'demo').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'demo'}@dev.local`;
    const existing = await db(env.DB).select().from(users).where(eq(users.email, email)).get();
    const user = existing ?? (await db(env.DB).insert(users).values({ id: ulid(), email, handle: await uniqueHandle(env.DB, email.split('@')[0]), avatarUrl: null }).returning().get());
    const token = await sessionCookie(env.DB, user.id);
    cookies.set('rmx_session', token, cookieOptions(30 * 86400));
    capture(env, 'sign_in', user.id, { method: 'fake' });
    return redirect(next);
  }
  if (!env.GOOGLE_CLIENT_ID) return new Response('Google OAuth is not configured. Set DEV_FAKE_AUTH=true for local development.', { status: 503 });
  const state = crypto.randomUUID();
  cookies.set('rmx_oauth_state', state, cookieOptions(600));
  const callback = `${env.SITE_URL.replace(/\/$/, '')}/api/auth/callback`;
  const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  google.searchParams.set('client_id', env.GOOGLE_CLIENT_ID); google.searchParams.set('redirect_uri', callback); google.searchParams.set('response_type', 'code'); google.searchParams.set('scope', 'openid email profile'); google.searchParams.set('state', state);
  return redirect(google.toString());
};
