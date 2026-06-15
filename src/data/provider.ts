import type { TwentyQDomain, TranscriptPermutation, SecretResult } from './types';

// The data seam (spec §6). Widgets depend on this ASYNC interface, never on JSON
// directly. Today the only implementation is StaticJsonProvider (fetches JSON).
// Tomorrow a PyodideProvider or ApiProvider can implement the same interface and
// be swapped in at the context boundary — with NO sync→async refactor, because
// everything here is already a Promise.
//
// NOTE: pure deterministic math (EIG, bitwise AND) does NOT belong here — those
// are exact client computations in src/lib. The provider supplies *data*
// (domains, experiment results), not arithmetic.
export interface DataProvider {
  getDomain(domainId: string): Promise<TwentyQDomain>;
  getPermutations(experimentId: string): Promise<TranscriptPermutation[]>;
  // For an arbitrary ordering: today a lookup in the curated table; later a live
  // model call. Keep it async and on the provider.
  getCommittedSecret(experimentId: string, orderingId: string): Promise<SecretResult>;
}
