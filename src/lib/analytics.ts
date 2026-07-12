export function capture(env: Env, event: string, distinctId: string, properties: Record<string, unknown> = {}) {
  if (!env.POSTHOG_KEY) return;
  const host = env.POSTHOG_HOST ?? 'https://us.i.posthog.com';
  void fetch(`${host.replace(/\/$/, '')}/capture/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ api_key: env.POSTHOG_KEY, event, distinct_id: distinctId, properties }) }).catch(() => undefined);
}
