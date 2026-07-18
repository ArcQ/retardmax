import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { subscriptions } from '@/lib/db/schema';
import { requireUser } from '@/lib/server';
import { error } from '@/lib/utils';
import { getEnv } from '@/lib/env';

export const POST: APIRoute = async (context) => {
  const user = requireUser(context); const env = getEnv(context.locals); if (!env.STRIPE_SECRET_KEY) return error('Stripe is not configured.', 503);
  const subscription = await db(env.DB).select().from(subscriptions).where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active'))).get();
  if (!subscription) return error('No active subscription found.', 404);
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() }); const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const customer = typeof stripeSubscription.customer === 'string' ? stripeSubscription.customer : stripeSubscription.customer.id;
  const portal = await stripe.billingPortal.sessions.create({ customer, return_url: `${env.SITE_URL}/credits` });
  return new Response(null, { status: 303, headers: { location: portal.url } });
};
