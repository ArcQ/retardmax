# ROADMAP.md — 3-Month POC

Goal: the smallest thing that proves the two metrics — people post daily (usage) and pay $1 to go public (revenue). Ship publicly at the end of Month 1; Months 2–3 are retention and revenue mechanics on top of a live site.

## Month 1 — The core loop, live

**Week 1 — skeleton**
- [ ] Next.js + Tailwind + Drizzle + Neon setup, deployed to Vercel from day one
- [ ] Auth.js with Google sign-in; user record + handle on first login
- [ ] Post composer: text (≤280 chars) + optional image, one post/day enforced

**Week 2 — money**
- [ ] Stripe Checkout: $1 "publish to public board" on a post
- [ ] Webhook → mark payment paid → flip post to public (server-side only)
- [ ] Personal log page (your history, free posts included)

**Week 3 — the board**
- [ ] Public feed + W voting
- [ ] Daily Top 10 with admin pin/swap (up to 3 editorial slots)
- [ ] All-time leaderboard
- [ ] X handle on profile, shown on posts and leaderboard rows

**Week 4 — launch**
- [ ] PostHog events wired (sign_in, post_created, checkout_paid, w_given, share_clicked)
- [ ] Report button + admin delete/ban
- [ ] Landing page for logged-out visitors (today's Top 10 is the landing page)
- [ ] Launch: Elisha Long comment sections / niche X accounts / the grindset corner of X

**Month 1 exit criteria:** a stranger can sign in, post, pay $1, appear on the board, and get Ws — with zero founder involvement.

## Month 2 — Retention + acquisition

- [ ] **Streaks** (🔥 N on profiles, posts, leaderboard rows; resets on a missed day)
- [ ] **Share cards** (@vercel/og OG images + one-tap "Share to X" with pre-filled text)
- [ ] **Groups**: create, invite link, join; group daily + all-time leaderboards; share free posts to groups
- [ ] Post-payment upsell screen: "Share it or it didn't happen" → share card
- [ ] Watch the funnel in PostHog; fix the single biggest drop-off, nothing else

**Month 2 exit criteria:** D7 retention meaningfully above Month 1 baseline; measurable signups arriving from X links.

## Month 3 — Second revenue lever + tuning

- [ ] **Boosts**: $1 boost on any public post (+5 daily score, ⚡ badge, visible count; excluded from all-time)
- [ ] $5 five-post credit pack if $1 singles show repeat buyers
- [ ] Weekly "Hall of Fame" recap page (auto-generated from the week's top posts — shareable, SEO surface)
- [ ] Perf/polish pass on leaderboard queries if needed
- [ ] Decide from data: double down, pivot pricing, or kill

**Month 3 exit criteria (success bar):**
- 100+ posts/day, 25%+ of posters on a 7-day streak
- 10%+ of daily posts paid public; boosts ≥ 20% of revenue
- At least one organic viral moment traceable to share cards

## Deliberately deferred (do not build in POC)

Comments, follows, notifications, mobile apps, crypto payments, video posts, tags/categories, verified X linking, group moderation tooling, dark-mode toggle bikeshedding. Each returns only if the data demands it.
