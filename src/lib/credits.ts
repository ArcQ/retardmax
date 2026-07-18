import { and, eq, sql } from 'drizzle-orm';
import { db } from './db/db';
import { subscriptions, users } from './db/schema';
import { utcDate } from './utils';

const daysBetween = (from: string, to: string) => Math.max(0, Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000));

export async function grantDueDailyCredits(database: D1Database, userId: string) {
  const d = db(database); const subscription = await d.select().from(subscriptions).where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active'))).get();
  if (!subscription) return 0;
  const due = Math.min(daysBetween(subscription.lastCreditedOn, utcDate()), 30 - subscription.creditsIssuedThisPeriod);
  if (due <= 0) return 0;
  await d.update(users).set({ postCredits: sql`${users.postCredits} + ${due}` }).where(eq(users.id, userId));
  await d.update(subscriptions).set({ lastCreditedOn: utcDate(), creditsIssuedThisPeriod: subscription.creditsIssuedThisPeriod + due }).where(eq(subscriptions.id, subscription.id));
  return due;
}
