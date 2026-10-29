import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Vite for `pnpm dev` (:5173, proxies `/api` to Nest on :3000) and the build;
// Vitest with jsdom for the web component tests (E01 design §5, §6).
const sharedSource = fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
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
