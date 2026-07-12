import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { payments, posts } from '@/lib/db/schema';
import { applyPaid } from '@/lib/payments';
import { requireUser } from '@/lib/server';
import { error, json, ulid } from '@/lib/utils';
import { getEnv } from '@/lib/env';
import { capture } from '@/lib/analytics';

export const POST: APIRoute = async (context) => {
  const user = requireUser(context); const env = getEnv(context.locals); const body = await context.request.json() as { postId?: string }; if (!body.postId) return error('Post required.'); const d = db(env.DB); const post = await d.select().from(posts).where(and(eq(posts.id, body.postId), eq(posts.visibility, 'public'))).get(); if (!post) return error('Only public posts can be boosted.', 404);
  const paymentId = ulid(); await d.insert(payments).values({ id: paymentId, userId: user.id, postId: post.id, kind: 'boost', amountCents: 100, status: 'pending' });
  capture(env, 'checkout_started', user.id, { kind: 'boost', post_id: post.id });
  if (env.DEV_FAKE_PAYMENTS === 'true') { await applyPaid(env.DB, paymentId, env); return json({ ok: true, fake: true, redirect: `/p/${post.id}` }); }
  if (!env.STRIPE_SECRET_KEY) return error('Stripe is not configured.', 503);
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() }); const session = await stripe.checkout.sessions.create({ mode: 'payment', line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Boost a Retardmax' }, unit_amount: 100 }, quantity: 1 }], metadata: { payment_id: paymentId }, success_url: `${env.SITE_URL}/p/${post.id}?boosted=1`, cancel_url: `${env.SITE_URL}/p/${post.id}?canceled=1` });
  await d.update(payments).set({ stripeSessionId: session.id }).where(eq(payments.id, paymentId)); return new Response(null, { status: 303, headers: { location: session.url ?? `${env.SITE_URL}/p/${post.id}` } });
};
