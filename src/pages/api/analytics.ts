import type { APIRoute } from 'astro';
import { capture } from '@/lib/analytics';
import { getEnv } from '@/lib/env';
export const POST: APIRoute = async ({ request, locals }) => { const payload = await request.json().catch(() => ({})) as { event?: string; properties?: Record<string, unknown> }; if (payload.event) capture(getEnv(locals), payload.event, locals.user?.id ?? 'anonymous', payload.properties ?? {}); return new Response(null, { status: 204 }); };
