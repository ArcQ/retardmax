import type { APIContext } from 'astro';
import { json } from './utils';
import { getEnv } from './env';
export function requireUser(context: APIContext) {
  if (!context.locals.user) throw new Response('Sign in required', { status: 401 });
  return context.locals.user;
}
export function envOf(context: APIContext) { return getEnv(context.locals); }
export function parseBody(request: Request) { return request.headers.get('content-type')?.includes('application/json') ? request.json() : request.formData(); }
export function error(message: string, status = 400) { return json({ error: message }, { status }); }
