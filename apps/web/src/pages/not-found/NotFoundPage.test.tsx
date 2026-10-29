import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/render';

describe('Not-found page', () => {
  it('TC-7.1 shows "Page not found" with a link home inside the app shell', async () => {
    renderApp('/does-not-exist');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The page you are looking for does not exist.')).toBeInTheDocument();

    const main = screen.getByRole('main');
    expect(within(main).getByRole('link', { name: 'Go to the home page' })).toHaveAttribute(
      'href',
      '/',
    );

    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: 'LabSafe' })).toHaveAttribute('href', '/');
  });
});
