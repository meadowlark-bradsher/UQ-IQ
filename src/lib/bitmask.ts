// Pure bitmask / meet-semilattice operations (spec §8.3). Masks are bit integers
// internally (bit i = secret i in the domain's secret order, 1 = consistent);
// the boolean/label view is derived for the UI. Toy domains are ≤ 16 secrets, so
// a JS number is safely exact.

/** All-ones mask for n secrets (the top of the lattice: everything feasible). */
export function fullMask(n: number): number {
  if (n < 0 || n > 31) throw new Error(`fullMask: n out of range: ${n}`);
  return n === 0 ? 0 : (1 << n) - 1;
}

/** Build a question's "yes" mask: bit i set iff secretOrder[i] is in yesIds. */
export function yesMask(secretOrder: string[], yesIds: string[]): number {
  const yes = new Set(yesIds);
  let mask = 0;
  secretOrder.forEach((id, i) => {
    if (yes.has(id)) mask |= 1 << i;
  });
  return mask;
}

/** The complement of a mask within an n-secret domain ("no" feasibility). */
export function complement(mask: number, n: number): number {
  return fullMask(n) & ~mask;
}

export type Answer = 'yes' | 'no';

/**
 * Apply one answered question to the current survivor mask via meet (bitwise
 * AND). "yes" intersects with the question mask; "no" with its complement.
 * Monotonic: the result is always a subset of `current`.
 */
export function applyAnswer(current: number, qMask: number, answer: Answer, n: number): number {
  return answer === 'yes' ? current & qMask : current & complement(qMask, n);
}

export interface Constraint {
  qMask: number;
  answer: Answer;
}

/**
 * Meet of a sequence of constraints, starting from the full mask. Because AND is
 * commutative and associative, the result is independent of order — that is the
 * §14 order-invariance payoff. (See bitmask.test.ts.)
 */
export function meet(constraints: Constraint[], n: number): number {
  return constraints.reduce((m, c) => applyAnswer(m, c.qMask, c.answer, n), fullMask(n));
}

/** Number of set bits (survivor count). */
export function popcount(mask: number): number {
  let m = mask;
  let count = 0;
  while (m) {
    m &= m - 1;
    count++;
  }
  return count;
}

/** Indices (secret positions) that survive in the mask, ascending. */
export function survivorIndices(mask: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (mask & (1 << i)) out.push(i);
  }
  return out;
}

/**
 * Fixed-width bit string in **secret order**: secret 0 leftmost, secret n−1
 * rightmost. This matches the on-screen left-to-right secret layout used by every
 * mask widget (so the string reads the same as the grid above it). Note this is
 * the reverse of standard place-value binary, where bit 0 is rightmost.
 */
export function maskToString(mask: number, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    s += mask & (1 << i) ? '1' : '0';
  }
  return s;
}
