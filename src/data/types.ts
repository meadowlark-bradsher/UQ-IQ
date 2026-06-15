// All data-contract types (spec §7). This is the contract between this repo and
// the author's offline (Python) data generation. It is the most stable part of
// the spec — build to it. No `any` in this file.

// ── §7.1 Shared toy domain — twentyq-domain.json ────────────────────────────

export interface Secret {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  text: string;
  // The secrets that answer "yes". The lib derives the bitmask; JSON stays
  // human-readable.
  yesIds: string[];
}

export interface TwentyQDomain {
  domainId: string;
  secrets: Secret[];
  questions: Question[];
  // Optional prior over secrets (keyed by secretId); if absent, assume uniform.
  prior?: Record<string, number>;
}

// ── §7.2 Curated transcript permutations — transcript-permutations.json ──────

export interface QAPair {
  questionId: string;
  questionText: string;
  answer: 'yes' | 'no';
}

export interface SecretResult {
  committedSecret: string; // secret id or free-text label
  confidence?: number; // optional, 0..1
  posterior?: Record<string, number>; // optional distribution over secrets
}

export interface TranscriptPermutation {
  orderingId: string;
  isCanonical?: boolean; // mark the "original" order
  sequence: QAPair[]; // same multiset of Q&A across permutations, reordered
  result: SecretResult; // what the model committed to for THIS ordering
}
