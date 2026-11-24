import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('S02.1 AC9 keeps a local path', () => {
    expect(safeNext('/contribute')).toBe('/contribute');
    expect(safeNext('/admin/sign-ups?page=2#top')).toBe('/admin/sign-ups?page=2#top');
  });

  it('S02.1 AC9 means /contribute when there is no next value', () => {
    expect(safeNext(null)).toBe('/contribute');
    expect(safeNext('')).toBe('/contribute');
  });

  it.each([
    '//evil.example',
    'https://evil.example',
    'http://evil.example/contribute',
    'javascript:alert(1)',
    '/\\evil.example',
    'contribute',
    ' /contribute',
  ])('S02.1 AC9 ignores %s, which is not a local path', (next) => {
    expect(safeNext(next)).toBe('/contribute');
  });
});
