# RETARDMAX

Post your retardmax of the day. The daily log for people who do the thing instead of thinking about the thing.

Inspired by the trend popularized by [Elisha Long](https://www.youtube.com/@ElishaLong). Motivational site for the hustle/grinder niche: one post a day, community votes, public leaderboards, groups with your friends.

## The pitch in one loop

1. Sign in with Google (only auth method — zero friction, one identity per human).
2. Post your **retardmax of the day** — the boldest / most unhinged productive thing you did today.
3. Keep it free in your personal log and private groups, or pay **$1 (Stripe)** to put it on the **public board**. The dollar supports the site and gates bots.
4. Community votes Ws. We feature a **Daily Top 10**, plus an **all-time leaderboard** of the most legendary retardmaxes.
5. Link your X profile — go viral, get followers, come back tomorrow.

## Two metrics that matter

- **Usage** — daily posts (and the streaks that drive them)
- **Revenue** — $1 public posts + $1 boosts

Everything in scope must move one of these. Everything else is cut.

## Docs

- [DESIGN.md](DESIGN.md) — product design, features, data model, architecture
- [ROADMAP.md](ROADMAP.md) — 3-month POC plan

## Stack

Mirrors the `whatsnext` stack: Astro (SSR) + React islands on Cloudflare Workers (`@astrojs/cloudflare` + wrangler) · D1 (SQLite) via Drizzle ORM · R2 for images · Tailwind · hand-rolled Google OAuth with D1-backed sessions · Stripe Checkout · PostHog for analytics.

## Status

In build. See SPEC.md for the implementation spec and ROADMAP.md for the phased plan.
