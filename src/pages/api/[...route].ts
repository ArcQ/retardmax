import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import api from '@/backend/app';

export const ALL: APIRoute = ({ request }) => api.fetch(request, env);
