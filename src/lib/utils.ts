export const ulid = () => {
  const time = Date.now().toString(36).padStart(9, '0');
  const random = crypto.getRandomValues(new Uint8Array(10));
  return time + Array.from(random, (n) => n.toString(36).padStart(2, '0')).join('').slice(0, 17);
};

export const utcDate = (date = new Date()) => date.toISOString().slice(0, 10);
export const yesterday = (date = new Date()) => utcDate(new Date(date.getTime() - 86400000));
export const json = (data: unknown, init?: ResponseInit) => Response.json(data, init);
export const error = (message: string, status = 400) => json({ error: message }, { status });
export const wantsJson = (request: Request) => request.headers.get('accept')?.includes('application/json');

export function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function cookieOptions(maxAge?: number) {
  return { path: '/', httpOnly: true, secure: true, sameSite: 'lax' as const, ...(maxAge === undefined ? {} : { maxAge }) };
}

export const absoluteUrl = (env: Env, path: string) => `${env.SITE_URL.replace(/\/$/, '')}${path}`;
