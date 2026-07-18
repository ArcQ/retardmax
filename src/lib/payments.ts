import { and, eq, sql } from 'drizzle-orm';
import { db } from './db/db';
import { boosts, payments, posts, subscriptions, users } from './db/schema';
import { ulid } from './utils';
import { capture } from './analytics';

export async function applyPaid(database: D1Database, paymentId: string, env?: Env, stripeSubscriptionId?: string | null) {
  const d = db(database); const payment = await d.select().from(payments).where(eq(payments.id, paymentId)).get();
  if (!payment || payment.status === 'paid') return payment;
  await d.update(payments).set({ status: 'paid', stripeSubscriptionId: stripeSubscriptionId ?? null }).where(eq(payments.id, paymentId));
  if (payment.kind === 'publish' && payment.postId) await d.update(posts).set({ visibility: 'public' }).where(and(eq(posts.id, payment.postId), eq(posts.userId, payment.userId)));
  if (payment.kind === 'boost' && payment.postId) await d.insert(boosts).values({ id: ulid(), payerUserId: payment.userId, postId: payment.postId });
  if (payment.kind === 'credit_pack') await d.update(users).set({ postCredits: sql`${users.postCredits} + ${payment.creditsPurchased}` }).where(eq(users.id, payment.userId));
  if (payment.kind === 'subscription' && stripeSubscriptionId) {
    const today = new Date().toISOString().slice(0, 10);
    await d.insert(subscriptions).values({ id: ulid(), userId: payment.userId, stripeSubscriptionId, status: 'active', lastCreditedOn: today, creditsIssuedThisPeriod: 1 }).onConflictDoUpdate({ target: subscriptions.userId, set: { stripeSubscriptionId, status: 'active', lastCreditedOn: today, creditsIssuedThisPeriod: 1 } });
    await d.update(users).set({ postCredits: sql`${users.postCredits} + 1` }).where(eq(users.id, payment.userId));
  }
  if (env) capture(env, payment.kind === 'boost' ? 'boost_paid' : 'checkout_paid', payment.userId, { payment_id: paymentId, post_id: payment.postId });
  return payment;
}
