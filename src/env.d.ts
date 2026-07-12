/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type User = {
  id: string;
  email: string;
  handle: string;
  xHandle: string | null;
  avatarUrl: string | null;
  streakCount: number;
  isBanned: boolean;
};

interface ImportMetaEnv {
  readonly PUBLIC_POSTHOG_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user: User | null;
    runtime: { env: Env; cf?: unknown; ctx?: ExecutionContext };
  }
}

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  SITE_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SESSION_SECRET?: string;
  ADMIN_EMAILS?: string;
  POSTHOG_KEY?: string;
  POSTHOG_HOST?: string;
  DEV_FAKE_AUTH?: string;
  DEV_FAKE_PAYMENTS?: string;
}
