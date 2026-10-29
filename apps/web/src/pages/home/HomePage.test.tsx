import { HAZARD_TYPES } from '@labsafe/shared';
import { screen, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { metaListsFixture, server } from '../../test/msw';
import { renderApp } from '../../test/render';

const LISTS = '*/api/meta/lists';

/** The success state: heading 1 "LabSafe" and the two rooms of the fixture. */
async function expectListsShown() {
  expect(await screen.findByRole('heading', { level: 1, name: 'LabSafe' })).toBeInTheDocument();
  const rooms = screen.getByRole('list', { name: 'Lab rooms' });
  expect(within(rooms).getByText('LAB-101 · Teaching lab 1')).toBeInTheDocument();
  expect(within(rooms).getByText('LAB-102 · Teaching lab 2')).toBeInTheDocument();
}

/** The error state of AC6: the alert, the Retry button and no loading text. */
async function expectErrorShown() {
  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load, try again.");
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
}

describe('Home page', () => {
  it('TC-4.1 shows an announced "Loading…" placeholder while the lists have not answered', async () => {
    server.use(
      http.get(LISTS, async () => {
        await delay('infinite');
        return HttpResponse.json(metaListsFixture);
      }),
    );
    renderApp('/');

    expect(await screen.findByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByText('LAB-101 · Teaching lab 1')).not.toBeInTheDocument();
    expect(screen.queryByText(HAZARD_TYPES[0].label)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('TC-5.1 shows the heading, the purpose line, every lab room and every hazard type', async () => {
    renderApp('/');

    await expectListsShown();
    expect(
      screen.getByText('Safety information for every instrument in our chemistry lab.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Lab rooms' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Hazard types' })).toBeInTheDocument();

    const rooms = within(screen.getByRole('list', { name: 'Lab rooms' })).getAllByRole('listitem');
    expect(rooms.map((item) => item.textContent)).toEqual([
      'LAB-101 · Teaching lab 1',
      'LAB-102 · Teaching lab 2',
    ]);

    const hazards = within(screen.getByRole('list', { name: 'Hazard types' })).getAllByRole(
      'listitem',
    );
    expect(hazards.map((item) => item.textContent)).toEqual(
      metaListsFixture.hazardTypes.map((hazard) => hazard.label),
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('TC-6.1 shows "Couldn\'t load, try again." and a Retry button when the API answers 500', async () => {
    server.use(
      http.get(LISTS, () =>
        HttpResponse.json(
          { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' },
          { status: 500 },
        ),
      ),
    );
    renderApp('/');

    await expectErrorShown();
    expect(screen.queryByRole('heading', { level: 1, name: 'LabSafe' })).not.toBeInTheDocument();
  });

  it('TC-6.2 shows the same error state when the body does not match the contract', async () => {
    server.use(http.get(LISTS, () => HttpResponse.json({ hazardTypes: 'oops' })));
    renderApp('/');

    await expectErrorShown();
    expect(screen.queryByRole('heading', { level: 1, name: 'LabSafe' })).not.toBeInTheDocument();
  });

  it('TC-6.3 shows "Loading…" while Retry runs, then the lists, when the first request had a network error', async () => {
    let releaseRetry: () => void = () => {};
    const retryAnswered = new Promise<void>((resolve) => {
      releaseRetry = resolve;
    });
    let calls = 0;
    server.use(
      http.get(LISTS, async () => {
        calls += 1;
        if (calls === 1) return HttpResponse.error();
        await retryAnswered;
        return HttpResponse.json(metaListsFixture);
      }),
    );
    const { user } = renderApp('/');

    await expectErrorShown();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    // While the retry is running: the announced loading text replaces the old error.
    expect(await screen.findByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();

    releaseRetry();
    await expectListsShown();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('TC-7.2 leads from the not-found page to the home page with the rooms', async () => {
    const { user } = renderApp('/does-not-exist');

    await user.click(await screen.findByRole('link', { name: 'Go to the home page' }));

    await expectListsShown();
    expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument();
  });
});
