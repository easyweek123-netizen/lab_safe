import type { AdminUser, CurrentUser, Role } from '@labsafe/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_USERS,
  adminUser,
  adminUsersHandler,
  approvedAccounts,
  approvedUser,
  errorResponse,
  ME,
  meHandler,
  pendingUser,
  rejectedUser,
  ROLE,
  server,
} from '../../test/msw';
import { renderApp } from '../../test/render';

const PAGE = '/admin/accounts';
const [adam, anna, bruno] = approvedAccounts as [AdminUser, AdminUser, AdminUser];

/**
 * A server where `adminUser` (Adam) is signed in and a role change updates the account, as the
 * API does, including the last-admin rule. Returns the requests it saw.
 */
function setUpRoleServer() {
  let accounts = [...approvedAccounts];
  let current: CurrentUser | null = adminUser;
  const seen = {
    listQueries: [] as string[],
    changes: [] as string[],
    bodies: [] as string[],
    meCalls: 0,
  };
  server.use(
    http.get(ME, () => {
      seen.meCalls += 1;
      return HttpResponse.json({ user: current });
    }),
    http.get(ADMIN_USERS, ({ request }) => {
      seen.listQueries.push(new URL(request.url).search);
      return HttpResponse.json({ users: accounts });
    }),
    http.put(ROLE, async ({ params, request }) => {
      const id = String(params.id);
      const body = await request.text();
      seen.bodies.push(body);
      const { role } = JSON.parse(body) as { role: Role };
      seen.changes.push(`${id} ${role}`);
      const target = accounts.find((u) => u.id === id);
      if (!target) {
        return errorResponse(404, 'NOT_FOUND', 'This account does not exist.');
      }
      const admins = accounts.filter((u) => u.role === 'ADMIN');
      if (role === 'CONTRIBUTOR' && target.role === 'ADMIN' && admins.length === 1) {
        return errorResponse(409, 'LAST_ADMIN', 'There must be at least one admin.');
      }
      const updated = { ...target, role };
      accounts = accounts.map((u) => (u.id === id ? updated : u));
      if (current && current.id === id) {
        current = { ...current, role };
      }
      return HttpResponse.json(updated);
    }),
  );
  return {
    seen,
    setAccounts(next: AdminUser[]) {
      accounts = next;
    },
  };
}

/** The list item of the account with this name. */
async function findRow(name: string) {
  const list = await screen.findByRole('list', { name: 'Approved accounts' });
  const row = within(list)
    .getAllByRole('listitem')
    .find((item) => within(item).queryByText(name));
  if (!row) {
    throw new Error(`No row for ${name}`);
  }
  return row;
}

