import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { payments, subscriptions } from '@/lib/db/schema';
import { MONTHLY_MAX_PLAN } from '@/lib/pricing';
import { requireUser } from '@/lib/server';
import { error, json, ulid } from '@/lib/utils';
import { getEnv } from '@/lib/env';
import { applyPaid } from '@/lib/payments';

export const POST: APIRoute = async (context) => {
  const user = requireUser(context); const env = getEnv(context.locals); const d = db(env.DB);
  const active = await d.select().from(subscriptions).where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active'))).get(); if (active) return error('Your Daily Max subscription is already running.');
  const prior = await d.select({ id: payments.id }).from(payments).where(and(eq(payments.userId, user.id), eq(payments.status, 'paid'), inArray(payments.kind, ['credit_pack', 'subscription']))).get();
  const first = !prior; const paymentId = ulid(); await d.insert(payments).values({ id: paymentId, userId: user.id, kind: 'subscription', amountCents: MONTHLY_MAX_PLAN.amountCents, status: 'pending' });
  if (env.DEV_FAKE_PAYMENTS === 'true') { await applyPaid(env.DB, paymentId, env, `fake_sub_${paymentId}`); return json({ ok: true, fake: true, redirect: '/credits?subscribed=1' }); }
  if (!env.STRIPE_SECRET_KEY) return error('Stripe is not configured.', 503);
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
  const coupon = first ? await stripe.coupons.create({ percent_off: 50, duration: 'once', name: 'First maxout: 50% off' }) : null;
  const session = await stripe.checkout.sessions.create({ mode: 'subscription', line_items: [{ price_data: { currency: 'usd', product_data: { name: 'DAILY MAX — 1 post credit every day' }, unit_amount: MONTHLY_MAX_PLAN.amountCents, recurring: { interval: 'month' } }, quantity: 1 }], discounts: coupon ? [{ coupon: coupon.id }] : undefined, metadata: { payment_id: paymentId, first_purchase: String(first) }, success_url: `${env.SITE_URL}/credits?subscribed=1`, cancel_url: `${env.SITE_URL}/credits?canceled=1` });
  await d.update(payments).set({ stripeSessionId: session.id }).where(eq(payments.id, paymentId));
  return new Response(null, { status: 303, headers: { location: session.url ?? `${env.SITE_URL}/credits` } });
};
