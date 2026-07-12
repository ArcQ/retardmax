import { defineMiddleware } from 'astro:middleware';
import { userFromToken } from './lib/auth';
import { getEnv } from './lib/env';

export const onRequest = defineMiddleware(async ({ cookies, locals }, next) => {
  const env = getEnv(locals);
  locals.user = env?.DB ? await userFromToken(env.DB, cookies.get('rmx_session')?.value) : null;
  try {
    return await next();
  } catch (err) {
    // Astro does not turn a Response thrown from an endpoint into a response
    // automatically. Preserve requireUser's intentional HTTP status instead
    // of leaking it as a generic 500.
    if (err instanceof Response) return err;
    throw err;
  }
});