describe('Accounts page', () => {
  it('S02.3 AC1 lists the approved accounts in server order with name, email, role in words and the matching button', async () => {
    const { seen } = setUpRoleServer();
    renderApp(PAGE);

    expect(await screen.findByRole('heading', { level: 1, name: 'Accounts' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Approved accounts' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(3);

    const [first, second, third] = rows as [HTMLElement, HTMLElement, HTMLElement];
    expect(within(first).getByText(adam.name)).toBeInTheDocument();
    expect(within(first).getByText(adam.email)).toBeInTheDocument();
    expect(within(first).getByText('Admin')).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: `Remove admin ${adam.name}` })).toBeEnabled();
    expect(within(first).queryByRole('button', { name: /Make admin/ })).not.toBeInTheDocument();

    expect(within(second).getByText(anna.name)).toBeInTheDocument();
    expect(within(second).getByText(anna.email)).toBeInTheDocument();
    expect(within(second).getByText('Contributor')).toBeInTheDocument();
    expect(within(second).getByRole('button', { name: `Make admin ${anna.name}` })).toBeEnabled();
    expect(within(second).queryByRole('button', { name: /Remove admin/ })).not.toBeInTheDocument();

    expect(within(third).getByText(bruno.name)).toBeInTheDocument();
    expect(within(third).getByText('Admin')).toBeInTheDocument();
    expect(within(third).getByRole('button', { name: `Remove admin ${bruno.name}` })).toBeEnabled();

    expect(seen.listQueries).toEqual(['?status=APPROVED']);
  });

  it('S02.3 AC1 the buttons show "Make admin" and "Remove admin" as their visible text', async () => {
    setUpRoleServer();
    renderApp(PAGE);

    const annaButton = within(await findRow(anna.name)).getByRole('button', { name: /Make admin/ });
    expect(annaButton).toHaveTextContent(/^Make admin/);
    const brunoButton = within(await findRow(bruno.name)).getByRole('button', {
      name: /Remove admin/,
    });
    expect(brunoButton).toHaveTextContent(/^Remove admin/);
  });

  it('S02.3 AC2 shows "Loading…" while the list has not answered', async () => {
    server.use(
      meHandler(adminUser),
      http.get(ADMIN_USERS, async () => {
        await delay('infinite');
        return HttpResponse.json({ users: [] });
      }),
    );
    renderApp(PAGE);

    expect(await screen.findByRole('heading', { level: 1, name: 'Accounts' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('S02.3 AC2 shows "Couldn\'t load, try again." and Retry loads the list again', async () => {
    let calls = 0;
    server.use(
      meHandler(adminUser),
      http.get(ADMIN_USERS, () => {
        calls += 1;
        if (calls === 1) {
          return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
        }
        return HttpResponse.json({ users: approvedAccounts });
      }),
    );
    const { user } = renderApp(PAGE);

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load, try again.");
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await findRow(anna.name)).toBeInTheDocument();
    expect(calls).toBe(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('S02.3 AC3 "Make admin" makes a contributor an admin: the row shows "Admin" and "Remove admin" and the status is shown', async () => {
    const { seen } = setUpRoleServer();
    const { user } = renderApp(PAGE);

    await user.click(
      within(await findRow(anna.name)).getByRole('button', { name: `Make admin ${anna.name}` }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(`${anna.name} is now an admin.`);
    const row = await findRow(anna.name);
    await waitFor(() => expect(within(row).getByText('Admin')).toBeInTheDocument());
    expect(within(row).queryByText('Contributor')).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: `Remove admin ${anna.name}` })).toBeEnabled();
    expect(seen.changes).toEqual([`${anna.id} ADMIN`]);
    expect(seen.bodies).toEqual(['{"role":"ADMIN"}']);
    expect(seen.listQueries).toEqual(['?status=APPROVED', '?status=APPROVED']);
  });

  it('S02.3 AC4 "Remove admin" on another admin makes them a contributor and the status is shown', async () => {
    const { seen } = setUpRoleServer();
    const { user } = renderApp(PAGE);

    await user.click(
      within(await findRow(bruno.name)).getByRole('button', { name: `Remove admin ${bruno.name}` }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      `${bruno.name} is now a contributor.`,
    );
    const row = await findRow(bruno.name);
    await waitFor(() => expect(within(row).getByText('Contributor')).toBeInTheDocument());
    expect(within(row).getByRole('button', { name: `Make admin ${bruno.name}` })).toBeEnabled();
    expect(seen.bodies).toEqual(['{"role":"CONTRIBUTOR"}']);
    // The signed-in admin stays on the page with the header unchanged.
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: 'Accounts' })).toBeInTheDocument();
  });

  it('S02.3 AC5 the only admin removing their own role sees "There must be at least one admin." and stays an admin', async () => {
    const roleServer = setUpRoleServer();
    roleServer.setAccounts([adam, anna]);
    const { user } = renderApp(PAGE);

    await user.click(
      within(await findRow(adam.name)).getByRole('button', { name: `Remove admin ${adam.name}` }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('There must be at least one admin.');
    const row = await findRow(adam.name);
    expect(within(row).getByText('Admin')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(row).getByRole('button', { name: `Remove admin ${adam.name}` })).toBeEnabled(),
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Accounts' })).toBeInTheDocument();
  });

  it('S02.3 AC7 an admin removing their own role (with another admin left) then sees "No access" and loses the admin links', async () => {
    const { seen } = setUpRoleServer();
    const { user, router } = renderApp(PAGE);

    const banner = screen.getByRole('banner');
    expect(await within(banner).findByRole('link', { name: 'Accounts' })).toBeInTheDocument();
    const meCallsBefore = seen.meCalls;

    await user.click(
      within(await findRow(adam.name)).getByRole('button', { name: `Remove admin ${adam.name}` }),
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'No access' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PAGE);
    expect(within(banner).queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument();
    expect(within(banner).queryByRole('link', { name: 'Sign-ups' })).not.toBeInTheDocument();
    expect(within(banner).getByRole('link', { name: 'Contributor area' })).toBeInTheDocument();
    expect(seen.meCalls).toBeGreaterThan(meCallsBefore);
    expect(seen.changes).toEqual([`${adam.id} CONTRIBUTOR`]);
  });

  it("S02.3 AC11 disables only that row's button while its role change is being sent", async () => {
    server.use(
      meHandler(adminUser),
      adminUsersHandler(approvedAccounts),
      http.put(ROLE, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    const { user } = renderApp(PAGE);

    const row = await findRow(anna.name);
    await user.click(within(row).getByRole('button', { name: `Make admin ${anna.name}` }));

    await waitFor(() =>
      expect(within(row).getByRole('button', { name: `Make admin ${anna.name}` })).toBeDisabled(),
    );
    const other = await findRow(bruno.name);
    expect(within(other).getByRole('button', { name: `Remove admin ${bruno.name}` })).toBeEnabled();
  });

  it.each([
    ['a 500', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')],
    ['a network error', () => HttpResponse.error()],
  ])(
    'S02.3 AC11 shows "Couldn\'t save, try again." after %s and the row is unchanged',
    async (_label, answer) => {
      server.use(meHandler(adminUser), adminUsersHandler(approvedAccounts), http.put(ROLE, answer));
      const { user } = renderApp(PAGE);

      const row = await findRow(anna.name);
      await user.click(within(row).getByRole('button', { name: `Make admin ${anna.name}` }));

      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save, try again.");
      const after = await findRow(anna.name);
      expect(within(after).getByText('Contributor')).toBeInTheDocument();
      expect(within(after).getByRole('button', { name: `Make admin ${anna.name}` })).toBeEnabled();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    },
  );

  it('S02.3 AC11 shows "No access" when the admin lost their rights meanwhile (403)', async () => {
    let current: CurrentUser = adminUser;
    server.use(
      http.get(ME, () => HttpResponse.json({ user: current })),
      adminUsersHandler(approvedAccounts),
      http.put(ROLE, () => {
        current = { ...adminUser, role: 'CONTRIBUTOR' };
        return errorResponse(403, 'FORBIDDEN', 'You may not do this');
      }),
    );
    const { user, router } = renderApp(PAGE);

    await user.click(
      within(await findRow(anna.name)).getByRole('button', { name: `Make admin ${anna.name}` }),
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'No access' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(PAGE);
  });

  it('S02.3 AC11 sends to log in when the session ended meanwhile (401)', async () => {
    let current: CurrentUser | null = adminUser;
    server.use(
      http.get(ME, () => HttpResponse.json({ user: current })),
      adminUsersHandler(approvedAccounts),
      http.put(ROLE, () => {
        current = null;
        return errorResponse(401, 'UNAUTHENTICATED', 'Log in first');
      }),
    );
    const { user, router } = renderApp(PAGE);

    await user.click(
      within(await findRow(bruno.name)).getByRole('button', { name: `Remove admin ${bruno.name}` }),
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=/admin/accounts');
  });

  it('S02.3 AC11 shows the not-approved notice when the account was rejected meanwhile (403)', async () => {
    let current: CurrentUser = adminUser;
    server.use(
      http.get(ME, () => HttpResponse.json({ user: current })),
      adminUsersHandler(approvedAccounts),
      http.put(ROLE, () => {
        current = { ...approvedUser, status: 'REJECTED' };
        return errorResponse(403, 'FORBIDDEN', 'You may not do this');
      }),
    );
    const { user } = renderApp(PAGE);

    await user.click(
      within(await findRow(anna.name)).getByRole('button', { name: `Make admin ${anna.name}` }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign-up not approved' }),
    ).toBeInTheDocument();
  });
});

describe('Account gate on /admin/accounts', () => {
  it('S02.3 AC10 sends an anonymous visitor to /login?next=/admin/accounts', async () => {
    const { router } = renderApp(PAGE);

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=/admin/accounts');
  });

  it.each([
    ['a pending account', pendingUser, 'Waiting for approval'],
    ['a rejected account', rejectedUser, 'Sign-up not approved'],
    ['an approved contributor', approvedUser, 'No access'],
  ])(
    'S02.3 AC10 shows %s its notice and never asks for the list',
    async (_label, account, title) => {
      let listCalls = 0;
      server.use(
        meHandler(account),
        http.get(ADMIN_USERS, () => {
          listCalls += 1;
          return HttpResponse.json({ users: approvedAccounts });
        }),
      );
      const { router } = renderApp(PAGE);

      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(PAGE);
      expect(screen.queryByRole('heading', { name: 'Accounts' })).not.toBeInTheDocument();
      expect(listCalls).toBe(0);
    },
  );
});
