import type { APIRoute } from 'astro';
import { ImageResponse } from 'workers-og';
import { feedPosts } from '@/lib/data';
import { getEnv } from '@/lib/env';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);

export const GET: APIRoute = async ({ params, locals, redirect }) => {
  const [post] = await feedPosts(getEnv(locals).DB, { publicOnly: true, postId: params.postId, limit: 1 });
  if (!post) return redirect(`/p/${params.postId}`);
  const html = `<div style="display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;padding:54px;background:#090909;color:#f5f2eb;font-family:Arial,sans-serif"><div style="display:flex;font-size:28px;font-weight:900;letter-spacing:7px;color:#ff4d2e">RETARDMAX</div><div style="display:flex;font-size:54px;line-height:1.08;font-weight:900;max-width:1040px">${escapeHtml(post.body)}</div><div style="display:flex;gap:36px;font-size:25px;font-weight:700;color:#ffb4a6"><span>W ${post.wCount}</span><span>⚡ ${post.boostCount}</span><span>🔥 ${post.streakCount}</span><span>@${escapeHtml(post.xHandle ?? post.handle)}</span></div></div>`;
  return new ImageResponse(html, { width: 1200, height: 630 });
};
