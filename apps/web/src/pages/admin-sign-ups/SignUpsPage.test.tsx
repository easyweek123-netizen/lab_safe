import type { AdminUser, CurrentUser } from '@labsafe/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_USERS,
  adminUser,
  adminUsersHandler,
  APPROVE,
  approvedUser,
  errorResponse,
  ME,
  meHandler,
  pendingSignUps,
  REJECT,
  server,
} from '../../test/msw';
import { renderApp } from '../../test/render';

const PAGE = '/admin/sign-ups';
const [olga, nina] = pendingSignUps as [AdminUser, AdminUser];

/**
 * A server where an admin is signed in and approve/reject move a sign-up out of the pending
 * list, as the API does. Returns the requests it saw.
 */
function setUpReviewServer() {
  let pending = [...pendingSignUps];
  const seen = { listQueries: [] as string[], actions: [] as string[], bodies: [] as string[] };
  function decide(id: string, status: 'APPROVED' | 'REJECTED') {
    const target = pending.find((u) => u.id === id);
    if (!target) {
      return errorResponse(409, 'USER_NOT_PENDING', 'This sign-up was already handled.');
    }
    pending = pending.filter((u) => u.id !== id);
    return HttpResponse.json({ ...target, status });
  }
  server.use(
    meHandler(adminUser),
    http.get(ADMIN_USERS, ({ request }) => {
      seen.listQueries.push(new URL(request.url).search);
      return HttpResponse.json({ users: pending });
    }),
    http.post(APPROVE, async ({ params, request }) => {
      seen.actions.push(`approve ${String(params.id)}`);
      seen.bodies.push(await request.text());
      return decide(String(params.id), 'APPROVED');
    }),
    http.post(REJECT, async ({ params, request }) => {
      seen.actions.push(`reject ${String(params.id)}`);
      seen.bodies.push(await request.text());
      return decide(String(params.id), 'REJECTED');
    }),
  );
  return seen;
}

/** The list item of the sign-up with this name. */
async function findRow(name: string) {
  const list = await screen.findByRole('list', { name: 'Pending sign-ups' });
  const row = within(list)
    .getAllByRole('listitem')
    .find((item) => within(item).queryByText(name));
  if (!row) {
    throw new Error(`No row for ${name}`);
  }
  return row;
}

