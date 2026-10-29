// ESLint flat config for the whole workspace (E01 design §1, BE-06).
// S01.2 FE-01 adds the React block for apps/web/**.
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      // Playwright writes these next to its config (`e2e/`); a failed run leaves trace-viewer JS there.
      '**/playwright-report/**',
      '**/test-results/**',
      '.claude/',
      '.qodo/',
      'docs/',
    ],
  },
  js.configs.recommended,
  // Not the type-aware set, to keep lint fast; `pnpm typecheck` covers the types.
  tseslint.configs.recommended,
  {
    files: ['apps/api/**', 'packages/**', 'e2e/**', '*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    // The Vite config runs in Node, not in the browser.
    files: ['apps/web/vite.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
