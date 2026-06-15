// Validates the shipped JSON in public/data against the data contracts in
// src/data/types.ts (spec §10). Runs in CI before build. Exits non-zero on any
// violation. Types are erased at runtime, so the checks are hand-written but
// mirror types.ts exactly.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { TwentyQDomain, TranscriptPermutation, QAPair } from '../src/data/types';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../public/data');

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

function load<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, file), 'utf8')) as T;
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// ── twentyq-domain.json (§7.1) ──────────────────────────────────────────────
function validateDomain() {
  const d = load<TwentyQDomain>('twentyq-domain.json');
  const ctx = 'twentyq-domain.json';
  if (!isStr(d.domainId)) fail(`${ctx}: domainId must be a non-empty string`);
  if (!Array.isArray(d.secrets) || d.secrets.length === 0)
    return fail(`${ctx}: secrets must be a non-empty array`);

  const secretIds = new Set<string>();
  d.secrets.forEach((s, i) => {
    if (!isStr(s.id) || !isStr(s.label)) fail(`${ctx}: secrets[${i}] needs string id+label`);
    if (secretIds.has(s.id)) fail(`${ctx}: duplicate secret id "${s.id}"`);
    secretIds.add(s.id);
  });

  if (!Array.isArray(d.questions) || d.questions.length === 0)
    return fail(`${ctx}: questions must be a non-empty array`);
  const qIds = new Set<string>();
  d.questions.forEach((q, i) => {
    if (!isStr(q.id) || !isStr(q.text)) fail(`${ctx}: questions[${i}] needs string id+text`);
    if (qIds.has(q.id)) fail(`${ctx}: duplicate question id "${q.id}"`);
    qIds.add(q.id);
    if (!Array.isArray(q.yesIds)) return fail(`${ctx}: questions[${i}].yesIds must be an array`);
    q.yesIds.forEach((id) => {
      if (!secretIds.has(id)) fail(`${ctx}: questions[${i}] yesId "${id}" is not a known secret`);
    });
  });

  if (d.prior !== undefined) {
    for (const [id, p] of Object.entries(d.prior)) {
      if (!secretIds.has(id)) fail(`${ctx}: prior key "${id}" is not a known secret`);
      if (!isNum(p) || p < 0) fail(`${ctx}: prior["${id}"] must be a non-negative number`);
    }
  }
}

// ── transcript-permutations.json (§7.2) ─────────────────────────────────────
function qaKey(qa: QAPair): string {
  return `${qa.questionId}=${qa.answer}`;
}
function multisetKey(seq: QAPair[]): string {
  return seq.map(qaKey).sort().join('|');
}

function validatePermutations() {
  const perms = load<TranscriptPermutation[]>('transcript-permutations.json');
  const ctx = 'transcript-permutations.json';
  if (!Array.isArray(perms) || perms.length === 0)
    return fail(`${ctx}: must be a non-empty array`);

  const orderingIds = new Set<string>();
  perms.forEach((p, i) => {
    if (!isStr(p.orderingId)) fail(`${ctx}: [${i}].orderingId must be a non-empty string`);
    if (orderingIds.has(p.orderingId)) fail(`${ctx}: duplicate orderingId "${p.orderingId}"`);
    orderingIds.add(p.orderingId);
    if (!Array.isArray(p.sequence) || p.sequence.length === 0)
      fail(`${ctx}: [${i}].sequence must be a non-empty array`);
    p.sequence?.forEach((qa, j) => {
      if (!isStr(qa.questionId) || !isStr(qa.questionText))
        fail(`${ctx}: [${i}].sequence[${j}] needs string questionId+questionText`);
      if (qa.answer !== 'yes' && qa.answer !== 'no')
        fail(`${ctx}: [${i}].sequence[${j}].answer must be 'yes' | 'no'`);
    });
    if (!p.result || !isStr(p.result.committedSecret))
      fail(`${ctx}: [${i}].result.committedSecret must be a non-empty string`);
  });

  // §7.2 invariant: all permutations share the same multiset of QA pairs.
  const keys = perms.map((p) => multisetKey(p.sequence ?? []));
  if (new Set(keys).size > 1)
    fail(`${ctx}: permutations do not all share the same multiset of Q&A pairs`);

  // §7.2 invariant: exactly one canonical, and at least one non-canonical flip.
  const canonicals = perms.filter((p) => p.isCanonical);
  if (canonicals.length !== 1)
    fail(`${ctx}: expected exactly one permutation with isCanonical=true, got ${canonicals.length}`);
  const canonical = canonicals[0];
  if (canonical) {
    const flip = perms.some(
      (p) => !p.isCanonical && p.result.committedSecret !== canonical.result.committedSecret,
    );
    if (!flip)
      fail(`${ctx}: no non-canonical permutation flips the committed secret vs. canonical`);
  }
}

validateDomain();
validatePermutations();

if (errors.length) {
  console.error(`✗ data validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('✓ data validation passed');
