/**
 * Seed helper. Local D1 is owned by Wrangler, so this script prints the
 * idempotent route command used by README-DEV.md instead of opening SQLite
 * files behind Wrangler's back.
 */
console.log('Start `npm run dev` with DEV_FAKE_AUTH=true, then POST /api/dev/seed while signed in.');
