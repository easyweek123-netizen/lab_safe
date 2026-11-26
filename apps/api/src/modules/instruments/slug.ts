/** The most characters `slugify` takes from the name, before any `-2` suffix (S04.2 AC2). */
export const SLUG_BASE_MAX_LENGTH = 80;

/** The address of a page whose name has no letter or digit. */
const FALLBACK_SLUG = 'instrument';

/**
 * The public address made from an instrument's name (E04-D3): NFKD with the accents removed,
 * lowercase ASCII, every run of other characters one hyphen, no hyphen at either end, at most
 * `SLUG_BASE_MAX_LENGTH` characters, and `instrument` when nothing is left. The result always
 * matches the CHECK `instruments_slug_check`.
 */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_BASE_MAX_LENGTH)
    .replace(/-+$/, '');
  return slug === '' ? FALLBACK_SLUG : slug;
}

/** `base` if no slug in `taken` is `base`, otherwise the first free `base-2`, `base-3` … */
export function nextFreeSlug(base: string, taken: readonly string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) {
    return base;
  }
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
