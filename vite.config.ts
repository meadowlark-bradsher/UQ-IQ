/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// The ONE place the repo name lives. Override with BASE_PATH (e.g. '/' for a
// custom domain). All asset/data URLs must resolve through import.meta.env.BASE_URL
// (see src/config.ts) — never hardcode this path anywhere else.
const base = process.env.BASE_PATH ?? '/research-blog/';

export default defineConfig({
  base,
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkMath],
        rehypePlugins: [rehypeKatex],
      }),
    },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
