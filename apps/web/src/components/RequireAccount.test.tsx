import type { CurrentUser } from '@labsafe/shared';
import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_USERS,
  adminUser,
  adminUsersHandler,
  approvedUser,
  ME,
  meHandler,
  pendingUser,
  rejectedUser,
  server,
} from '../test/msw';
import { renderApp } from '../test/render';

const LOGIN = '*/api/auth/login';
const SIGNUP = '*/api/auth/signup';

/** A server where `me` answers `current`, and login signs in as `approvedUser`. */
function setUpLoginServer() {
  let current: CurrentUser | null = null;
  server.use(
    http.get(ME, () => HttpResponse.json({ user: current })),
    http.post(LOGIN, () => {
      current = approvedUser;
      return HttpResponse.json(approvedUser);
    }),
  );
}

async function logIn(user: ReturnType<typeof renderApp>['user']) {
  await user.type(await screen.findByLabelText('Email'), approvedUser.email);
  await user.type(screen.getByLabelText('Password'), 'correct-horse');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('Account gate on /contribute', () => {
  it('S02.1 AC1 shows "Your account is waiting for approval." on /contribute after signing up', async () => {
    let current: CurrentUser | null = null;
    server.use(
      http.get(ME, () => HttpResponse.json({ user: current })),
      http.post(SIGNUP, () => {
        current = pendingUser;
        return HttpResponse.json(pendingUser, { status: 201 });
      }),
    );
    const { user, router } = renderApp('/signup');

    await user.type(await screen.findByLabelText('Name'), pendingUser.name);
    await user.type(screen.getByLabelText('Email'), pendingUser.email);
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Waiting for approval' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Your account is waiting for approval.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/contribute');
  });

  it('S02.1 AC8 shows the waiting notice to a PENDING account at /contribute', async () => {
    server.use(meHandler(pendingUser));
    const { router } = renderApp('/contribute');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Waiting for approval' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Your account is waiting for approval.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Contributor area' })).not.toBeInTheDocument();
    // The notice is shown at the requested address, not on a page of its own (E02-D7).
    expect(router.state.location.pathname).toBe('/contribute');
  });

  it('S02.1 AC8 shows the not-approved notice to a REJECTED account at /contribute', async () => {
    server.use(meHandler(rejectedUser));
    const { router } = renderApp('/contribute');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign-up not approved' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Your sign-up was not approved.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Contributor area' })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/contribute');
  });

  it('S02.1 AC8 shows the empty contributor area to an APPROVED contributor', async () => {
    server.use(meHandler(approvedUser));
    renderApp('/contribute');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contributor area' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Here you will write and update safety pages.')).toBeInTheDocument();
  });

  it('S02.1 AC8 shows the empty contributor area to an admin', async () => {
    server.use(meHandler(adminUser));
    renderApp('/contribute');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contributor area' }),
    ).toBeInTheDocument();
  });

  it('S02.1 AC8 reaches the gate by the header link "Contributor area"', async () => {
    server.use(meHandler(pendingUser));
    const { user, router } = renderApp('/');

    await user.click(await screen.findByRole('link', { name: 'Contributor area' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Waiting for approval' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/contribute');
  });

  it('S02.1 AC9 sends an anonymous visitor to /login?next=/contribute', async () => {
    const { router } = renderApp('/contribute');

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=/contribute');
  });

  it('S02.1 AC9 lands on /contribute after logging in from the redirect', async () => {
    setUpLoginServer();
    const { user, router } = renderApp('/contribute');

    await logIn(user);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contributor area' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/contribute');
  });

  it.each(['//evil.example', 'https://evil.example'])(
    'S02.1 AC9 ignores the next value %s and lands on /contribute',
    async (next) => {
      setUpLoginServer();
      const { user, router } = renderApp(`/login?next=${encodeURIComponent(next)}`);

      await logIn(user);

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Contributor area' }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/contribute');
    },
  );

  it('S02.1 AC15 shows "Loading…" while "me" has not answered', async () => {
    server.use(
      http.get(ME, async () => {
        await delay('infinite');
        return HttpResponse.json({ user: null });
      }),
    );
    renderApp('/contribute');

    expect(await screen.findByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('S02.1 AC15 shows "Couldn\'t load, try again." and Retry loads "me" again', async () => {
    let calls = 0;
    server.use(
      http.get(ME, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(
            { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' },
            { status: 500 },
          );
        }
        return HttpResponse.json({ user: approvedUser });
      }),
    );
    const { user } = renderApp('/contribute');

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load, try again.");
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contributor area' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(calls).toBeGreaterThanOrEqual(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Account gate on /admin/sign-ups', () => {
  it('S02.2 AC10 sends an anonymous visitor to /login?next=/admin/sign-ups', async () => {
    const { router } = renderApp('/admin/sign-ups');

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=/admin/sign-ups');
  });

  it('S02.2 AC10 shows the waiting notice to a PENDING account', async () => {
    server.use(meHandler(pendingUser));
    const { router } = renderApp('/admin/sign-ups');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Waiting for approval' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign-ups' })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/sign-ups');
  });

  it('S02.2 AC10 shows the not-approved notice to a REJECTED account', async () => {
    server.use(meHandler(rejectedUser));
    renderApp('/admin/sign-ups');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign-up not approved' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Your sign-up was not approved.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign-ups' })).not.toBeInTheDocument();
  });

  it('S02.2 AC10 shows "No access" to an approved contributor and never asks for the list', async () => {
    let listCalls = 0;
    server.use(
      meHandler(approvedUser),
      http.get(ADMIN_USERS, () => {
        listCalls += 1;
        return HttpResponse.json({ users: [] });
      }),
    );
    const { router } = renderApp('/admin/sign-ups');

    expect(await screen.findByRole('heading', { level: 1, name: 'No access' })).toBeInTheDocument();
    expect(screen.getByText("You don't have access to this page.")).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign-ups' })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/sign-ups');
    expect(listCalls).toBe(0);
  });

  it('S02.2 AC10 shows the sign-ups page to an admin, also when typed as a URL', async () => {
    server.use(meHandler(adminUser), adminUsersHandler([]));
    renderApp('/admin/sign-ups');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign-ups' })).toBeInTheDocument();
  });
});
