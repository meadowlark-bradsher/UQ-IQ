# Research Blog — Repository Specification

**Audience:** an implementing coding agent.
**Status of this doc:** architecture and data contracts are locked; widget *content/framing* for sections after §7 of the talk may still change, so build widgets against the **data contracts**, not against hard-coded copy.

---

## 1. What this is

A static research blog that hosts an essay (a UQ / Bayesian-experimental-design talk) interleaved with small interactive widgets. It also links to the canonical math implementations, which live in **Python** in a separate location (the author's research repos), not in this repo. The blog itself ships only precomputed data + client-side JS.

This is the MVP. It is deliberately the simplest deployable thing that does not paint us into a corner.

### Goals
- Deploys as static files to **GitHub Pages** via GitHub Actions on push to `main`.
- Prose pages with **React** widgets embedded inline.
- Widgets are driven by **precomputed JSON** data files (the math is run offline by the author; this repo only visualizes results and does light, exact, client-side arithmetic like entropy/bitwise-AND).
- The architecture must allow two later upgrades **without a rewrite**: (a) running Python in the browser via Pyodide, and (b) calling a remote compute API. See §6.

### Non-goals (explicitly deferred — do **not** build now)
- No Pyodide / WebAssembly Python runtime.
- No backend, serverless functions, or remote API calls.
- No live LLM calls from the browser.
- No auth, no database, no analytics.

Leave clean seams for these (§6); do not implement them.

---

## 2. Locked tech-stack decisions

These are decisions, not suggestions. Override only with author sign-off.

- **Build tool:** Vite.
- **Framework:** React 18 + **TypeScript**. (TS is required — the data contracts in §7 are the spec's backbone and must be typed.)
- **Authoring layer:** **MDX** (`@mdx-js/rollup`) so prose lives in `.mdx` files with widgets imported as components. The author maintains markdown in Obsidian, so MDX is the natural target. If MDX integration proves costly, fall back to plain `.tsx` page components — but keep widgets as standalone components either way.
- **Styling:** Tailwind CSS. Keep a small set of design tokens (colors, spacing, type scale) in the Tailwind config; do not scatter magic values.
- **Charts:** **Recharts** for standard plots (bar/line, distributions, reliability diagrams). Use **raw SVG or D3** only for bespoke visuals (the bitmask grid, lattice traversal). Do not pull in D3 for things Recharts already does.
- **Routing:** keep it minimal. A single-page essay or a small number of routes is fine. If you use a client-side router, you **must** add the GitHub Pages 404 fallback (§5).
- **Package manager:** npm.

---

## 3. Repository structure

```
research-blog/
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions → Pages
├── public/
│   ├── 404.html                  # SPA fallback (see §5)
│   └── data/
│       ├── twentyq-domain.json       # shared toy domain (§7.1)
│       └── transcript-permutations.json  # curated experiment data (§7.2)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── config.ts                 # reads BASE_URL; single source for base path
│   ├── data/
│   │   ├── types.ts              # ALL data-contract types (§7)
│   │   ├── provider.ts           # DataProvider interface (§6)
│   │   └── staticProvider.ts     # StaticJsonProvider implementation
│   ├── lib/
│   │   ├── entropy.ts            # entropy(), eig(), pure functions
│   │   └── bitmask.ts            # mask ops, AND/complement, survivor sets
│   ├── components/
│   │   ├── WidgetFrame.tsx       # shared loading/error/empty shell
│   │   ├── Loading.tsx
│   │   └── ErrorState.tsx
│   ├── widgets/
│   │   ├── EigCalculator/
│   │   ├── TranscriptReorderer/
│   │   └── BitmaskElimination/
│   └── content/                  # .mdx essay pages (or pages/ if TSX)
├── scripts/
│   └── validate-data.ts          # validates JSON in public/data against types
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

Each widget folder contains `index.tsx` (the component), an optional local `types.ts` for props, and is self-contained.

---

## 4. Widget contract (applies to all widgets)

Every widget:
1. Is a self-contained React component with **no required props** beyond an optional dataset id, so it can be dropped into MDX as `<EigCalculator />`.
2. Gets its **data** through the `DataProvider` (§6), never by importing JSON directly. Pure math (entropy, bitwise AND) runs inline in the widget via `src/lib/*`.
3. Renders three states via `WidgetFrame`: **loading**, **error**, **ready**. No widget should ever render a raw crash or an empty white box.
4. Is responsive down to ~360px width and usable on touch.
5. Is keyboard-operable for its primary interaction where feasible.

---

## 5. Build & deploy

### Vite config
- Set `base` from an env var, defaulting to the project subpath, e.g. `base: process.env.BASE_PATH ?? '/research-blog/'`. **Never hardcode the repo name anywhere except this one place.** All asset and data URLs must resolve through `import.meta.env.BASE_URL` (exposed in `src/config.ts`).
- This is the one thing that makes a later host migration a one-line change.

### Data fetching & base path
- `staticProvider` fetches from `` `${import.meta.env.BASE_URL}data/<file>.json` ``. Do not write `/data/...` (breaks under the Pages subpath).

### SPA fallback (only if using a client-side router)
- GitHub Pages has no server rewrites, so deep links 404. Add `public/404.html` that redirects into the app, or use HashRouter to avoid the problem entirely. Pick one and document it in the README.

### GitHub Actions (`deploy.yml`)
- Trigger: push to `main`.
- Steps: checkout → setup-node (LTS) → `npm ci` → `npm run build` → upload `dist/` as a Pages artifact (`actions/upload-pages-artifact`) → deploy (`actions/deploy-pages`).
- Repo Settings → Pages → Source = **GitHub Actions**.

### Custom domain (recommended, optional)
- If the author provides a domain, add a `public/CNAME` file and set `base` to `'/'`. This makes the public URL survive any future host migration. Leave a commented placeholder in `public/` and a README note.

---

## 6. The data seam (the forward-compatibility requirement)

This is the single most important architectural constraint. Widgets must depend on an **async interface**, not on JSON, even though JSON is synchronous-ish. Today the implementation fetches JSON; tomorrow it runs Pyodide or hits an API. Because all three are async, the swap is a localized edit with **no sync→async refactor**.

```ts
// src/data/provider.ts
import type { TwentyQDomain, TranscriptPermutation, SecretResult } from './types';

export interface DataProvider {
  getDomain(domainId: string): Promise<TwentyQDomain>;
  getPermutations(experimentId: string): Promise<TranscriptPermutation[]>;
  // For an arbitrary ordering: today a lookup in the curated table;
  // later a live model call. Keep it async and on the provider.
  getCommittedSecret(experimentId: string, orderingId: string): Promise<SecretResult>;
}
```

- Implement **only** `StaticJsonProvider` now. It reads the JSON files and serves from them (including an in-memory index for `getCommittedSecret`).
- Provide the provider to widgets via React context (a `useDataProvider()` hook). Widgets never import `staticProvider` directly.
- **Do not** put pure deterministic math (EIG, bitwise AND) behind the provider — those are exact client computations in `src/lib`. The provider supplies *data* (domains, experiment results), not arithmetic.

Later (out of scope now): add `PyodideProvider` / `ApiProvider` implementing the same interface; swap at the context boundary. Nothing in the widgets changes.

---

## 7. Data contracts

These types are the contract between this repo and the author's offline data-generation (Python). They are the most stable part of the spec — build to them. Put them in `src/data/types.ts`. The author supplies real data; ship the example data below as fixtures so the widgets work out of the box.

### 7.1 Shared toy domain — `twentyq-domain.json`

Powers **EigCalculator** (§8.1) and **BitmaskElimination** (§8.3). Keep it small and legible (8–16 secrets, a handful of questions) — this is a teaching toy, **not** the full Bridge Experiment domain (128 secrets / ~122k questions). The author may later swap in a curated subset derived from the real CMBS data; the shape must not change.

```ts
export interface TwentyQDomain {
  domainId: string;
  secrets: { id: string; label: string }[];
  // Each question's `yesIds` lists the secrets that answer "yes".
  // The lib derives the bitmask; JSON stays human-readable.
  questions: { id: string; text: string; yesIds: string[] }[];
  // Optional prior over secrets; if absent, assume uniform.
  prior?: Record<string /* secretId */, number>;
}
```

Example fixture (ship this):

```json
{
  "domainId": "animals-toy",
  "secrets": [
    {"id": "eagle", "label": "Eagle"}, {"id": "penguin", "label": "Penguin"},
    {"id": "shark", "label": "Shark"}, {"id": "dolphin", "label": "Dolphin"},
    {"id": "snake", "label": "Snake"}, {"id": "frog", "label": "Frog"},
    {"id": "bat", "label": "Bat"}, {"id": "spider", "label": "Spider"}
  ],
  "questions": [
    {"id": "q_fly",   "text": "Can it fly?",              "yesIds": ["eagle", "bat"]},
    {"id": "q_water", "text": "Does it live in water?",   "yesIds": ["penguin", "shark", "dolphin", "frog"]},
    {"id": "q_mammal","text": "Is it a mammal?",          "yesIds": ["dolphin", "bat"]},
    {"id": "q_legs",  "text": "Does it have >4 legs?",    "yesIds": ["spider"]},
    {"id": "q_cold",  "text": "Is it cold-blooded?",      "yesIds": ["shark", "snake", "frog", "spider"]}
  ]
}
```

### 7.2 Curated transcript permutations — `transcript-permutations.json`

Powers **TranscriptReorderer** (§8.2). Because free-form reordering over a real LLM is infeasible to precompute exhaustively and we have no live model in the MVP, this widget runs on a **curated set of permutations**, each produced offline by the author's Bridge Experiment run, each carrying the model's committed secret. Ship a small placeholder; the author replaces it with real outputs.

```ts
export interface QAPair { questionId: string; questionText: string; answer: 'yes' | 'no'; }

export interface SecretResult {
  committedSecret: string;     // secret id or free-text label
  confidence?: number;         // optional, 0..1
  posterior?: Record<string, number>; // optional distribution over secrets
}

export interface TranscriptPermutation {
  orderingId: string;
  isCanonical?: boolean;       // mark the "original" order
  sequence: QAPair[];          // same multiset of Q&A across permutations, reordered
  result: SecretResult;        // what the model committed to for THIS ordering
}
```

All permutations in one experiment must share the **same multiset** of `QAPair`s (only the order differs) — that's the whole point. At least one non-canonical permutation must have a `committedSecret` differing from the canonical one (the flip).

---

## 8. Widget specifications (the three 20Q widgets)

Build order: **§8.1 (EigCalculator) and §8.3 (BitmaskElimination) first** — they are pure client-side, depend only on the toy domain, and map to stable talk sections. **§8.2 (TranscriptReorderer) last** — it depends on offline experiment data and its talk framing (§9/§14) may still move.

### 8.1 EigCalculator — talk §3 (information gain)

**Purpose:** build intuition for why some 20Q questions are better than others — expected information gain.

**Model:** a prior over the domain's secrets (uniform if none given). A question partitions secrets into a yes-group and a no-group (from `yesIds`). For a binary question:
- `p = P(answer = yes) = Σ prior over yes-group`
- `EIG = H(prior) − [ p · H(posterior | yes) + (1−p) · H(posterior | no) ]`
- where each posterior renormalizes the prior over the surviving group. Use bits (log base 2). Put `entropy()` and `eig()` in `src/lib/entropy.ts`.

**Interaction:**
- Show the secrets with current prior (bars).
- Let the reader either (a) pick a preset question from the domain, or (b) build a custom question by toggling which secrets answer "yes".
- Display: p(yes), the two group entropies, expected posterior entropy, and the resulting **EIG** (a prominent number + a bar/gauge).
- Show all preset questions ranked by EIG and **highlight the greedy max-EIG choice**.

**Teaching edges to surface:**
- A question that sends all secrets to one side → EIG = 0. Make this visible if the reader builds it ("this question tells you nothing").
- A 50/50 split over a uniform prior maximizes one-step gain.

**Acceptance:**
- EIG matches hand-computed values for the fixture (include a unit test for `q_fly` and `q_water` under uniform prior).
- Greedy question is highlighted and matches the max of the listed EIGs.
- Degenerate (all-yes or all-no) question reports exactly 0.

### 8.2 TranscriptReorderer — talk §9 / §14 (transcript conditioning / order invariance)

**Purpose:** show that reordering the Q&A in a transcript can change the secret the model commits to — i.e., the model has no order-invariant belief, contradicting what a sound meet-semilattice updater would do.

**Interaction (MVP, curated):**
- Load the permutations for an experiment via `getPermutations`.
- Present the canonical ordering's Q&A sequence with **drag-to-reorder** of the Q&A cards.
- On reorder, resolve the result via `getCommittedSecret(experimentId, orderingId)`. In the MVP the provider snaps the dragged ordering to the nearest curated permutation (or offers a stepper/carousel through the curated permutations if free drag is too loose) and returns its stored `result`.
- Prominently display the **committed secret**, and when it **differs from the canonical** secret, emphasize the flip (color, label "the secret changed").
- Include a short annotation slot tying to §14: a commutative meet would give the *same* survivor set regardless of order; the model doesn't.

**Important design note for the implementer:** do **not** attempt to compute the committed secret in the browser — there is no model. The result is always a lookup against curated data in the MVP. The `getCommittedSecret` async signature exists precisely so a later `ApiProvider`/`PyodideProvider` can replace the lookup with a live model call and re-enable true free-form reordering. Keep the widget agnostic to which is in play.

**Acceptance:**
- Reordering to a curated permutation updates the displayed secret from the provider.
- At least one ordering flips the secret vs. canonical, and the flip is visually emphasized.
- The set of Q&A cards is identical across orderings (only order changes); assert this from the data and surface a console warning if violated.

### 8.3 BitmaskElimination — talk §11 → §13/§14 (meet-semilattice / order invariance)

**Purpose:** make the meet operation concrete — each answered question is a constraint, the meet is bitwise AND of feasibility masks, survivors shrink monotonically, and the final survivor set is independent of the order constraints are applied.

**Model:** from the toy domain, each question yields a mask over secrets (1 = consistent with "yes"). Answering "yes" intersects with the mask; "no" intersects with its complement. Put mask construction and ops in `src/lib/bitmask.ts`. Represent masks as bit integers internally; keep the boolean/label view for the UI.

**Interaction:**
- Show all secrets; survivors highlighted, eliminated ones dimmed.
- Let the reader answer questions yes/no; the survivor set and a live **bitmask string** update, plus survivor count and entropy.
- Provide a **reorder control**: change the order in which the applied constraints were imposed and demonstrate the final survivor set is **identical** — the order-invariance payoff for §14. Show the equality explicitly ("same result, any order").

**Acceptance:**
- Applying constraints monotonically shrinks (never grows) the survivor set.
- Reordering the applied constraints yields a byte-identical survivor set; the widget asserts and displays this equality.
- Bitmask string and the boolean survivor view always agree.
- Entropy/count update correctly against the fixture.

### Adjacent candidate (not in this batch)
**ReportVsActionViewer** (talk §5, ECD): a side-by-side of verbalized confidence vs. action distribution from the author's real data. Deferred from this batch because it needs the real ECD dataset and its own data contract. Note it as a planned widget; do not build yet.

---

## 9. Authoring & embedding

- Essay prose lives in `src/content/*.mdx`. Widgets are imported and placed inline: `import { EigCalculator } from '../widgets/EigCalculator'` then `<EigCalculator />`.
- Keep prose and widgets loosely coupled: a widget must render correctly in isolation (e.g., in a Storybook-less dev route) so the essay copy can change freely — which it will, after talk §7.

---

## 10. Conventions & definition of done

- TypeScript strict mode on. No `any` in the data layer.
- All data access through `DataProvider`; lint/grep should find zero direct JSON imports inside `widgets/`.
- `src/lib` functions are pure and unit-tested (entropy, eig, bitmask ops). Include the EigCalculator and BitmaskElimination acceptance tests as actual tests.
- `npm run build` succeeds; the Actions workflow deploys to Pages on `main`.
- `scripts/validate-data.ts` validates the shipped JSON against `types.ts` and runs in CI before build.
- README documents: local dev, the `base`/`BASE_PATH` rule, the 404/router choice, the custom-domain option, and the data-seam contract (so the later Pyodide/API swap is obvious to a future implementer).

---

## 11. Summary of deferred work (leave seams, build nothing)

| Deferred capability | Seam already in place |
|---|---|
| Python in browser (Pyodide) | `DataProvider` async interface (§6) |
| Remote compute API | same `DataProvider` interface |
| Live model calls for free-form transcript reordering | `getCommittedSecret` async on the provider (§8.2) |
| Host migration off GitHub Pages | single `base` config + `BASE_URL`-resolved URLs (§5) |
| URL stability across migration | optional `public/CNAME` (§5) |
| Real ECD report-vs-action widget (§5 of talk) | noted in §8; new data contract TBD |
