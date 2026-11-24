// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { devProxy } from '../vite.config';

describe('pnpm dev proxy', () => {
  it('S02.1 F1 forwards /api to the API without rewriting Host, so the origin check passes', () => {
    expect(devProxy['/api']).toEqual({ target: 'http://localhost:3000', changeOrigin: false });
  });
});
