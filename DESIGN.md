# DESIGN.md — RETARDMAX

## 1. What this is

A daily-post motivational site for the hustle/grinder niche. Users log their "retardmax of the day" — the boldest, most over-the-top productive thing they did — and the community ranks the best ones. Think BeReal's daily cadence × Product Hunt's leaderboard × gym-bro energy.

**North-star metrics (only two):**

| Metric | Definition | Primary levers |
|---|---|---|
| Usage | Posts per day (and DAU behind them) | Streaks, groups, share cards |
| Revenue | Gross $ per week | $1 public posts, $1 boosts |

Every feature below is annotated with which metric it serves. If a proposed feature serves neither, it doesn't ship.

## 2. Core loop

```
Sign in with Google → post today's retardmax (free, private by default)
        │
        ├── keep it in your personal log / your groups (free)
        │
        └── pay $1 → post goes on the PUBLIC BOARD
                │
                ├── community votes Ws
                ├── Daily Top 10 (featured, "our picks")
                ├── All-time leaderboard (legendary posts)
                └── your linked X profile shown → clout → share → new users
```

The free tier is the habit engine. The public board is the aspiration engine. The dollar is the bot gate and the business.

## 3. Features (POC scope)

### 3.1 Auth — Google sign-in only [usage]
- Auth.js with the Google provider. No email/password, no magic links, nothing else.
- One Google account = one identity. Keeps signup at two clicks and gives a weak-but-free bot deterrent before the paywall even matters.

