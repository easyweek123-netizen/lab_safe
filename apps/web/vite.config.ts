import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Vite for `pnpm dev` (:5173, proxies `/api` to Nest on :3000) and the build;
// Vitest with jsdom for the web component tests (E01 design §5, §6).
const sharedSource = fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url));

/**
 * The `pnpm dev` proxy. `changeOrigin: false` keeps the browser's `Host` (localhost:5173), so it
 * matches the `Origin` the API's `RequestOriginGuard` compares it with; the string form would
 * rewrite `Host` to localhost:3000 and every POST would get 403 (S02.1 review F1).
 */
export const devProxy = {
  '/api': { target: 'http://localhost:3000', changeOrigin: false },
} as const;

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: devProxy,
  },
  resolve: {
    // Tests use the shared sources directly, so they never need a shared build (like the API).
    alias: mode === 'test' ? [{ find: '@labsafe/shared', replacement: sharedSource }] : [],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
