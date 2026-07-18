# Retardmax local development

## Local setup

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm run db:local:migrate
pnpm run dev
```

For the no-credential POC flow, keep `DEV_FAKE_AUTH=true` and `DEV_FAKE_PAYMENTS=true` in `.dev.vars`. Visit `/api/auth/login?as=alice` and `/api/auth/login?as=bob` to switch local users. The fake login is deliberately disabled unless the flag is present.

To add starter content, keep the dev server running and run:

```sh
curl -X POST http://localhost:4321/api/dev/seed
```

`pnpm run preview` builds and starts Wrangler with local D1/R2 bindings. The local D1 can be reset by removing `.wrangler/state` and re-running `pnpm run db:local:migrate`.

## Environment

`.dev.vars` is never committed. Production secrets are set with `wrangler secret put`.

Required keys are `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_SECRET`, `ADMIN_EMAILS`, `DEV_FAKE_AUTH`, and `DEV_FAKE_PAYMENTS`. `SITE_URL` is a Wrangler variable. Google OAuth needs a redirect URI of `${SITE_URL}/api/auth/callback`; Stripe needs a webhook at `${SITE_URL}/api/stripe/webhook` subscribed to `checkout.session.completed`, `invoice.paid`, and `customer.subscription.deleted`. Configure Stripe’s Billing Portal so subscribers can manage or cancel from `/credits`.

## Production

Create a D1 database named `retardmax` and an R2 bucket named `retardmax-media`, put the real D1 id in `wrangler.jsonc`, apply `pnpm run db:prod:migrate`, configure Google consent-screen credentials and Stripe secrets, then run `pnpm run deploy:prod`. The credit store creates its Stripe prices at checkout: 4 credits for $3, 12 for $8, 30 for $17, and Daily Max ($12/month, one credit per day). A user’s first store purchase is 50% off.

## Intentional dev substitutions

Fake auth creates local users without Google. Fake payments apply the publish/boost effect immediately without Stripe. Share cards use the documented fallback: `/api/og/:postId.png` redirects to the visually strong `/p/:id` card permalink with OG text metadata; a `workers-og`/Satori image was not shipped because it is not reliable under the current Astro Cloudflare adapter build.
