// Pure, exact client-side information theory (spec §8.1). Bits = log base 2.
// These run inline in widgets; they are NOT behind the DataProvider (§6).

/** Shannon entropy (bits) of a set of weights. Weights are normalized first;
 *  zero/near-zero terms contribute 0. Returns 0 for an empty or all-zero set. */
export function entropy(weights: number[]): number {
  const total = weights.reduce((a, w) => a + Math.max(0, w), 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const w of weights) {
    if (w <= 0) continue;
    const p = w / total;
    h -= p * Math.log2(p);
  }
  return h;
}

export interface EigBreakdown {
  /** P(answer = yes) under the prior. */
  pYes: number;
  /** Entropy of the prior (bits). */
  hPrior: number;
  /** Entropy of the posterior given "yes" (bits). */
  hYes: number;
  /** Entropy of the posterior given "no" (bits). */
  hNo: number;
  /** p·H(yes) + (1−p)·H(no). */
  expectedPosteriorEntropy: number;
  /** Expected information gain = hPrior − expectedPosteriorEntropy (bits). */
  eig: number;
}

/**
 * Expected information gain of a binary question over a prior.
 *
 * @param prior  per-secret weights (need not be normalized).
 * @param isYes  per-secret membership in the question's yes-group (aligned).
 *
 * EIG = H(prior) − [ p·H(posterior|yes) + (1−p)·H(posterior|no) ].
 * A degenerate question (all-yes or all-no) yields exactly 0.
 */
export function eig(prior: number[], isYes: boolean[]): EigBreakdown {
  if (prior.length !== isYes.length) {
    throw new Error(`eig: prior length ${prior.length} != isYes length ${isYes.length}`);
  }
  const total = prior.reduce((a, w) => a + Math.max(0, w), 0);
  const yesWeights: number[] = [];
  const noWeights: number[] = [];
  let yesMass = 0;
  prior.forEach((w, i) => {
    const v = Math.max(0, w);
    if (isYes[i]) {
      yesWeights.push(v);
      yesMass += v;
    } else {
      noWeights.push(v);
    }
  });

  const pYes = total > 0 ? yesMass / total : 0;
  const hPrior = entropy(prior);
  const hYes = entropy(yesWeights);
  const hNo = entropy(noWeights);
  const expectedPosteriorEntropy = pYes * hYes + (1 - pYes) * hNo;
  const eigValue = hPrior - expectedPosteriorEntropy;

  return {
    pYes,
    hPrior,
    hYes,
    hNo,
    expectedPosteriorEntropy,
    // Clamp tiny negative round-off to 0; degenerate questions are exactly 0.
    eig: Math.abs(eigValue) < 1e-12 ? 0 : eigValue,
  };
}
