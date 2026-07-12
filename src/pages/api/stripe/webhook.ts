import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { applyPaid } from '@/lib/payments';
import { getEnv } from '@/lib/env';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals); const payload = await request.text(); const signature = request.headers.get('stripe-signature');
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !signature) return new Response('Webhook not configured', { status: 400 });
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
    const event = await stripe.webhooks.constructEventAsync(payload, signature, env.STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider());
    if (event.type === 'checkout.session.completed') { const session = event.data.object as Stripe.Checkout.Session; const paymentId = session.metadata?.payment_id; if (paymentId) await applyPaid(env.DB, paymentId, env); }
    return new Response('ok');
  } catch { return new Response('Invalid signature', { status: 400 }); }
};
