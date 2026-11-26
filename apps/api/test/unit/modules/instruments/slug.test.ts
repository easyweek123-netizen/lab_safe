import { describe, expect, it } from 'vitest';
import {
  nextFreeSlug,
  SLUG_BASE_MAX_LENGTH,
  slugify,
} from '../../../../src/modules/instruments/slug';

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('slugify', () => {
  it('S04.2 AC2 makes "Rotary evaporator" rotary-evaporator', () => {
    expect(slugify('Rotary evaporator')).toBe('rotary-evaporator');
  });

  it('S04.2 AC2 removes accents and joins every run of other characters with one hyphen', () => {
    expect(slugify('Büchi R-300 / Rotavapor')).toBe('buchi-r-300-rotavapor');
    expect(slugify('Crème brûlée — Ñandú')).toBe('creme-brulee-nandu');
    expect(slugify('  pH   meter (bench) ')).toBe('ph-meter-bench');
  });

  it('S04.2 AC2 answers instrument for a name with no letter or digit', () => {
    expect(slugify('— / ★ —')).toBe('instrument');
    expect(slugify('   ')).toBe('instrument');
    expect(slugify('微波炉')).toBe('instrument');
  });

  it('S04.2 AC2 keeps at most 80 characters from the name and never ends in a hyphen', () => {
    const long = slugify('a'.repeat(200));
    expect(long).toBe('a'.repeat(SLUG_BASE_MAX_LENGTH));
    expect(SLUG_BASE_MAX_LENGTH).toBe(80);

    // The cut falls right after a hyphen: position 80 would be "-".
    const cutAtHyphen = slugify(`${'b'.repeat(79)} c${'d'.repeat(30)}`);
    expect(cutAtHyphen).toBe('b'.repeat(79));
    expect(cutAtHyphen.endsWith('-')).toBe(false);

    for (const name of ['x '.repeat(100), `${'é'.repeat(81)}!`, '-a-', 'Büchi R-300 / Rotavapor']) {
      const slug = slugify(name);
      expect(slug.length).toBeLessThanOrEqual(SLUG_BASE_MAX_LENGTH);
      expect(slug).toMatch(SLUG_FORMAT);
    }
  });
});

describe('nextFreeSlug', () => {
  it('S04.2 AC2 takes the base when it is free', () => {
    expect(nextFreeSlug('rotary-evaporator', [])).toBe('rotary-evaporator');
    expect(nextFreeSlug('rotary-evaporator', ['rotary-evaporator-2'])).toBe('rotary-evaporator');
  });

  it('S04.2 AC2 adds -2, then -3, for a taken base', () => {
    expect(nextFreeSlug('rotary-evaporator', ['rotary-evaporator'])).toBe('rotary-evaporator-2');
    expect(nextFreeSlug('rotary-evaporator', ['rotary-evaporator', 'rotary-evaporator-2'])).toBe(
      'rotary-evaporator-3',
    );
    expect(
      nextFreeSlug('rotary-evaporator', [
        'rotary-evaporator',
        'rotary-evaporator-3',
        'rotary-evaporator-pump',
      ]),
    ).toBe('rotary-evaporator-2');
  });
});
