import type { ReviewQueueItem } from '@labsafe/shared';
import { focusManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import {
  adminUser,
  approvedUser,
  errorResponse,
  meHandler,
  REVIEW_QUEUE,
  reviewQueueFixture,
  reviewQueueHandler,
  server,
} from '../../test/msw';
import { renderApp } from '../../test/render';

const PAGE = '/admin/review';
const [rotavap, fumeHood, centrifuge] = reviewQueueFixture.items as [
  ReviewQueueItem,
  ReviewQueueItem,
  ReviewQueueItem,
];

async function findRows() {
  const list = await screen.findByRole('list', { name: 'Pages to review' });
  return within(list).getAllByRole('listitem');
}

describe('Pages to review', () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it('S04.1 AC1 shows h1 "Pages to review" and one row per pending page with link, "New", submitter and date', async () => {
    server.use(meHandler(adminUser), reviewQueueHandler(reviewQueueFixture));
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pages to review' }),
    ).toBeInTheDocument();
    const rows = await findRows();
    expect(rows).toHaveLength(3);

    const first = rows[0] as HTMLElement;
    expect(within(first).getByRole('link', { name: 'Rotary evaporator' })).toHaveAttribute(
      'href',
      `/admin/review/${rotavap.id}`,
    );
    expect(within(first).getByText('New')).toBeInTheDocument();
    expect(within(first).getByText(`Submitted by ${approvedUser.name}`)).toBeInTheDocument();
    expect(first).toHaveTextContent('Submitted 23 Nov 2026');
  });

  it("S04.1 AC1 lists the rows in the server's order (oldest first), the admin's own page like any other", async () => {
    server.use(meHandler(adminUser), reviewQueueHandler(reviewQueueFixture));
    renderApp(PAGE);

    const rows = await findRows();
    const links = rows.map((row) => within(row).getByRole('link').textContent);
    expect(links).toEqual([rotavap.name, fumeHood.name, centrifuge.name]);

    const own = rows[2] as HTMLElement;
    expect(within(own).getByRole('link', { name: 'Centrifuge' })).toHaveAttribute(
      'href',
      `/admin/review/${centrifuge.id}`,
    );
    expect(within(own).getByText(`Submitted by ${adminUser.name}`)).toBeInTheDocument();
    expect(own).toHaveTextContent('Submitted 25 Nov 2026');
    expect(rows[1] as HTMLElement).toHaveTextContent('Submitted 24 Nov 2026');
  });

  it('S04.1 AC1 keeps the order as received, without sorting it again', async () => {
    server.use(
      meHandler(adminUser),
      reviewQueueHandler({ items: [centrifuge, rotavap, fumeHood] }),
    );
    renderApp(PAGE);

    const rows = await findRows();
    expect(rows.map((row) => within(row).getByRole('link').textContent)).toEqual([
      centrifuge.name,
      rotavap.name,
      fumeHood.name,
    ]);
  });

  it('S04.1 AC1 labels an update "Update", as text', async () => {
    server.use(
      meHandler(adminUser),
      reviewQueueHandler({ items: [{ ...rotavap, kind: 'UPDATE' }] }),
    );
    renderApp(PAGE);

    const [row] = (await findRows()) as [HTMLElement];
    expect(within(row).getByText('Update')).toBeInTheDocument();
    expect(within(row).queryByText('New')).not.toBeInTheDocument();
  });

  it('S04.1 AC1 shows the confirmation from the router state as a status, and nothing without one', async () => {
    server.use(meHandler(adminUser), reviewQueueHandler(reviewQueueFixture));
    const { router } = renderApp(PAGE);

    await findRows();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(() =>
      router.navigate(PAGE, { state: { confirmation: 'Rotary evaporator is published.' } }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Rotary evaporator is published.');
  });

  it('S04.2 AC1 shows the approval confirmation with the link "Open the public page"', async () => {
    server.use(meHandler(adminUser), reviewQueueHandler(reviewQueueFixture));
    const { router, user } = renderApp(PAGE);
    await findRows();

    await act(() =>
      router.navigate(PAGE, {
        state: {
          confirmation: 'Rotary evaporator was approved and published.',
          publicPath: '/instruments/rotary-evaporator',
        },
      }),
    );
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Rotary evaporator was approved and published.');
    const link = within(status).getByRole('link', { name: 'Open the public page' });
    expect(link).toHaveAttribute('href', '/instruments/rotary-evaporator');

    await user.click(link);
    expect(router.state.location.pathname).toBe('/instruments/rotary-evaporator');
  });

  it('S04.2 AC1 shows no public link for a path outside /instruments/ or without one', async () => {
    server.use(meHandler(adminUser), reviewQueueHandler(reviewQueueFixture));
    const { router } = renderApp(PAGE);
    await findRows();

    await act(() =>
      router.navigate(PAGE, {
        state: {
          confirmation: 'Rotary evaporator was approved and published.',
          publicPath: '//evil.test',
        },
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Rotary evaporator was approved and published.',
    );
    expect(screen.queryByRole('link', { name: 'Open the public page' })).not.toBeInTheDocument();
  });

  it('S04.1 AC2 says "No pages waiting for review." when nothing is pending', async () => {
    server.use(meHandler(adminUser), reviewQueueHandler({ items: [] }));
    renderApp(PAGE);

    expect(await screen.findByText('No pages waiting for review.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pages to review' })).not.toBeInTheDocument();
  });

  it('S04.1 AC3 shows "Loading pages to review…" while the list has not answered', async () => {
    server.use(
      meHandler(adminUser),
      http.get(REVIEW_QUEUE, async () => {
        await delay('infinite');
        return HttpResponse.json({ items: [] });
      }),
    );
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pages to review' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading pages to review…');
  });

  it.each([
    ['a 500', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')],
    ['a network error', () => HttpResponse.error()],
  ])('S04.1 AC3 shows the error alert on %s and Retry loads the list again', async (_l, fail) => {
    let calls = 0;
    server.use(
      meHandler(adminUser),
      http.get(REVIEW_QUEUE, () => {
        calls += 1;
        return calls === 1 ? fail() : HttpResponse.json(reviewQueueFixture);
      }),
    );
    const { user } = renderApp(PAGE);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load the pages to review, try again.",
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await findRows()).toHaveLength(3);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it.each([
    ['a 500', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')],
    ['a network error', () => HttpResponse.error()],
  ])(
    'S04.1 AC3 keeps the list on screen when a background refresh fails with %s',
    async (_l, fail) => {
      let calls = 0;
      server.use(
        meHandler(adminUser),
        http.get(REVIEW_QUEUE, () => {
          calls += 1;
          return calls === 1 ? HttpResponse.json(reviewQueueFixture) : fail();
        }),
      );
      const { queryClient } = renderApp(PAGE);
      expect(await findRows()).toHaveLength(3);

      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });
      await waitFor(() => expect(calls).toBe(2));
      await waitFor(() =>
        expect(queryClient.getQueryState(['review-queue'])?.fetchStatus).toBe('idle'),
      );

      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    },
  );

  it('S04.1 AC8 shows "No access" to an approved contributor and never asks for the list', async () => {
    let calls = 0;
    server.use(
      meHandler(approvedUser),
      http.get(REVIEW_QUEUE, () => {
        calls += 1;
        return HttpResponse.json(reviewQueueFixture);
      }),
    );
    const { router } = renderApp(PAGE);

    expect(await screen.findByRole('heading', { level: 1, name: 'No access' })).toBeInTheDocument();
    expect(screen.queryByText(rotavap.name)).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('banner')).queryByRole('link', { name: 'Pages to review' }),
    ).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PAGE);
    expect(calls).toBe(0);
  });

  it('S04.1 AC8 sends an anonymous visitor to /login?next=/admin/review', async () => {
    const { router } = renderApp(PAGE);

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe(PAGE);
  });
});
