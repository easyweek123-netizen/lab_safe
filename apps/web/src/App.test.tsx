import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test/render';

describe('App shell', () => {
  it('TC-3.1 shows a header with the LabSafe wordmark linking home and one main area', async () => {
    renderApp('/');

    const banner = await screen.findByRole('banner');
    const wordmark = within(banner).getByRole('link', { name: 'LabSafe' });
    expect(wordmark).toHaveAttribute('href', '/');
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('TC-3.2 declares English, the title LabSafe and a phone viewport in index.html', () => {
    const html = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8');
    const doc = new DOMParser().parseFromString(html, 'text/html');

    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(doc.title).toBe('LabSafe');
    expect(doc.querySelector('meta[name="viewport"]')?.getAttribute('content')).toBe(
      'width=device-width, initial-scale=1',
    );
  });
});
