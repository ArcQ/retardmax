# SPEC.md — Implementation spec (POC, full feature set)

Self-contained spec for implementing the site described in DESIGN.md. Follow this document exactly; where it conflicts with DESIGN.md, this document wins.

## 0. Ground rules

- Repo root: this directory. Build the app in place (not a subdirectory).
- Stack mirrors `/Users/eddie/dev/products/whatsnext`: Astro `output: 'server'` + `@astrojs/cloudflare` adapter, React 18 islands, Tailwind 3, Drizzle ORM + drizzle-kit (sqlite dialect, D1), wrangler with `nodejs_compat`. Use `@` path alias to `./src`.
- Must pass `pnpm run build` (`astro check && astro build`) with zero errors.
- Must run fully locally with `wrangler dev` local D1/R2 (`pnpm run preview`) and no real Google/Stripe credentials, via the dev flags in §8.
- TypeScript throughout. Keep code plain and boring; no premature abstraction.
- Timezone: **UTC everywhere**. `posted_on` is the UTC date string `YYYY-MM-DD`. One post per user per UTC day, enforced server-side by unique index.

## 1. wrangler.jsonc

- name `retardmax`, `compatibility_flags: ["nodejs_compat"]`, current compatibility_date.
- D1 binding `DB` (database_name `retardmax`, placeholder database_id, `migrations_dir: "drizzle/migrations"`).
- R2 binding `MEDIA` (bucket `retardmax-media`).
- `vars`: `SITE_URL`.
- Secrets (documented in README-DEV.md, set via `.dev.vars` locally): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_SECRET`, `ADMIN_EMAILS` (comma-separated), `DEV_FAKE_AUTH` ("true"/absent), `DEV_FAKE_PAYMENTS` ("true"/absent).

## 2. Database schema (Drizzle, `src/lib/db/schema.ts`)

```
users          id (pk, text ulid), google_id (unique), email, handle (unique),
               x_handle (nullable), avatar_url (nullable), streak_count (int, 0),
               last_posted_on (nullable text date), is_banned (int bool 0),
               post_credits (int, 0), created_at
sessions       id (pk, text token-hash), user_id (fk), expires_at
posts          id (pk, ulid), user_id (fk), body (text ≤ 280), image_key (nullable),
               visibility ('private'|'public'), posted_on (text date), created_at
               UNIQUE(user_id, posted_on)
payments       id (pk, ulid), user_id, post_id (nullable), kind ('publish'|'boost'),
               stripe_session_id (unique, nullable), amount_cents, status ('pending'|'paid'),
               created_at
