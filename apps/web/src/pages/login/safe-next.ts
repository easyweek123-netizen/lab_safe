const DEFAULT_NEXT = '/contribute';

/**
 * Where to go after logging in (S02.1 AC9): `next` only when it is a local path, that is it
 * starts with exactly one `/`. `//host` and `/\host` (which browsers read as `//host`), a scheme
 * such as `https:` or `javascript:`, or no value at all mean `/contribute`.
 */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next[1] === '/' || next[1] === '\\') {
    return DEFAULT_NEXT;
  }
  return next;
}
