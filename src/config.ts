// Single source of truth for the deployment base path.
//
// Vite resolves `base` (see vite.config.ts) and exposes it as
// import.meta.env.BASE_URL — always with a trailing slash. EVERY asset and data
// URL must be built from BASE_URL so the app works identically at '/' (custom
// domain) and '/research-blog/' (GitHub Pages project subpath). Never write a
// leading-slash absolute path like '/data/foo.json'.
export const BASE_URL = import.meta.env.BASE_URL;

/** Resolve a path relative to the deployment base. `assetUrl('data/x.json')`. */
export function assetUrl(path: string): string {
  const trimmed = path.replace(/^\/+/, '');
  return `${BASE_URL}${trimmed}`;
}
