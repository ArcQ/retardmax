import { and, eq } from 'drizzle-orm';
import { db } from './db/db';
import { boosts, payments, posts } from './db/schema';
import { ulid } from './utils';
import { capture } from './analytics';

export async function applyPaid(database: D1Database, paymentId: string, env?: Env) {
  const d = db(database); const payment = await d.select().from(payments).where(eq(payments.id, paymentId)).get();
  if (!payment || payment.status === 'paid') return payment;
  await d.update(payments).set({ status: 'paid' }).where(eq(payments.id, paymentId));
  if (!payment.postId) return payment;
  if (payment.kind === 'publish') await d.update(posts).set({ visibility: 'public' }).where(and(eq(posts.id, payment.postId), eq(posts.userId, payment.userId)));
  if (payment.kind === 'boost') await d.insert(boosts).values({ id: ulid(), payerUserId: payment.userId, postId: payment.postId });
  if (env) capture(env, payment.kind === 'boost' ? 'boost_paid' : 'checkout_paid', payment.userId, { payment_id: paymentId, post_id: payment.postId });
  return payment;
}