votes          user_id, post_id, created_at    PK(user_id, post_id)
boosts         id (pk, ulid), payer_user_id, post_id, created_at
groups         id (pk, ulid), name, invite_code (unique, 8 chars), creator_user_id, created_at
group_members  group_id, user_id, joined_at    PK(group_id, user_id)
post_groups    post_id, group_id               PK(post_id, group_id)
pins           post_id (pk), pinned_on (text date), pinned_by
reports        id (pk, ulid), post_id, reporter_user_id, reason (text), created_at, resolved (int bool 0)
```

Generate real migrations with drizzle-kit into `drizzle/migrations`. npm scripts: `db:local:migrate`, `db:prod:migrate`, `db:generate` (mirror whatsnext's script style).

## 3. Auth

- Google OAuth authorization-code flow, hand-rolled (plain `fetch` to Google token/userinfo endpoints; no Auth.js). Routes: `GET /api/auth/login` (redirect w/ state cookie), `GET /api/auth/callback` (exchange, upsert user, create session), `POST /api/auth/logout`.
- Session: random 32-byte token, store SHA-256 hash as `sessions.id`, 30-day expiry, HttpOnly Secure SameSite=Lax cookie `rmx_session`.
- On first login derive `handle` from email local-part (dedupe with numeric suffix). Users can change handle + x_handle in `/settings`.
- Astro middleware (`src/middleware.ts`) resolves the session into `locals.user` on every request; banned users are treated as logged out for writes.
- **DEV_FAKE_AUTH=true**: `/api/auth/login?as=<handle>` signs you in as (creating if needed) a local test user, no Google round-trip. Guard: only when the flag is set.

## 4. Posting, votes, streaks

- `POST /api/posts`: body (1–280 chars after trim), optional image (multipart, ≤2 MB, jpeg/png/webp → R2 key `posts/<ulid>.<ext>`, served by `GET /media/[...key]` streaming from R2 with long cache headers). Creates post `private` for today (UTC). Second post same day → 409.
- Optional `group_ids[]` on create: rows in `post_groups` for groups the poster belongs to. A separate `POST /api/posts/:id/share-to-group` allows adding later.
- Streak update on successful create: `last_posted_on == yesterday` → `streak_count += 1`; `== today` impossible (unique index); else `streak_count = 1`. Set `last_posted_on = today`.
- Edit window: `PATCH /api/posts/:id` allowed only within 10 minutes of `created_at`, body text only.
- `POST /api/posts/:id/vote` toggles a W (one per user per post, no self-vote). Votes only allowed on public posts. Per-user rate limit: 100 votes/day.
- `POST /api/posts/:id/report` with reason → `reports` row.

## 5. Payments (Stripe)

- Stripe SDK with `Stripe.createFetchHttpClient()` and `Stripe.createSubtleCryptoProvider()` (Workers-compatible).
- `POST /api/checkout/publish` (own private post from today) and `POST /api/checkout/boost` (any public post, incl. someone else's): create a `payments` row `pending`, then a Stripe Checkout Session ($1, one-time, metadata: payment_id) and redirect. Success/cancel URLs back to the post.
- `POST /api/stripe/webhook`: verify signature async, on `checkout.session.completed` mark payment `paid`; for `publish` flip the post to `visibility='public'`; for `boost` insert a `boosts` row. Idempotent (check status before applying).
- Never flip visibility from client-supplied data — webhook (or dev flag) only.
- **DEV_FAKE_PAYMENTS=true**: the two checkout endpoints skip Stripe entirely and immediately apply the paid effect. Button copy still shows "$1 — supports the site & gates the bots."

## 6. Scoring + leaderboards

- Daily score (per post, per UTC day) = Ws received today + 5 × boosts today. All-time score = lifetime Ws only.
- `/` (home): **Today's Top 10** — public posts scored for today; admin pins (up to 3 rows in `pins` for today) are forced into the list top-first, remainder by score, ties by earliest `created_at`. Below the Top 10, a "Fresh today" reverse-chron public feed. Logged-out visitors see this same page with a sign-in CTA.
- `/all-time`: top 50 public posts by lifetime Ws, ties by earliest.
- Leaderboard rows show: rank, body, author handle + avatar + 🔥 streak, W button/count, ⚡ boost count + boost button, X handle link if set, share button.

## 7. Groups, profile, log, settings, admin

- `/g` — your groups + create form (name → generates invite code). `/g/join/[code]` — join. `/g/[id]` — members-only page: group daily top 10 + group all-time (over posts shared to the group, both private-shared and public), member list, invite link, creator can kick.
- `/u/[handle]` — public profile: avatar, handle, x link, streak, their public posts.
- `/log` — own history incl. private posts, with per-post "publish for $1" button for today's post if still private.
- `/settings` — handle, x_handle.
- `/admin` — gated by `locals.user.email ∈ ADMIN_EMAILS`: today's pin management (pin/unpin public posts, max 3), open reports queue (delete post / ban user / dismiss).

## 8. Share cards

- `GET /api/og/[postId].png` — OG image (1200×630) for public posts using `workers-og` (satori on Workers): dark background, big post text, W count, 🔥 streak, @x_handle, wordmark. Wire `og:image`/`twitter:card` meta on post permalink `/p/[id]`.
- If `workers-og` cannot be made to build under the Astro CF adapter after a genuine attempt, fall back to: `/p/[id]` as a visually strong "card page" with proper OG *text* tags, and note the substitution in README-DEV.md. Do not burn hours on wasm bundling.
- Share button = intent link `https://x.com/intent/post?text=...` pre-filled with the body + permalink.

## 9. UI (functional pass — polish comes later)

- Tailwind, dark theme only: near-black background, white type, one loud accent (red-orange), big condensed headings. Locker-room poster energy, not SaaS.
- Layout shell: top nav (wordmark RETARDMAX, Today / All-Time / Groups / My Log, avatar menu), mobile-friendly single column (max-w ~2xl).
- React islands only where interactivity is needed (composer, W button, boost button, share). Everything else static Astro.
- PostHog snippet (env-keyed, no-op if key missing) firing events: `sign_in`, `post_created`, `checkout_started`, `checkout_paid` (server-side capture ok), `w_given`, `boost_paid`, `share_clicked`, `group_joined`.
- Footer: one-line rule — "Retardmaxxing is about YOUR bold moves. Doxxing, harassment, targeting people = deleted + banned."

## 10. Seed + docs

- `scripts/seed.ts` (run with tsx against local D1 via wrangler, or a `POST /api/dev/seed` route gated by DEV_FAKE_AUTH — pick whichever is more reliable locally): ~8 users, ~25 posts across the last 5 days (mix public/private), votes, a couple boosts, one group with members, 1 pin. Bodies should read like real retardmaxes ("cold-called 100 people before 9am", "shipped at 4:41am, slept in the office", …).
- `README-DEV.md`: local setup (install, migrate local D1, `.dev.vars` template, dev flags, seed, `pnpm run preview`), prod deploy steps (create D1 + R2, secrets, Google OAuth consent + redirect URI, Stripe webhook endpoint), and a checklist of what's intentionally fake in dev mode.

## 11. Acceptance checklist (verify before finishing)

1. `pnpm install` then `pnpm run build` → zero errors.
2. Local run with both dev flags: fake-login as two users; user A posts (streak=1), pays fake $1 → appears on `/`; user B gives a W; daily Top 10 reflects it; boost adds +5 and ⚡.
3. Second post same UTC day → 409 surfaced as a friendly error.
4. Group create/join/share works; group leaderboard shows shared private post; non-member gets 404/redirect on `/g/[id]`.
5. `/all-time` ranks by lifetime Ws and ignores boosts.
6. Admin (email in ADMIN_EMAILS) can pin a post and it appears first on `/`; report → admin queue → delete works.
7. Migrations apply cleanly on a fresh local D1.
