import { focusManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import {
  adminUser,
  approvedUser,
  errorResponse,
  INSTRUMENT,
  meHandler,
  publishedPageFixture,
  publishedPageHandler,
  rotavapContent,
  server,
} from '../../test/msw';
import { renderApp } from '../../test/render';

const PAGE = `/instruments/${publishedPageFixture.slug}`;

/** Counts the reads of `GET /api/instruments/:slug`, answering each with `respond`. */
function countingHandler(respond: (call: number) => Response | Promise<Response>) {
  const reads = { count: 0 };
  server.use(
    http.get(INSTRUMENT, () => {
      reads.count += 1;
      return respond(reads.count);
    }),
  );
  return reads;
}

describe('Public safety page', () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it('S04.2 AC4 shows an anonymous visitor every field of the published page as h1 and its sections', async () => {
    server.use(publishedPageHandler(publishedPageFixture));
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: rotavapContent.name }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const article = screen.getByRole('article');
    expect(within(article).getByText('Manufacturer: Büchi')).toBeInTheDocument();
    expect(within(article).getByText('Hazard level: Medium')).toBeInTheDocument();
    expect(
      within(article).getByText('Training required before first use: Yes, given by Dr. Lee'),
    ).toBeInTheDocument();
    expect(within(article).getByText(rotavapContent.description)).toBeInTheDocument();
    expect(within(article).getByText('The water bath reaches 90 °C.')).toBeInTheDocument();
    expect(within(article).getByText(rotavapContent.beforeUse)).toBeInTheDocument();
    expect(within(article).getByText(rotavapContent.safeOperation)).toBeInTheDocument();
    expect(within(article).getByText(rotavapContent.doNot)).toBeInTheDocument();
    expect(within(article).getByText(rotavapContent.emergency)).toBeInTheDocument();
    expect(within(article).getByRole('heading', { level: 2, name: 'Before use' })).toBeVisible();
    expect(screen.getByRole('img', { name: `Photo of ${rotavapContent.name}` })).toHaveAttribute(
      'src',
      expect.stringContaining(rotavapContent.photoId) as string,
    );
  });

  it('S04.2 AC4 shows "Last approved <date> by <the admin\'s name>"', async () => {
    server.use(publishedPageHandler(publishedPageFixture));
    renderApp(PAGE);

    const article = await screen.findByRole('article');
    expect(
      within(article).getByText(
        (_text, element) =>
          element?.tagName === 'P' &&
          element.textContent === `Last approved 26 Nov 2026 by ${adminUser.name}`,
      ),
    ).toBeInTheDocument();
  });

  it('S04.2 AC4 needs no account and shows no contributor name and no email', async () => {
    server.use(publishedPageHandler(publishedPageFixture));
    const { router } = renderApp(PAGE);

    expect(await screen.findByRole('article')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PAGE);
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(approvedUser.name))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(approvedUser.email))).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No access' })).not.toBeInTheDocument();
  });

  it('S04.2 AC4 shows the page to a signed-in contributor too', async () => {
    server.use(meHandler(approvedUser), publishedPageHandler(publishedPageFixture));
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: rotavapContent.name }),
    ).toBeInTheDocument();
  });

  it('S04.2 AC6 shows status "Loading safety page…" while the page loads', async () => {
    server.use(
      http.get(INSTRUMENT, async () => {
        await delay('infinite');
        return HttpResponse.json(publishedPageFixture);
      }),
    );
    renderApp(PAGE);

    expect(await screen.findByRole('status')).toHaveTextContent('Loading safety page…');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('S04.2 AC6 shows "Page not found" for an unknown or unpublished slug', async () => {
    server.use(publishedPageHandler(publishedPageFixture));
    renderApp('/instruments/fume-hood');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('S04.2 AC6 shows "Page not found" for a slug longer than 200 characters without asking the server', async () => {
    const reads = countingHandler(() => HttpResponse.json(publishedPageFixture));
    renderApp(`/instruments/${'a'.repeat(201)}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(reads.count).toBe(0);
  });

  it.each([
    ['a 500', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')],
    ['a network failure', () => HttpResponse.error()],
    ['an answer outside the contract', () => HttpResponse.json({ slug: 'rotary-evaporator' })],
  ])(
    'S04.2 AC6 shows alert "Couldn\'t load this safety page, try again." with Retry after %s',
    async (_label, fail) => {
      const reads = countingHandler((call) =>
        call === 1 ? fail() : HttpResponse.json(publishedPageFixture),
      );
      const { user } = renderApp(PAGE);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Couldn't load this safety page, try again.",
      );
      expect(screen.queryByRole('article')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Retry' }));

      expect(
        await screen.findByRole('heading', { level: 1, name: rotavapContent.name }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(reads.count).toBe(2);
    },
  );

  it.each([
    ['a 500', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')],
    ['a 404', () => errorResponse(404, 'NOT_FOUND', 'Not found.')],
  ])('S04.2 AC6 keeps the page when a background refresh fails with %s', async (_l, fail) => {
    const reads = countingHandler((call) =>
      call === 1 ? HttpResponse.json(publishedPageFixture) : fail(),
    );
    const { queryClient } = renderApp(PAGE);
    expect(await screen.findByRole('article')).toBeInTheDocument();

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() => expect(reads.count).toBe(2));
    await waitFor(() =>
      expect(
        queryClient.getQueryState(['instruments', publishedPageFixture.slug])?.fetchStatus,
      ).toBe('idle'),
    );

    expect(
      screen.getByRole('heading', { level: 1, name: rotavapContent.name }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument();
  });
});
