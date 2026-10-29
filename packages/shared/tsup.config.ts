import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // tsup 8 sets the deprecated `baseUrl` in its own declaration build, which TypeScript 6
  // reports as an error. Our tsconfig does not use it; silence it for the dts step only.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  clean: true,
});
