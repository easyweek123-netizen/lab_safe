import { describe, expect, it } from 'vitest';
import * as decisionMessages from '../../pages/admin-review-submission/decision-messages';
import * as messages from './failure-messages';

/** Every web source file except tests, as text. */
const sources = import.meta.glob<string>(['../../**/*.{ts,tsx}', '!../../**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

function exportedTexts(module: Record<string, unknown>): string[] {
  return Object.values(module).filter((value): value is string => typeof value === 'string');
}

describe('failure messages', () => {
  it('S04.4 AC4 has the "try again" texts for offline and an ended session', () => {
    expect(messages.SUBMIT_UNREACHABLE_MESSAGE).toBe(
      "Couldn't reach LabSafe. Your page is still here; check your connection and try again.",
    );
    expect(messages.SESSION_ENDED_MESSAGE).toBe(
      'Your session has ended. Log in again in another tab, then try again here.',
    );
  });

  it('S04.4 AC4 no exported message contains "submit again"', () => {
    const texts = [...exportedTexts(messages), ...exportedTexts(decisionMessages)];

    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).not.toMatch(/submit again/i);
    }
  });

  it('S04.4 AC4 no web source file contains "submit again"', () => {
    const paths = Object.keys(sources);

    expect(paths).toContain('./failure-messages.ts');
    expect(paths.filter((path) => /submit again/i.test(sources[path] ?? ''))).toEqual([]);
  });
});
