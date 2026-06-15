// Bridges the TwentyQDomain data contract to the pure array-based math in
// entropy.ts / bitmask.ts. The secret order is the canonical index assignment
// used for both prior vectors and bitmasks.
import type { TwentyQDomain } from '../data/types';

export function secretOrder(domain: TwentyQDomain): string[] {
  return domain.secrets.map((s) => s.id);
}

/** Per-secret prior weights aligned to secret order; uniform if none given. */
export function priorVector(domain: TwentyQDomain): number[] {
  if (!domain.prior) return domain.secrets.map(() => 1);
  return domain.secrets.map((s) => domain.prior?.[s.id] ?? 0);
}

/** Per-secret yes-membership aligned to secret order. */
export function yesVector(domain: TwentyQDomain, yesIds: string[]): boolean[] {
  const yes = new Set(yesIds);
  return domain.secrets.map((s) => yes.has(s.id));
}
