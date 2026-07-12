import type { APIRoute } from 'astro';
import { deleteSession } from '@/lib/auth';
import { cookieOptions } from '@/lib/utils';
import { getEnv } from '@/lib/env';

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  await deleteSession(getEnv(locals).DB, cookies.get('rmx_session')?.value);
  cookies.delete('rmx_session', cookieOptions(0));
  return redirect('/');
};
