import type { APIRoute } from 'astro';
import { sessionCookie, upsertGoogleUser } from '@/lib/auth';
import { cookieOptions } from '@/lib/utils';
import { getEnv } from '@/lib/env';
import { capture } from '@/lib/analytics';

export const GET: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const env = getEnv(locals); const url = new URL(request.url);
  if (!url.searchParams.get('state') || url.searchParams.get('state') !== cookies.get('rmx_oauth_state')?.value) return new Response('Invalid OAuth state', { status: 400 });
  const code = url.searchParams.get('code'); if (!code || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return new Response('OAuth configuration error', { status: 400 });
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: `${env.SITE_URL.replace(/\/$/, '')}/api/auth/callback`, grant_type: 'authorization_code' }) });
  if (!tokenResponse.ok) return new Response('Google token exchange failed', { status: 502 });
  const token = await tokenResponse.json() as { access_token: string };
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${token.access_token}` } });
  if (!profileResponse.ok) return new Response('Google profile lookup failed', { status: 502 });
  const profile = await profileResponse.json() as { sub: string; email: string; picture?: string };
  const user = await upsertGoogleUser(env.DB, profile); if (!user) return new Response('Could not create user', { status: 500 });
  cookies.set('rmx_session', await sessionCookie(env.DB, user.id), cookieOptions(30 * 86400));
  capture(env, 'sign_in', user.id, { method: 'google' });
  cookies.delete('rmx_oauth_state', { path: '/' });
  return redirect('/');
};
