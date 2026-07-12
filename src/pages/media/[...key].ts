import type { APIRoute } from 'astro';
import { getEnv } from '@/lib/env';
export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key; if (!key || key.includes('..')) return new Response('Not found', { status: 404 }); const object = await getEnv(locals).MEDIA.get(key); if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, { headers: { 'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable', etag: object.httpEtag } });
};
