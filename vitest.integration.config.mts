import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Integration tests: the real server modules against the local Supabase (pnpm db:start).
// No Stripe calls: money paths that need Stripe are covered by the end-to-end tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `import 'server-only'` throws outside a React Server Components build
      'server-only': fileURLToPath(new URL('./tests/support/empty.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/support/load-env.ts'],
    // The tests share one database
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
