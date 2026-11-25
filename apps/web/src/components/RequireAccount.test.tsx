import type { CurrentUser } from '@labsafe/shared';
import { focusManager, onlineManager, type QueryClient } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { ME_KEY } from '../api/auth';
import {
  ADMIN_USERS,
  adminUser,
  adminUsersHandler,
  approvedUser,
  errorResponse,
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

/** How a background refresh of `me` fails: a network error or a 500. */
const FAILURES = [
  ['a network error', () => HttpResponse.error()],
  ['a 500', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')],
] as const;

/**
 * A server where `me` answers `approvedUser` first and then whatever `next` returns, counting the
 * requests.
 */
function setUpRefresh(next: () => Response) {
  const state = { calls: 0 };
  server.use(
    http.get(ME, () => {
      state.calls += 1;
      return state.calls === 1 ? HttpResponse.json({ user: approvedUser }) : next();
    }),
  );
  return state;
}

/** Moves focus away from the window and back, as TanStack Query sees it: a background refresh. */
function refocusWindow() {
  act(() => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

/** Waits until the refresh of `me` has settled with `status`. */
async function expectMeSettled(queryClient: QueryClient, status: 'error' | 'success') {
  await waitFor(() => {
    const state = queryClient.getQueryState(ME_KEY);
    expect(state?.fetchStatus).toBe('idle');
    expect(state?.status).toBe(status);
  });
}

describe('Account gate through a failed refresh', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
    focusManager.setFocused(undefined);
  });

  it.each(FAILURES)(
    'S03.3 AC1 keeps the contributor area and the header after a focus refresh fails with %s',
    async (_label, failure) => {
      const state = setUpRefresh(failure);
      const { queryClient } = renderApp('/contribute');
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Contributor area' }),
      ).toBeInTheDocument();

      refocusWindow();
      await waitFor(() => expect(state.calls).toBe(2));
      await expectMeSettled(queryClient, 'error');

      expect(
        screen.getByRole('heading', { level: 1, name: 'Contributor area' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
      const banner = screen.getByRole('banner');
      expect(within(banner).getByText(approvedUser.name)).toBeInTheDocument();
      expect(within(banner).getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    },
  );

  it.each(FAILURES)(
    'S03.3 AC1 keeps a half-filled "New safety page" form mounted when a refresh fails with %s',
    async (_label, failure) => {
      const state = setUpRefresh(failure);
      const { user, queryClient } = renderApp('/contribute/new');
      await user.type(await screen.findByLabelText('Name'), 'Rotary evaporator');
      await user.type(screen.getByLabelText('Short description'), 'Removes solvents.');

      refocusWindow();
      await waitFor(() => expect(state.calls).toBe(2));
      await expectMeSettled(queryClient, 'error');

      expect(
        screen.getByRole('heading', { level: 1, name: 'New safety page' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toHaveValue('Rotary evaporator');
      expect(screen.getByLabelText('Short description')).toHaveValue('Removes solvents.');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('S03.3 AC1 keeps the form while a refresh after reconnecting fails, and while a second refresh runs', async () => {
    let calls = 0;
    server.use(
      http.get(ME, async () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json({ user: approvedUser });
        }
        if (calls === 2) {
          return HttpResponse.error();
        }
        await delay('infinite');
        return HttpResponse.json({ user: approvedUser });
      }),
    );
    const { user, queryClient } = renderApp('/contribute/new');
    await user.type(await screen.findByLabelText('Name'), 'Rotary evaporator');

    act(() => {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    await waitFor(() => expect(calls).toBe(2));
    await expectMeSettled(queryClient, 'error');

    // A second refresh starts while the last one has failed (error and fetching at once).
    refocusWindow();
    await waitFor(() => expect(calls).toBe(3));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Rotary evaporator');
    expect(within(screen.getByRole('banner')).getByText(approvedUser.name)).toBeInTheDocument();
  });

  it('S03.3 AC2 still shows "Couldn\'t load, try again." and Retry when "me" never loaded', async () => {
    server.use(http.get(ME, () => HttpResponse.error()));
    renderApp('/contribute/new');

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load, try again.");
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'New safety page' })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Log in' }),
    ).toBeInTheDocument();
  });

  it('S03.3 AC2 sends the person to the login when a refresh succeeds with {user: null}', async () => {
    setUpRefresh(() => HttpResponse.json({ user: null }));
    const { router } = renderApp('/contribute');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contributor area' }),
    ).toBeInTheDocument();

    refocusWindow();

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=/contribute');
  });

  it('S03.3 AC2 shows the not-approved notice when a refresh succeeds with a REJECTED status', async () => {
    setUpRefresh(() => HttpResponse.json({ user: { ...approvedUser, status: 'REJECTED' } }));
    renderApp('/contribute');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contributor area' }),
    ).toBeInTheDocument();

    refocusWindow();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign-up not approved' }),
    ).toBeInTheDocument();
  });

  it('S03.3 AC2 shows "No access" on /admin/sign-ups when a refresh succeeds with the admin role removed', async () => {
    let calls = 0;
    server.use(
      adminUsersHandler([]),
      http.get(ME, () => {
        calls += 1;
        return HttpResponse.json({
          user: calls === 1 ? adminUser : { ...adminUser, role: 'CONTRIBUTOR' },
        });
      }),
    );
    renderApp('/admin/sign-ups');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign-ups' })).toBeInTheDocument();

    refocusWindow();

    expect(await screen.findByRole('heading', { level: 1, name: 'No access' })).toBeInTheDocument();
  });
});
