import type { ReviewQueueItem } from '@labsafe/shared';
import { focusManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ADMIN_SUBMISSION,
  adminUser,
  APPROVE_SUBMISSION,
  approveDecisionFixture,
  approvedUser,
  errorResponse,
  meHandler,
  REJECT_SUBMISSION,
  rejectDecisionFixture,
  REVIEW_QUEUE,
  reviewQueueFixture,
  reviewQueueHandler,
  reviewSubmissionFixture,
  reviewSubmissionHandler,
  rotavapContent,
  server,
} from '../../test/msw';
import { renderApp } from '../../test/render';

const PAGE = `/admin/review/${reviewSubmissionFixture.id}`;
const UNKNOWN = '/admin/review/4a3b2c1d-0e9f-4a8b-9c7d-6e5f4a3b2cff';

/** Counts the reads of `GET /api/admin/submissions/:id`, answering each with `respond`. */
function countingHandler(respond: (call: number) => Response | Promise<Response>) {
  const reads = { count: 0 };
  server.use(
    http.get(ADMIN_SUBMISSION, () => {
      reads.count += 1;
      return respond(reads.count);
    }),
  );
  return reads;
}

describe('Review a page', () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it('S04.1 AC4 opens "Rotary evaporator" from the list and shows h1 "Review a new page", the submitter, the date and the view', async () => {
    server.use(
      meHandler(adminUser),
      reviewQueueHandler(reviewQueueFixture),
      reviewSubmissionHandler(reviewSubmissionFixture),
    );
    const { user, router } = renderApp('/admin/review');

    const [first] = reviewQueueFixture.items as [ReviewQueueItem];
    await user.click(await screen.findByRole('link', { name: first.name }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Review a new page' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PAGE);
    expect(
      screen.getByText(
        (_text, element) =>
          element?.tagName === 'P' &&
          element.textContent === `Submitted by ${approvedUser.name} on 23 Nov 2026`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: rotavapContent.name }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Photo of ${rotavapContent.name}` })).toHaveAttribute(
      'src',
      expect.stringContaining(rotavapContent.photoId) as string,
    );
    expect(screen.getByRole('article')).toHaveTextContent('Hazard level: Medium');
    expect(screen.getByRole('heading', { level: 3, name: 'Before use' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('S04.1 AC4 shows the submitter only above the view, and no "Last approved" line', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    renderApp(PAGE);

    const article = await screen.findByRole('article');
    expect(within(article).queryByText(/Last approved/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Last approved/)).not.toBeInTheDocument();
    expect(within(article).queryByText(new RegExp(approvedUser.name))).not.toBeInTheDocument();
    // S04.2 adds the decision panel above the view: no decision button inside the view itself.
    expect(
      within(article).queryByRole('button', { name: /Approve|Reject/ }),
    ).not.toBeInTheDocument();
  });

  it('S04.1 AC6 shows status "Loading…" while the page loads', async () => {
    server.use(
      meHandler(adminUser),
      http.get(ADMIN_SUBMISSION, async () => {
        await delay('infinite');
        return HttpResponse.json(reviewSubmissionFixture);
      }),
    );
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Review a new page' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('S04.1 AC6 shows "Page not found" for an unknown id', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    renderApp(UNKNOWN);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Review a new page' })).not.toBeInTheDocument();
  });

  it('S04.1 AC6 shows "Page not found" for a malformed id without asking the server', async () => {
    server.use(meHandler(adminUser));
    const reads = countingHandler(() =>
      errorResponse(400, 'VALIDATION_FAILED', 'Validation failed'),
    );
    renderApp('/admin/review/not-a-uuid');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    await act(() => delay(20));
    expect(reads.count).toBe(0);
  });

  it('S04.1 AC6 shows "Page not found" for a 400 from the server', async () => {
    server.use(meHandler(adminUser));
    countingHandler(() => errorResponse(400, 'VALIDATION_FAILED', 'Validation failed'));
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['a 500', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')],
    ['a network error', () => HttpResponse.error()],
  ])(
    'S04.1 AC6 shows "Couldn\'t load this page, try again." on %s and Retry loads it',
    async (_l, fail) => {
      server.use(meHandler(adminUser));
      const reads = countingHandler((call) =>
        call === 1 ? fail() : HttpResponse.json(reviewSubmissionFixture),
      );
      const { user } = renderApp(PAGE);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Couldn't load this page, try again.",
      );
      expect(
        screen.getByRole('heading', { level: 1, name: 'Review a new page' }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Retry' }));

      expect(
        await screen.findByRole('heading', { level: 2, name: rotavapContent.name }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(reads.count).toBe(2);
    },
  );

  it.each([
    ['a 500', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')],
    ['a 404', () => errorResponse(404, 'NOT_FOUND', 'Not found.')],
  ])('S04.1 AC6 keeps the preview when a background refresh fails with %s', async (_l, fail) => {
    server.use(meHandler(adminUser));
    const reads = countingHandler((call) =>
      call === 1 ? HttpResponse.json(reviewSubmissionFixture) : fail(),
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
        queryClient.getQueryState(['admin-submissions', reviewSubmissionFixture.id])?.fetchStatus,
      ).toBe('idle'),
    );

    expect(
      screen.getByRole('heading', { level: 2, name: rotavapContent.name }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument();
  });

  it('S04.1 AC8 shows "No access" to an approved contributor, none of the page and asks nothing', async () => {
    server.use(meHandler(approvedUser));
    const reads = countingHandler(() => HttpResponse.json(reviewSubmissionFixture));
    const { router } = renderApp(PAGE);

    expect(await screen.findByRole('heading', { level: 1, name: 'No access' })).toBeInTheDocument();
    expect(screen.queryByText(rotavapContent.name)).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('banner')).queryByRole('link', { name: 'Pages to review' }),
    ).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PAGE);
    expect(reads.count).toBe(0);
  });

  it('S04.1 AC8 sends an anonymous visitor to log in', async () => {
    const { router } = renderApp(PAGE);

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe(PAGE);
  });
});

/** `POST /api/admin/submissions/:id/approve` answering each call with `respond`; keeps the bodies. */
function approveHandler(respond: (call: number) => Response | Promise<Response>) {
  const calls: { id: string; body: unknown }[] = [];
  server.use(
    http.post(APPROVE_SUBMISSION, async ({ request, params }) => {
      calls.push({ id: String(params.id), body: await request.json() });
      return respond(calls.length);
    }),
  );
  return calls;
}

async function openPreview() {
  const rendered = renderApp(PAGE);
  await screen.findByRole('article');
  return rendered;
}

describe('Approve a page', () => {
  it('S04.2 AC1 sends the loaded version and goes to "Pages to review" with the confirmation and the public link', async () => {
    server.use(
      meHandler(adminUser),
      reviewSubmissionHandler({ ...reviewSubmissionFixture, version: 3 }),
      reviewQueueHandler({ items: reviewQueueFixture.items.slice(1) }),
    );
    const calls = approveHandler(() => HttpResponse.json(approveDecisionFixture));
    const { user, router } = await openPreview();

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pages to review' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/review');
    expect(calls).toEqual([{ id: reviewSubmissionFixture.id, body: { version: 3 } }]);
    const confirmation = screen.getByRole('status');
    expect(confirmation).toHaveTextContent('Rotary evaporator was approved and published.');
    expect(
      within(confirmation).getByRole('link', { name: 'Open the public page' }),
    ).toHaveAttribute('href', '/instruments/rotary-evaporator');
    const list = await screen.findByRole('list', { name: 'Pages to review' });
    expect(within(list).queryByRole('link', { name: 'Rotary evaporator' })).not.toBeInTheDocument();
  });

  it('S04.2 AC1 reloads the list after approving, so the approved row is gone', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    const queueReads = { count: 0 };
    server.use(
      http.get(REVIEW_QUEUE, () => {
        queueReads.count += 1;
        return HttpResponse.json(
          queueReads.count === 1
            ? reviewQueueFixture
            : { items: reviewQueueFixture.items.slice(1) },
        );
      }),
    );
    approveHandler(() => HttpResponse.json(approveDecisionFixture));
    const { user } = renderApp('/admin/review');

    const [first] = reviewQueueFixture.items as [ReviewQueueItem];
    await user.click(await screen.findByRole('link', { name: first.name }));
    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Rotary evaporator was approved and published.',
    );
    const list = screen.getByRole('list', { name: 'Pages to review' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).queryByRole('link', { name: first.name })).not.toBeInTheDocument();
  });

  it('S04.2 AC1 shows "Approving…" and disables the decision buttons while it is sent', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    approveHandler(async () => {
      await delay('infinite');
      return HttpResponse.json(approveDecisionFixture);
    });
    const { user } = await openPreview();

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    const busy = await screen.findByRole('button', { name: 'Approving…' });
    expect(busy).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('S04.2 AC1 puts the Approve button between the submitter line and the view', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    await openPreview();

    const submitter = screen.getByText(/^Submitted by /);
    const approve = screen.getByRole('button', { name: 'Approve' });
    const article = screen.getByRole('article');
    expect(
      submitter.compareDocumentPosition(approve) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      approve.compareDocumentPosition(article) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('S04.2 AC8 shows the server\'s "already reviewed" alert with "Back to pages to review"', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    approveHandler(() =>
      errorResponse(409, 'ALREADY_REVIEWED', 'This page has already been reviewed.'),
    );
    const { user, router } = await openPreview();

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This page has already been reviewed.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(within(alert).getByRole('link', { name: 'Back to pages to review' })).toHaveAttribute(
      'href',
      '/admin/review',
    );
    expect(router.state.location.pathname).toBe(PAGE);
    expect(
      screen.getByRole('heading', { level: 2, name: rotavapContent.name }),
    ).toBeInTheDocument();
  });

  it.each(['APPROVED', 'REJECTED'] as const)(
    'S04.2 AC8 shows "This page has already been reviewed." and no Approve button for a %s page',
    async (status) => {
      server.use(
        meHandler(adminUser),
        reviewSubmissionHandler({ ...reviewSubmissionFixture, status }),
      );
      renderApp(PAGE);

      expect(await screen.findByText('This page has already been reviewed.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to pages to review' })).toHaveAttribute(
        'href',
        '/admin/review',
      );
      expect(screen.queryByRole('button', { name: /Approve|Reject/ })).not.toBeInTheDocument();
      expect(screen.getByRole('article')).toBeInTheDocument();
    },
  );

  it('S04.2 AC9 shows the "changed" alert with "Reload the page", which loads the current version, then approving works', async () => {
    server.use(meHandler(adminUser), reviewQueueHandler({ items: [] }));
    const reads = countingHandler((call) =>
      HttpResponse.json(
        call === 1
          ? reviewSubmissionFixture
          : {
              ...reviewSubmissionFixture,
              version: 2,
              page: {
                ...reviewSubmissionFixture.page,
                content: { ...rotavapContent, description: 'Corrected description.' },
              },
            },
      ),
    );
    const calls = approveHandler((call) =>
      call === 1
        ? errorResponse(
            409,
            'SUBMISSION_CHANGED',
            'This page changed since you opened it. Review it again.',
          )
        : HttpResponse.json(approveDecisionFixture),
    );
    const { user, router } = await openPreview();

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This page changed since you opened it. Review it again.');
    expect(router.state.location.pathname).toBe(PAGE);

    await user.click(within(alert).getByRole('button', { name: 'Reload the page' }));
    expect(await screen.findByText('Corrected description.')).toBeInTheDocument();
    expect(reads.count).toBe(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/review'));
    expect(calls.map((call) => call.body)).toEqual([{ version: 1 }, { version: 2 }]);
  });

  it.each([
    [
      'offline or a network error',
      () => HttpResponse.error(),
      "Couldn't reach LabSafe. Check your connection and try again.",
    ],
    [
      'a 401',
      () => errorResponse(401, 'UNAUTHENTICATED', 'Not logged in.'),
      'Your session has ended. Log in again in another tab, then try again here.',
    ],
    ['a 403', () => errorResponse(403, 'FORBIDDEN', 'Forbidden.'), 'Only admins can review pages.'],
    [
      'a 500',
      () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error'),
      'Something went wrong on our side. Try again.',
    ],
    [
      'an answer outside the contract',
      () => HttpResponse.json({ id: reviewSubmissionFixture.id, status: 'PUBLISHED' }),
      'Something went wrong on our side. Try again.',
    ],
  ])(
    'S04.2 AC14 on %s keeps the page with one alert above the decision buttons',
    async (_l, fail, text) => {
      server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
      let meReads = 0;
      server.use(
        http.get('*/api/auth/me', () => {
          meReads += 1;
          return HttpResponse.json({ user: adminUser });
        }),
      );
      approveHandler(() => fail());
      const { user, router } = await openPreview();
      const meReadsBefore = meReads;

      await user.click(screen.getByRole('button', { name: 'Approve' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(text);
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      const approve = screen.getByRole('button', { name: 'Approve' });
      expect(approve).toBeEnabled();
      expect(
        alert.compareDocumentPosition(approve) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(router.state.location.pathname).toBe(PAGE);
      expect(
        screen.getByRole('heading', { level: 2, name: rotavapContent.name }),
      ).toBeInTheDocument();
      expect(meReads).toBe(meReadsBefore);
    },
  );

  it('S04.2 AC14 clears the alert when a new decision starts', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    approveHandler(async (call) => {
      if (call === 1) return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
      await delay('infinite');
      return HttpResponse.json(approveDecisionFixture);
    });
    const { user } = await openPreview();

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('button', { name: 'Approving…' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

/** `POST /api/admin/submissions/:id/reject` answering each call with `respond`; keeps the bodies. */
function rejectHandler(respond: (call: number) => Response | Promise<Response>) {
  const calls: { id: string; body: unknown }[] = [];
  server.use(
    http.post(REJECT_SUBMISSION, async ({ request, params }) => {
      calls.push({ id: String(params.id), body: await request.json() });
      return respond(calls.length);
    }),
  );
  return calls;
}

const NOTE = 'The photo is blurry; add the waste step to Safe operation.';

describe('Reject a page', () => {
  it('S04.3 AC1 shows "Approve", the note field and "Reject" above the page, in that order', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    await openPreview();

    const approve = screen.getByRole('button', { name: 'Approve' });
    const note = screen.getByRole('textbox', { name: 'Note for the contributor' });
    const reject = screen.getByRole('button', { name: 'Reject' });
    const article = screen.getByRole('article');
    const follows = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(approve, note)).toBe(true);
    expect(follows(note, reject)).toBe(true);
    expect(follows(reject, article)).toBe(true);
    expect(note).toHaveValue('');
  });

  it('S04.3 AC1 sends the trimmed note and goes to "Pages to review" with the confirmation and no public link', async () => {
    server.use(
      meHandler(adminUser),
      reviewSubmissionHandler(reviewSubmissionFixture),
      reviewQueueHandler({ items: reviewQueueFixture.items.slice(1) }),
    );
    const calls = rejectHandler(() => HttpResponse.json(rejectDecisionFixture));
    const { user, router } = await openPreview();

    await user.type(
      screen.getByRole('textbox', { name: 'Note for the contributor' }),
      `  ${NOTE}{Enter}Second line.  `,
    );
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pages to review' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/review');
    expect(calls).toEqual([
      { id: reviewSubmissionFixture.id, body: { note: `${NOTE}\nSecond line.` } },
    ]);
    // The list may still be loading (its own `status`): find the confirmation by its text.
    const confirmation = screen
      .getAllByRole('status')
      .find((element) =>
        element.textContent.includes(
          'Rotary evaporator was rejected. The contributor can see your note.',
        ),
      );
    expect(confirmation).toBeDefined();
    if (!confirmation) return;
    expect(
      within(confirmation).queryByRole('link', { name: 'Open the public page' }),
    ).not.toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Pages to review' });
    expect(within(list).queryByRole('link', { name: 'Rotary evaporator' })).not.toBeInTheDocument();
  });

  it('S04.3 AC1 reloads the list after rejecting, so the rejected row is gone', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    const queueReads = { count: 0 };
    server.use(
      http.get(REVIEW_QUEUE, () => {
        queueReads.count += 1;
        return HttpResponse.json(
          queueReads.count === 1
            ? reviewQueueFixture
            : { items: reviewQueueFixture.items.slice(1) },
        );
      }),
    );
    rejectHandler(() => HttpResponse.json(rejectDecisionFixture));
    const { user } = renderApp('/admin/review');

    const [first] = reviewQueueFixture.items as [ReviewQueueItem];
    await user.click(await screen.findByRole('link', { name: first.name }));
    await user.type(await screen.findByRole('textbox', { name: 'Note for the contributor' }), NOTE);
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Rotary evaporator was rejected. The contributor can see your note.',
    );
    const list = screen.getByRole('list', { name: 'Pages to review' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).queryByRole('link', { name: first.name })).not.toBeInTheDocument();
  });

  it('S04.3 AC1 shows "Rejecting…" and disables the decision buttons while it is sent', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    rejectHandler(async () => {
      await delay('infinite');
      return HttpResponse.json(rejectDecisionFixture);
    });
    const { user } = await openPreview();

    await user.type(screen.getByRole('textbox', { name: 'Note for the contributor' }), NOTE);
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(await screen.findByRole('button', { name: 'Rejecting…' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
  });

  it('S04.3 AC1 disables "Reject" while an approve is sent', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    approveHandler(async () => {
      await delay('infinite');
      return HttpResponse.json(approveDecisionFixture);
    });
    const { user } = await openPreview();

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('button', { name: 'Approving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
  });

  it.each([
    ['an empty note', ''],
    ['a note of only spaces', '   '],
  ])(
    'S04.3 AC2 refuses %s without sending, shows the message next to the field and focuses it',
    async (_l, typed) => {
      server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
      const calls = rejectHandler(() => HttpResponse.json(rejectDecisionFixture));
      const { user, router } = await openPreview();
      const note = screen.getByRole('textbox', { name: 'Note for the contributor' });

      if (typed) await user.type(note, typed);
      await user.click(screen.getByRole('button', { name: 'Reject' }));

      expect(await screen.findByText('Enter a note for the contributor')).toBeInTheDocument();
      expect(note).toHaveAccessibleDescription('Enter a note for the contributor');
      expect(note).toHaveAttribute('aria-invalid', 'true');
      expect(note).toHaveFocus();
      expect(calls).toEqual([]);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe(PAGE);
    },
  );

  it('S04.3 AC2 refuses a note over 1000 characters without sending', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    const calls = rejectHandler(() => HttpResponse.json(rejectDecisionFixture));
    const { user } = await openPreview();
    const note = screen.getByRole('textbox', { name: 'Note for the contributor' });

    await user.click(note);
    await user.paste('x'.repeat(1001));
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(await screen.findByText('The note must be at most 1000 characters')).toBeInTheDocument();
    expect(note).toHaveFocus();
    expect(calls).toEqual([]);
  });

  it('S04.3 AC2 shows a server 400 for the note next to the field, focused, with no alert', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    rejectHandler(() =>
      HttpResponse.json(
        {
          statusCode: 400,
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          fields: [{ path: 'note', message: 'The note must be at most 1000 characters' }],
        },
        { status: 400 },
      ),
    );
    const { user, router } = await openPreview();
    const note = screen.getByRole('textbox', { name: 'Note for the contributor' });

    await user.type(note, NOTE);
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(await screen.findByText('The note must be at most 1000 characters')).toBeInTheDocument();
    expect(note).toHaveAccessibleDescription('The note must be at most 1000 characters');
    await waitFor(() => expect(note).toHaveFocus());
    expect(note).toHaveValue(NOTE);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(router.state.location.pathname).toBe(PAGE);
  });

  it('S04.3 AC2 does not check the note when approving', async () => {
    server.use(
      meHandler(adminUser),
      reviewSubmissionHandler(reviewSubmissionFixture),
      reviewQueueHandler({ items: [] }),
    );
    const calls = approveHandler(() => HttpResponse.json(approveDecisionFixture));
    const { user, router } = await openPreview();

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/review'));
    expect(calls).toHaveLength(1);
  });

  it('S04.3 AC3 shows the server\'s "already reviewed" alert with "Back to pages to review"', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    rejectHandler(() =>
      errorResponse(409, 'ALREADY_REVIEWED', 'This page has already been reviewed.'),
    );
    const { user, router } = await openPreview();

    await user.type(screen.getByRole('textbox', { name: 'Note for the contributor' }), NOTE);
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This page has already been reviewed.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(within(alert).getByRole('link', { name: 'Back to pages to review' })).toHaveAttribute(
      'href',
      '/admin/review',
    );
    expect(router.state.location.pathname).toBe(PAGE);
    expect(screen.getByRole('textbox', { name: 'Note for the contributor' })).toHaveValue(NOTE);
  });

  it.each([
    [
      'offline or a network error',
      () => HttpResponse.error(),
      "Couldn't reach LabSafe. Check your connection and try again.",
    ],
    [
      'a 401',
      () => errorResponse(401, 'UNAUTHENTICATED', 'Not logged in.'),
      'Your session has ended. Log in again in another tab, then try again here.',
    ],
    ['a 403', () => errorResponse(403, 'FORBIDDEN', 'Forbidden.'), 'Only admins can review pages.'],
    [
      'a 400 without a note field',
      () => errorResponse(400, 'VALIDATION_FAILED', 'Validation failed'),
      'Something went wrong on our side. Try again.',
    ],
    [
      'a 500',
      () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error'),
      'Something went wrong on our side. Try again.',
    ],
    [
      'an answer outside the contract',
      () => HttpResponse.json({ id: reviewSubmissionFixture.id, status: 'DISCARDED' }),
      'Something went wrong on our side. Try again.',
    ],
  ])(
    'S04.3 AC3 on %s keeps the page and the note with one alert above the decision buttons',
    async (_l, fail, text) => {
      server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
      let meReads = 0;
      server.use(
        http.get('*/api/auth/me', () => {
          meReads += 1;
          return HttpResponse.json({ user: adminUser });
        }),
      );
      rejectHandler(() => fail());
      const { user, router } = await openPreview();
      const meReadsBefore = meReads;

      await user.type(screen.getByRole('textbox', { name: 'Note for the contributor' }), NOTE);
      await user.click(screen.getByRole('button', { name: 'Reject' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(text);
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      const approve = screen.getByRole('button', { name: 'Approve' });
      const reject = screen.getByRole('button', { name: 'Reject' });
      expect(reject).toBeEnabled();
      expect(approve).toBeEnabled();
      expect(
        alert.compareDocumentPosition(approve) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByRole('textbox', { name: 'Note for the contributor' })).toHaveValue(NOTE);
      expect(router.state.location.pathname).toBe(PAGE);
      expect(
        screen.getByRole('heading', { level: 2, name: rotavapContent.name }),
      ).toBeInTheDocument();
      expect(meReads).toBe(meReadsBefore);
    },
  );

  it('S04.3 AC3 keeps one alert at a time: a failed approve, then a failed reject', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    approveHandler(() => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error'));
    rejectHandler(() => errorResponse(403, 'FORBIDDEN', 'Forbidden.'));
    const { user } = await openPreview();

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong on our side. Try again.',
    );
    await user.type(screen.getByRole('textbox', { name: 'Note for the contributor' }), NOTE);
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Only admins can review pages.'),
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong on our side. Try again.',
      ),
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('S04.3 AC3 clears the alert when a reject starts', async () => {
    server.use(meHandler(adminUser), reviewSubmissionHandler(reviewSubmissionFixture));
    approveHandler(() => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error'));
    rejectHandler(async () => {
      await delay('infinite');
      return HttpResponse.json(rejectDecisionFixture);
    });
    const { user } = await openPreview();

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Note for the contributor' }), NOTE);
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(await screen.findByRole('button', { name: 'Rejecting…' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('S04.3 AC3 shows no note field or Reject for a page no longer pending', async () => {
    server.use(
      meHandler(adminUser),
      reviewSubmissionHandler({ ...reviewSubmissionFixture, status: 'REJECTED' }),
    );
    renderApp(PAGE);

    expect(await screen.findByText('This page has already been reviewed.')).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Note for the contributor' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });
});
