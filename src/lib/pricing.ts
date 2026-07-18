export const CREDIT_PACKS = {
  warmup: { id: 'warmup', name: 'WEAK-SAUCE WARMUP', credits: 4, amountCents: 300, line: 'Four reps. Nobody is judging. Yet.' },
  longhaul: { id: 'longhaul', name: 'THE LONG WAY IN', credits: 12, amountCents: 800, line: 'Stop easing in. Start stacking receipts.' },
  fullsend: { id: 'fullsend', name: 'NO MORE EXCUSES', credits: 30, amountCents: 1700, line: 'A month of moves. Make it weirdly inevitable.' },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS;
export const MONTHLY_MAX_PLAN = { name: 'DAILY MAX', amountCents: 1200, dailyCredits: 1 } as const;
export function getPack(id?: string) { return id && id in CREDIT_PACKS ? CREDIT_PACKS[id as CreditPackId] : null; }