describe('Sign-ups page', () => {
  it('S02.2 AC4 lists the pending sign-ups oldest first with name, email, date, Approve and Reject', async () => {
    const seen = setUpReviewServer();
    renderApp(PAGE);

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign-ups' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Pending sign-ups' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);

    const [first, second] = rows as [HTMLElement, HTMLElement];
    expect(within(first).getByText(olga.name)).toBeInTheDocument();
    expect(within(first).getByText(olga.email)).toBeInTheDocument();
    expect(within(first).getByText('23 Nov 2026')).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'Approve' })).toBeEnabled();
    expect(within(first).getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(within(second).getByText(nina.name)).toBeInTheDocument();
    expect(within(second).getByText('24 Nov 2026')).toBeInTheDocument();
    expect(seen.listQueries).toEqual(['?status=PENDING']);
  });

  it('S02.2 AC5 shows "Loading…" while the list has not answered', async () => {
    server.use(
      meHandler(adminUser),
      http.get(ADMIN_USERS, async () => {
        await delay('infinite');
        return HttpResponse.json({ users: [] });
      }),
    );
    renderApp(PAGE);

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign-ups' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('S02.2 AC5 shows "No pending sign-ups" when nobody is waiting', async () => {
    server.use(meHandler(adminUser), adminUsersHandler([]));
    renderApp(PAGE);

    expect(await screen.findByText('No pending sign-ups')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pending sign-ups' })).not.toBeInTheDocument();
  });

  it('S02.2 AC5 shows "Couldn\'t load, try again." and Retry loads the list again', async () => {
    let calls = 0;
    server.use(
      meHandler(adminUser),
      http.get(ADMIN_USERS, () => {
        calls += 1;
        if (calls === 1) {
          return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
        }
        return HttpResponse.json({ users: pendingSignUps });
      }),
    );
    const { user } = renderApp(PAGE);

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load, try again.");
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await findRow(olga.name)).toBeInTheDocument();
    expect(calls).toBe(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('S02.2 AC6 approves a sign-up: the row disappears and "Approved <name>." is shown', async () => {
    const seen = setUpReviewServer();
    const { user } = renderApp(PAGE);

    await user.click(within(await findRow(olga.name)).getByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('status')).toHaveTextContent(`Approved ${olga.name}.`);
    expect(screen.queryByText(olga.name)).not.toBeInTheDocument();
    expect(await findRow(nina.name)).toBeInTheDocument();
    expect(seen.actions).toEqual([`approve ${olga.id}`]);
    expect(seen.bodies).toEqual(['{}']);
  });

  it('S02.2 AC7 asks "Reject this sign-up? This can\'t be undone." and moves focus to "Yes, reject"', async () => {
    const seen = setUpReviewServer();
    const { user } = renderApp(PAGE);

    const row = await findRow(olga.name);
    await user.click(within(row).getByRole('button', { name: 'Reject' }));

    expect(within(row).getByText("Reject this sign-up? This can't be undone.")).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Yes, reject' })).toHaveFocus();
    expect(within(row).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(seen.actions).toEqual([]);
  });

  it('S02.2 AC7 "Cancel" changes nothing and returns focus to "Reject"', async () => {
    const seen = setUpReviewServer();
    const { user } = renderApp(PAGE);

    const row = await findRow(olga.name);
    await user.click(within(row).getByRole('button', { name: 'Reject' }));
    await user.click(within(row).getByRole('button', { name: 'Cancel' }));

    expect(within(row).queryByText("Reject this sign-up? This can't be undone.")).toBeNull();
    expect(within(row).getByRole('button', { name: 'Reject' })).toHaveFocus();
    expect(within(row).getByText(olga.name)).toBeInTheDocument();
    expect(seen.actions).toEqual([]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('S02.2 AC7 the confirm step works by keyboard', async () => {
    const seen = setUpReviewServer();
    const { user } = renderApp(PAGE);

    const row = await findRow(olga.name);
    within(row).getByRole('button', { name: 'Reject' }).focus();
    await user.keyboard('{Enter}');
    // Focus is on "Yes, reject".
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('status')).toHaveTextContent(`Rejected ${olga.name}.`);
    expect(seen.actions).toEqual([`reject ${olga.id}`]);
  });

  it('S02.2 AC7 "Yes, reject" rejects: the row disappears and "Rejected <name>." is shown', async () => {
    const seen = setUpReviewServer();
    const { user } = renderApp(PAGE);

    const row = await findRow(nina.name);
    await user.click(within(row).getByRole('button', { name: 'Reject' }));
    await user.click(within(row).getByRole('button', { name: 'Yes, reject' }));

    expect(await screen.findByRole('status')).toHaveTextContent(`Rejected ${nina.name}.`);
    expect(screen.queryByText(nina.name)).not.toBeInTheDocument();
    expect(await findRow(olga.name)).toBeInTheDocument();
    expect(seen.actions).toEqual([`reject ${nina.id}`]);
    expect(seen.bodies).toEqual(['{}']);
  });

  it.each(['Approve', 'Reject'] as const)(
    'S02.2 AC8 %s of a sign-up handled meanwhile shows "This sign-up was already handled." and reloads the list',
    async (action) => {
      let listCalls = 0;
      server.use(
        meHandler(adminUser),
        http.get(ADMIN_USERS, () => {
          listCalls += 1;
          // Another admin handled Olga a moment earlier: the reload no longer lists her.
          return HttpResponse.json({ users: listCalls === 1 ? pendingSignUps : [nina] });
        }),
        http.post(APPROVE, () =>
          errorResponse(409, 'USER_NOT_PENDING', 'This sign-up was already handled.'),
        ),
        http.post(REJECT, () =>
          errorResponse(409, 'USER_NOT_PENDING', 'This sign-up was already handled.'),
        ),
      );
      const { user } = renderApp(PAGE);

      const row = await findRow(olga.name);
      await user.click(within(row).getByRole('button', { name: action }));
      if (action === 'Reject') {
        await user.click(within(row).getByRole('button', { name: 'Yes, reject' }));
      }

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'This sign-up was already handled.',
      );
      await waitFor(() => expect(screen.queryByText(olga.name)).not.toBeInTheDocument());
      expect(listCalls).toBe(2);
      expect(await findRow(nina.name)).toBeInTheDocument();
    },
  );

  it("S02.2 AC11 disables the row's buttons while its action is being sent", async () => {
    server.use(
      meHandler(adminUser),
      adminUsersHandler(pendingSignUps),
      http.post(APPROVE, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    const { user } = renderApp(PAGE);

    const row = await findRow(olga.name);
    await user.click(within(row).getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(within(row).getByRole('button', { name: 'Approve' })).toBeDisabled(),
    );
    expect(within(row).getByRole('button', { name: 'Reject' })).toBeDisabled();
    // The other row stays usable.
    const other = await findRow(nina.name);
    expect(within(other).getByRole('button', { name: 'Approve' })).toBeEnabled();
  });

  it.each([
    ['a 500', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')],
    ['a network error', () => HttpResponse.error()],
  ])(
    'S02.2 AC11 shows "Couldn\'t save, try again." after %s and the row stays',
    async (_label, answer) => {
      server.use(
        meHandler(adminUser),
        adminUsersHandler(pendingSignUps),
        http.post(APPROVE, answer),
      );
      const { user } = renderApp(PAGE);

      const row = await findRow(olga.name);
      await user.click(within(row).getByRole('button', { name: 'Approve' }));

      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save, try again.");
      expect(
        within(await findRow(olga.name)).getByRole('button', { name: 'Approve' }),
      ).toBeEnabled();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    },
  );

  it('S02.2 AC11 shows "No access" when the admin lost their rights meanwhile (403)', async () => {
    let current: CurrentUser = adminUser;
    server.use(
      http.get(ME, () => HttpResponse.json({ user: current })),
      adminUsersHandler(pendingSignUps),
      http.post(APPROVE, () => {
        current = { ...adminUser, role: 'CONTRIBUTOR' };
        return errorResponse(403, 'FORBIDDEN', 'You may not do this');
      }),
    );
    const { user, router } = renderApp(PAGE);

    await user.click(within(await findRow(olga.name)).getByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'No access' })).toBeInTheDocument();
    expect(screen.getByText("You don't have access to this page.")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PAGE);
  });

  it('S02.2 AC11 sends to log in when the session ended meanwhile (401)', async () => {
    let current: CurrentUser | null = adminUser;
    server.use(
      http.get(ME, () => HttpResponse.json({ user: current })),
      adminUsersHandler(pendingSignUps),
      http.post(REJECT, () => {
        current = null;
        return errorResponse(401, 'UNAUTHENTICATED', 'Log in first');
      }),
    );
    const { user, router } = renderApp(PAGE);

    const row = await findRow(olga.name);
    await user.click(within(row).getByRole('button', { name: 'Reject' }));
    await user.click(within(row).getByRole('button', { name: 'Yes, reject' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=/admin/sign-ups');
  });

  it('S02.2 AC11 shows the not-approved notice when the account was rejected meanwhile (403)', async () => {
    let current: CurrentUser = adminUser;
    server.use(
      http.get(ME, () => HttpResponse.json({ user: current })),
      adminUsersHandler(pendingSignUps),
      http.post(APPROVE, () => {
        current = { ...approvedUser, status: 'REJECTED' };
        return errorResponse(403, 'FORBIDDEN', 'You may not do this');
      }),
    );
    const { user } = renderApp(PAGE);

    await user.click(within(await findRow(olga.name)).getByRole('button', { name: 'Approve' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign-up not approved' }),
    ).toBeInTheDocument();
  });
});
