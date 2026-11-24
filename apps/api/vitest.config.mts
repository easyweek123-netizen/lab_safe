import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// `.mts`: the API package is CommonJS, but Vite loads its config as an ES module.
export default defineConfig({
  // SWC instead of esbuild, so Nest decorators and their metadata work in tests.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    // Tests use the shared sources directly, so they never need a shared build.
    alias: {
      '@labsafe/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['test/unit/**/*.test.ts'],
  },
});
