import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { boosts, groupMembers, groups, pins, postGroups, posts, users, votes } from '@/lib/db/schema';
import { ulid, utcDate } from '@/lib/utils';
import { getEnv } from '@/lib/env';

const bodies = [
  'cold-called 100 people before 9am',
  'shipped at 4:41am, slept in the office',
  'sent the scary email and got the yes',
  'ran the hill after the meeting ran long',
  'made the offer before I felt ready',
  'fixed production on a Sunday and wrote the postmortem',
  'asked for the intro instead of waiting',
  'put the phone down and finished the thing',
  'walked into the room with no invite',
  'launched with three customers and a dream',
  'did the hard call first',
  'turned a no into a useful next step',
  'woke up early and kept the promise',
  'made the boring spreadsheet beautiful',
  'sent 50 follow-ups before lunch',
  'cut the scope and shipped',
  'trained through the rain',
  'closed the loop with everyone',
  'built the ugly first version',
  'took the bet publicly',
  'read the contract twice',
  'made a plan and did the first hour',
  'asked a better question',
  'got rejected and tried again',
];

const handles = ['grinder', 'earlybird', 'shipit', 'callhunter', 'nightowl', 'boldmove', 'operator', 'closer'];
const daysAgo = (days: number) => utcDate(new Date(Date.now() - days * 86400000));

export const POST: APIRoute = async (context) => {
  const env = getEnv(context.locals);
  if (env.DEV_FAKE_AUTH !== 'true' || !context.locals.user) return new Response('Dev seed disabled', { status: 403 });

  const d = db(env.DB);
  const seededUsers = [] as (typeof users.$inferSelect)[];
  for (const [i, handle] of handles.entries()) {
    const existing = await d.select().from(users).where(eq(users.handle, handle)).get();
    const user = existing ?? (await d.insert(users).values({
      id: ulid(), email: `${handle}@seed.local`, handle, streakCount: i + 1, lastPostedOn: daysAgo(i % 5),
    }).returning().get());
    if (user) seededUsers.push(user);
  }

  const seededPosts = [] as (typeof posts.$inferSelect)[];
  for (let i = 0; i < bodies.length; i++) {
    const user = seededUsers[i % seededUsers.length];
    const postedOn = daysAgo(Math.floor(i / seededUsers.length));
    const existing = await d.select().from(posts).where(and(eq(posts.userId, user.id), eq(posts.postedOn, postedOn))).get();
    const post = existing ?? (await d.insert(posts).values({
      id: ulid(), userId: user.id, body: bodies[i], visibility: i % 4 === 0 ? 'private' : 'public', postedOn,
    }).returning().get());
    if (post) seededPosts.push(post);
  }

  const group = await d.select().from(groups).where(eq(groups.inviteCode, 'MAXCREW1')).get()
    ?? (await d.insert(groups).values({ id: ulid(), name: 'The 6am psychos', inviteCode: 'MAXCREW1', creatorUserId: seededUsers[0].id }).returning().get());
  if (group) {
    for (const user of seededUsers) await d.insert(groupMembers).values({ groupId: group.id, userId: user.id }).onConflictDoNothing();
    for (const post of seededPosts.slice(0, 5)) await d.insert(postGroups).values({ postId: post.id, groupId: group.id }).onConflictDoNothing();
  }

  for (const [i, post] of seededPosts.entries()) {
    if (post.visibility !== 'public') continue;
    for (const voter of [seededUsers[(i + 1) % seededUsers.length], seededUsers[(i + 2) % seededUsers.length]]) {
      if (voter.id !== post.userId) await d.insert(votes).values({ userId: voter.id, postId: post.id }).onConflictDoNothing();
    }
  }

  for (const [i, post] of seededPosts.filter((item) => item.visibility === 'public').slice(0, 2).entries()) {
    const payer = seededUsers[i];
    const existing = await d.select().from(boosts).where(and(eq(boosts.payerUserId, payer.id), eq(boosts.postId, post.id))).get();
    if (!existing) await d.insert(boosts).values({ id: ulid(), payerUserId: payer.id, postId: post.id });
  }

  const pinDate = daysAgo(0);
  const hasPin = await d.select().from(pins).where(eq(pins.pinnedOn, pinDate)).get();
  const pinPost = seededPosts.find((post) => post.visibility === 'public' && post.postedOn === pinDate);
  if (!hasPin && pinPost) await d.insert(pins).values({ postId: pinPost.id, pinnedOn: pinDate, pinnedBy: seededUsers[0].id });

  return Response.json({ ok: true, users: seededUsers.length, posts: seededPosts.length, group: Boolean(group), boosts: 2, pinned: Boolean(pinPost) });
};
