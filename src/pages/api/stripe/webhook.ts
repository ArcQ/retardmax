import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { eq, sql } from 'drizzle-orm';
import { applyPaid } from '@/lib/payments';
import { getEnv } from '@/lib/env';
import { db } from '@/lib/db/db';
import { subscriptions, users } from '@/lib/db/schema';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals); const payload = await request.text(); const signature = request.headers.get('stripe-signature');
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !signature) return new Response('Webhook not configured', { status: 400 });
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
    const event = await stripe.webhooks.constructEventAsync(payload, signature, env.STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider());
    if (event.type === 'checkout.session.completed') { const session = event.data.object as Stripe.Checkout.Session; const paymentId = session.metadata?.payment_id; const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id; if (paymentId) await applyPaid(env.DB, paymentId, env, subscriptionId); }
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice; const source = invoice.parent?.subscription_details?.subscription; const subscriptionId = typeof source === 'string' ? source : source?.id;
      if (subscriptionId) { const d = db(env.DB); const subscription = await d.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, subscriptionId)).get(); if (subscription) { const today = new Date().toISOString().slice(0, 10); await d.update(subscriptions).set({ status: 'active', lastCreditedOn: today, creditsIssuedThisPeriod: 1 }).where(eq(subscriptions.id, subscription.id)); await d.update(users).set({ postCredits: sql`${users.postCredits} + 1` }).where(eq(users.id, subscription.userId)); } }
    }
    if (event.type === 'customer.subscription.deleted') { const subscription = event.data.object as Stripe.Subscription; await db(env.DB).update(subscriptions).set({ status: 'canceled' }).where(eq(subscriptions.stripeSubscriptionId, subscription.id)); }
    return new Response('ok');
  } catch { return new Response('Invalid signature', { status: 400 }); }
};
