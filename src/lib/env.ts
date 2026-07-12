import { env as workerEnv } from 'cloudflare:workers';

type LocalsLike = { runtime?: { env?: Env } };

export function getEnv(locals?: LocalsLike): Env {
  try {
    if (workerEnv && (workerEnv as unknown as Partial<Env>).DB) return workerEnv as unknown as Env;
  } catch { /* Astro dev without a Worker runtime */ }
  try {
    if (locals?.runtime?.env) return locals.runtime.env;
  } catch { /* Astro 6 removed the old runtime getter */ }
  return {} as Env;
}
