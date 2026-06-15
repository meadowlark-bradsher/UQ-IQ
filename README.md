# UQ-IQ — Research Blog

Blog about Uncertainty Quantification (UQ) for Agentic AI: an essay on UQ /
Bayesian experimental design interleaved with small interactive React widgets. The
math is computed offline (in the author's Python research repos); this repo ships
only precomputed JSON + client-side JS and does light, exact, client-side
arithmetic (entropy, bitwise AND). Built to the [starter spec](./starter-spec.md).

## Local development

```bash
npm install
npm run dev        # vite dev server
npm test           # vitest (pure-lib acceptance tests)
npm run validate-data   # validate public/data JSON against the contracts
npm run build      # validate-data → tsc → vite build (output in dist/)
npm run preview    # serve the production build locally
```

The essay lives at `/` (HashRouter, so `/#/`). A `/#/sandbox` route renders each
widget standalone so essay copy can change without touching the widgets.

## The `base` / `BASE_PATH` rule (read before deploying)

The deployment base path is defined in **exactly one place** —
[`vite.config.ts`](./vite.config.ts):

```ts
const base = process.env.BASE_PATH ?? '/research-blog/';
```

- `/research-blog/` is the GitHub Pages **project subpath**. If your repo isn't
  named `research-blog`, change this default (and nothing else).
- Every asset and data URL resolves through `import.meta.env.BASE_URL`, exposed via
  [`src/config.ts`](./src/config.ts) (`assetUrl()`). **Never** hardcode a leading-
  slash path like `/data/foo.json` — it breaks under the subpath.
- A later host migration is a one-line change here.

## Routing & the 404 question

This app uses **`HashRouter`**. GitHub Pages has no server-side rewrites, so deep
links to client routes would otherwise 404. Hash routing (`/#/sandbox`) sidesteps
that entirely — **no `public/404.html` is needed**. If you ever switch to
`BrowserRouter`, you must add an SPA 404 fallback.

## Custom domain (optional, recommended)

A custom domain makes the public URL survive any future host migration:

1. Rename `public/CNAME.example` → `public/CNAME` and put your domain in it.
2. Set the base to `/` — run the build with `BASE_PATH=/ npm run build` (or change
   the default in `vite.config.ts`).
3. Configure the domain in **Settings → Pages**.

## Deployment

Pushing to `main` triggers [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml):
checkout → setup-node (LTS) → `npm ci` → `npm test` → `npm run build` → upload
`dist/` as a Pages artifact → deploy.

**One-time setup:** in the GitHub repo, **Settings → Pages → Source = GitHub
Actions**.

## The data seam (forward compatibility)

The single most important architectural constraint. Widgets depend on an **async
interface**, never on JSON directly:

- [`src/data/provider.ts`](./src/data/provider.ts) — the `DataProvider` interface.
- [`src/data/staticProvider.ts`](./src/data/staticProvider.ts) — the only
  implementation today; fetches the precomputed JSON under `public/data`.
- [`src/data/context.tsx`](./src/data/context.tsx) — `useDataProvider()` hook;
  widgets get the provider from React context.

Because all three of "fetch JSON / run Pyodide / call an API" are async, swapping
in a `PyodideProvider` or `ApiProvider` later is a localized change at the context
boundary — **no sync→async refactor**, and nothing in the widgets changes.

Pure deterministic math (EIG, bitwise AND) is **not** behind the provider — it
lives in [`src/lib`](./src/lib) as pure, unit-tested functions. The provider
supplies *data*, not arithmetic.

## Data contracts & fixtures

Types: [`src/data/types.ts`](./src/data/types.ts). Shipped fixtures in
`public/data/` work out of the box; the author replaces them with real outputs.
`scripts/validate-data.ts` checks the JSON against the contracts (including the
§7.2 invariants: shared Q&A multiset, exactly one canonical, at least one flip) and
runs in CI before every build.

## Widgets

- **EigCalculator** (`src/widgets/EigCalculator`) — expected information gain over
  the toy domain. Pure client-side.
- **BitmaskElimination** (`src/widgets/BitmaskElimination`) — meet (bitwise AND)
  elimination with an order-invariance demonstration. Pure client-side.
- **TranscriptReorderer** — *not built yet* (spec §8.2). The data seam for it
  (`getPermutations` / `getCommittedSecret` on the provider, and the
  `transcript-permutations.json` fixture) is in place so it can be added without
  rework.
- **ReportVsActionViewer** — deferred (spec §8); needs the real ECD dataset and a
  new data contract.
