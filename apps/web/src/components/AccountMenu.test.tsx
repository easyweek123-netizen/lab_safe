import { screen, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  adminUser,
  adminUsersHandler,
  approvedAccounts,
  approvedUser,
  ME,
  meHandler,
  pendingUser,
  rejectedUser,
  server,
} from '../test/msw';
import { renderApp } from '../test/render';

const LOGOUT = '*/api/auth/logout';

/** Waits until the header shows the anonymous state: a "Log in" link and no "Log out". */
async function expectLoggedOutHeader() {
  const banner = screen.getByRole('banner');
  const login = await within(banner).findByRole('link', { name: 'Log in' });
  expect(login).toHaveAttribute('href', '/login');
  expect(within(banner).queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  expect(within(banner).queryByRole('link', { name: 'Contributor area' })).not.toBeInTheDocument();
}

describe('Account menu in the header', () => {
  it('S02.1 AC5 shows the user\'s name, "Contributor area" and "Log out" instead of "Log in"', async () => {
    server.use(meHandler(approvedUser));
    renderApp('/');

    const banner = screen.getByRole('banner');
    expect(await within(banner).findByText(approvedUser.name)).toBeInTheDocument();
    expect(within(banner).getByRole('link', { name: 'Contributor area' })).toHaveAttribute(
      'href',
      '/contribute',
    );
    expect(within(banner).getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(within(banner).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('S02.1 AC5 shows the signed-in header for a pending account too', async () => {
    server.use(meHandler(pendingUser));
    renderApp('/');

    const banner = screen.getByRole('banner');
    expect(await within(banner).findByText(pendingUser.name)).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('S02.1 AC5 shows "Log in" to an anonymous visitor', async () => {
    renderApp('/');

    await expectLoggedOutHeader();
  });

  it('S02.1 AC5 shows nothing account-related while "me" has not answered', async () => {
    server.use(
      http.get(ME, async () => {
        await delay('infinite');
        return HttpResponse.json({ user: null });
      }),
    );
    renderApp('/');

    const banner = screen.getByRole('banner');
    // The page itself has loaded, so the header had time to render its loading state.
    expect(await screen.findByRole('heading', { level: 1, name: 'LabSafe' })).toBeInTheDocument();
    expect(within(banner).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(within(banner).queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
    expect(within(banner).getAllByRole('link')).toHaveLength(1);
  });

  it('S02.1 AC5 shows "Log in" when "me" fails', async () => {
    server.use(http.get(ME, () => HttpResponse.error()));
    renderApp('/');

    await expectLoggedOutHeader();
  });

  it('S02.1 AC7 logs out with a JSON request and then shows "Log in"', async () => {
    let signedIn = true;
    let logoutRequest: { contentType: string | null; body: string } | undefined;
    server.use(
      http.get(ME, () => HttpResponse.json({ user: signedIn ? approvedUser : null })),
      http.post(LOGOUT, async ({ request }) => {
        logoutRequest = {
          contentType: request.headers.get('content-type'),
          body: await request.text(),
        };
        signedIn = false;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderApp('/');

    const banner = screen.getByRole('banner');
    await user.click(await within(banner).findByRole('button', { name: 'Log out' }));

    await expectLoggedOutHeader();
    expect(within(banner).queryByText(approvedUser.name)).not.toBeInTheDocument();
    expect(logoutRequest).toEqual({ contentType: 'application/json', body: '{}' });
  });

  it('S02.1 AC7 counts a 401 from log-out as logged out', async () => {
    let signedIn = true;
    server.use(
      http.get(ME, () => HttpResponse.json({ user: signedIn ? approvedUser : null })),
      http.post(LOGOUT, () => {
        signedIn = false;
        return HttpResponse.json(
          { statusCode: 401, code: 'UNAUTHENTICATED', message: 'Log in first' },
          { status: 401 },
        );
      }),
    );
    const { user } = renderApp('/');

    const banner = screen.getByRole('banner');
    await user.click(await within(banner).findByRole('button', { name: 'Log out' }));

    await expectLoggedOutHeader();
  });

  it('S02.2 AC3 AC10 shows the "Sign-ups" link to an admin and it opens /admin/sign-ups', async () => {
    server.use(meHandler(adminUser), adminUsersHandler([]));
    const { user, router } = renderApp('/');

    const banner = screen.getByRole('banner');
    const link = await within(banner).findByRole('link', { name: 'Sign-ups' });
    expect(link).toHaveAttribute('href', '/admin/sign-ups');
    await user.click(link);

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign-ups' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/sign-ups');
  });

  it.each([
    ['an approved contributor', approvedUser],
    ['a pending account', pendingUser],
    ['a rejected account', rejectedUser],
  ])('S02.2 AC10 hides the "Sign-ups" link from %s', async (_label, account) => {
    server.use(meHandler(account));
    renderApp('/');

    const banner = screen.getByRole('banner');
    expect(await within(banner).findByText(account.name)).toBeInTheDocument();
    expect(within(banner).queryByRole('link', { name: 'Sign-ups' })).not.toBeInTheDocument();
  });

  it('S02.2 AC10 hides the "Sign-ups" link from an anonymous visitor', async () => {
    renderApp('/');

    const banner = screen.getByRole('banner');
    expect(await within(banner).findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(within(banner).queryByRole('link', { name: 'Sign-ups' })).not.toBeInTheDocument();
  });

  it('S02.3 AC3 AC10 shows the "Accounts" link to an admin and it opens /admin/accounts', async () => {
    server.use(meHandler(adminUser), adminUsersHandler(approvedAccounts));
    const { user, router } = renderApp('/');

    const banner = screen.getByRole('banner');
    expect(await within(banner).findByRole('link', { name: 'Sign-ups' })).toBeInTheDocument();
    const link = within(banner).getByRole('link', { name: 'Accounts' });
    expect(link).toHaveAttribute('href', '/admin/accounts');
    await user.click(link);

    expect(await screen.findByRole('heading', { level: 1, name: 'Accounts' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/accounts');
  });

  it.each([
    ['an approved contributor', approvedUser],
    ['a pending account', pendingUser],
    ['a rejected account', rejectedUser],
  ])('S02.3 AC10 hides the "Accounts" link from %s', async (_label, account) => {
    server.use(meHandler(account));
    renderApp('/');

    const banner = screen.getByRole('banner');
    expect(await within(banner).findByText(account.name)).toBeInTheDocument();
    expect(within(banner).queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument();
  });

  it('S02.3 AC10 hides the "Accounts" link from an anonymous visitor', async () => {
    renderApp('/');

    const banner = screen.getByRole('banner');
    expect(await within(banner).findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(within(banner).queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument();
  });
});