### 3.2 The daily post [usage]
- One post per user per day (server-enforced, user's local day). Scarcity is the point — it makes each post an event and makes streaks meaningful.
- Text, max ~280 chars, optional single image. Short by design: reads fast on a leaderboard, screenshots well.
- Free posts live in your personal log and any groups you share them to. Public requires payment (3.4).
- Editing allowed for 10 minutes, then locked (leaderboard integrity).

### 3.3 Voting: Ws [usage]
- Signed-in users give a post a **W** (one per post, toggleable). No downvotes — this is a motivation site, not Reddit. The worst outcome for a mid post is silence.
- W count is the raw score feeding both leaderboards.

### 3.4 The $1 public post [revenue, bot gate]
- Stripe Checkout, one-time $1 payment attached to a specific post. Copy on the button: **"$1 — supports the site & gates the bots."** Honest framing; the niche respects it.
- No crypto in the POC. Stripe only. Crypto adds wallet UX, compliance, and support burden for a $1 SKU — revisit only if the audience demands it.
- Optional later: a $5 pack of 5 post credits (higher AOV, less checkout friction for regulars). Month 2+ if $1 singles show demand.

### 3.5 Leaderboards [usage]
- **Daily Top 10 ("Today's Picks")** — the front page. Ranked by Ws with a light editorial override (admin can pin/swap up to 3 slots) so "what we think is most interesting" stays true and the page never looks dead early in the day.
- **All-Time Board** — the most legendary retardmaxes ever, ranked by lifetime Ws. This is the site's permanent trophy case and its best SEO/share surface.
- Only paid public posts appear on either board.

### 3.6 Groups [usage]
- Create a group, get an invite link/code, friends join. Free posts can be shared to your groups.
- Each group has its own leaderboard (daily + all-time) over its members' posts — public *or* free ones shared to it.
- No moderation tooling beyond "creator can kick members" in the POC.

### 3.7 X profile link [usage → acquisition]
- Users paste their X handle on their profile; it shows on every public post and leaderboard row.
- No verification in the POC (it's a link, worst case it's wrong). This is the clout incentive that makes people pay $1: the leaderboard is a follower funnel.

## 4. The 3 additional features (kept ruthlessly small)

### 4.1 Streaks [usage — the retention feature]
- Consecutive days posted (free or paid — the habit is what we're rewarding). Shown as `🔥 N` on profile, posts, and leaderboard rows.
- One rule, no freezes, no repair items, no gamification sprawl. Miss a day, back to zero — brutal fits the brand.
- Why: daily-post products live or die on streaks (Duolingo, BeReal). Cheapest possible retention mechanic; directly moves posts/day.

### 4.2 Share cards [usage — the acquisition feature]
- Every public post gets a generated OG image (post text, W count, streak, X handle, site logo) and a one-tap "Share to X" button with pre-filled text.
- Built with `@vercel/og` — roughly a day of work.
- Why: the users' motivation (clout on X) becomes the site's distribution. Each paid post becomes an ad with the poster's own reach behind it.

### 4.3 Boosts [revenue — the second SKU]
- Anyone can pay $1 to **boost** any public post: +5 to its daily score and a `⚡ boosted` badge with a running boost count. Boost count is displayed (so it's transparent, not stealth vote-buying) and boosts don't touch the all-time board (lifetime Ws only — keeps the trophy case legitimate).
- Why: turns spectators into payers (most visitors will never post), doubles as tipping/patronage, reuses the exact same Stripe flow as 3.4. Near-zero incremental build cost.

That's the full list. Explicitly **not** in the POC: comments, follows, DMs, notifications feeds, mobile apps, crypto payments, video, categories/tags, moderation queues beyond a report button + admin delete.

## 5. Ranking mechanics

- **Daily score** = Ws received today + 5 × boosts today. Resets at 00:00 UTC.
- **Daily Top 10** = top daily scores, with up to 3 admin-pinned picks ("our picks" editorial voice).
- **All-time score** = lifetime Ws (boosts excluded).
- Ties break by earliest post time (rewards posting early, spreads activity across the day).

## 6. Data model (D1 / SQLite)

```
users        id, google_id, handle, x_handle, avatar_url, streak_count,
             last_posted_on, created_at
posts        id, user_id, body, image_url, visibility (private|public),
             posted_on (date), created_at
payments     id, user_id, post_id, kind (publish|boost), stripe_session_id,
             amount_cents, status, created_at
votes        user_id, post_id, created_at            (PK: user_id+post_id)
boosts       id, payer_user_id, post_id, created_at
groups       id, name, invite_code, creator_user_id, created_at
group_members  group_id, user_id, joined_at          (PK: group_id+user_id)
post_groups    post_id, group_id                     (PK: post_id+group_id)
```

Posts become `public` only when a `payments` row with `kind=publish, status=paid` exists (set by the Stripe webhook, never trusted from the client).

## 7. Architecture

- **Astro (SSR) + React islands on Cloudflare Workers** via `@astrojs/cloudflare` and wrangler — same stack as `whatsnext`. Astro pages for feeds/leaderboards, API routes for votes/posts/webhooks. One deploy target, zero ops.
- **D1 (SQLite) + Drizzle ORM**, migrations via `wrangler d1 migrations apply`. Leaderboards are simple aggregate queries at POC scale. **R2** for post images.
- **Hand-rolled Google OAuth** (authorization-code flow, D1-backed sessions, HttpOnly cookie), **Stripe Checkout + webhook** (fetch HTTP client + SubtleCrypto signature verification on Workers), **workers-og** for share cards, **PostHog** for the two metrics plus funnel events (`sign_in`, `post_created`, `checkout_started`, `checkout_paid`, `w_given`, `boost_paid`, `share_clicked`, `group_joined`).
- **Anti-bot stack:** Google-only auth + 1 post/day + $1 public gate + per-IP rate limits on votes. That's plenty for a POC.

## 8. Brand / tone

- Dark, loud, gym-poster energy. Big type, high contrast. The site should feel like a locker room wall, not a SaaS dashboard.
- Copy is in on the joke but the leaderboard is sincere — the featured posts should be genuinely motivating ("cold-called 100 people," "shipped the thing at 4am"), which is what makes the site *work* as motivation rather than pure shitpost.
- ⚠️ **Practical naming risk, flagged once:** the name contains a slur, which can trip Stripe's account review, Google's OAuth app verification (the consent screen shows your app name), X link-sharing filters, and most ad networks. This can block the exact revenue and distribution rails the product depends on. Cheap hedge: register a neutral legal/business name and OAuth app name (e.g. "RTDMX" / "Max Daily"), keep the edgy brand on the site itself, and decide on full branding once Stripe and Google have approved. Your call — noted here so it's a decision, not a surprise.

## 9. Moderation (minimum viable)

- Report button on public posts → admin queue (a simple table view) → delete + optional ban.
- Hard rule published in the footer: retardmaxxing is about *your own* bold moves — doxxing, harassment, or targeting people gets deleted and banned. Keeps the brand "unhinged-positive," which is also what advertisers-of-last-resort and Stripe will tolerate.

## 10. What success looks like (end of month 3)

- 100+ posts/day, 25%+ of posters on a 7-day streak
- 10%+ of daily posts choose the $1 public option; boosts ≥ 20% of revenue
- One post that "escapes" to X and brings a measurable signup spike (share cards working)
