import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './scripts/test-db-guard.js';

// API integration tests (E01 design §6, E01-D5): the real Nest app against `labsafe_test` only.
// The same SWC plugin and `@labsafe/shared` alias as `vitest.config.mts`. The `test:int` script
// loads this file with `--configLoader runner`, because it imports a CommonJS `.ts` file.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: {
      '@labsafe/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['test/**/*.int.test.ts'],
    // One file at a time: every file shares the one migrated schema.
    fileParallelism: false,
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup-file.ts'],
    // Wins over any `DATABASE_URL` in the shell, so the app under test uses `labsafe_test`.
    env: { NODE_ENV: 'test', DATABASE_URL: TEST_DATABASE_URL },
  },
});
