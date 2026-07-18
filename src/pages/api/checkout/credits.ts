import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { payments } from '@/lib/db/schema';
import { getPack } from '@/lib/pricing';
import { requireUser } from '@/lib/server';
import { error, json, ulid } from '@/lib/utils';
import { getEnv } from '@/lib/env';
import { applyPaid } from '@/lib/payments';

export const POST: APIRoute = async (context) => {
  const user = requireUser(context); const env = getEnv(context.locals); const { packId } = await context.request.json() as { packId?: string }; const pack = getPack(packId);
  if (!pack) return error('Pick a real credit pack.');
  const d = db(env.DB); const prior = await d.select({ id: payments.id }).from(payments).where(and(eq(payments.userId, user.id), eq(payments.status, 'paid'), inArray(payments.kind, ['credit_pack', 'subscription']))).get();
  const first = !prior; const amount = first ? Math.ceil(pack.amountCents / 2) : pack.amountCents; const paymentId = ulid();
  await d.insert(payments).values({ id: paymentId, userId: user.id, kind: 'credit_pack', amountCents: amount, creditsPurchased: pack.credits, status: 'pending' });
  if (env.DEV_FAKE_PAYMENTS === 'true') { await applyPaid(env.DB, paymentId, env); return json({ ok: true, fake: true, redirect: '/credits?loaded=1' }); }
  if (!env.STRIPE_SECRET_KEY) return error('Stripe is not configured.', 503);
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
  const session = await stripe.checkout.sessions.create({ mode: 'payment', line_items: [{ price_data: { currency: 'usd', product_data: { name: `${pack.name} — ${pack.credits} post credits` }, unit_amount: amount }, quantity: 1 }], metadata: { payment_id: paymentId, pack_id: pack.id, first_purchase: String(first) }, success_url: `${env.SITE_URL}/credits?loaded=1`, cancel_url: `${env.SITE_URL}/credits?canceled=1` });
  await d.update(payments).set({ stripeSessionId: session.id }).where(eq(payments.id, paymentId));
  return new Response(null, { status: 303, headers: { location: session.url ?? `${env.SITE_URL}/credits` } });
};
