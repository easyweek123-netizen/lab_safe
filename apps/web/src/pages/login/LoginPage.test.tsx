import type { CurrentUser } from '@labsafe/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { approvedUser, ME, meHandler, server } from '../../test/msw';
import { renderApp } from '../../test/render';

const LOGIN = '*/api/auth/login';

const PASSWORD = 'correct-horse';

/** A server where login with `approvedUser`'s email (any case) and `PASSWORD` signs in. */
function setUpLoginServer() {
  let current: CurrentUser | null = null;
  const sent: unknown[] = [];
  server.use(
    http.get(ME, () => HttpResponse.json({ user: current })),
    http.post(LOGIN, async ({ request }) => {
      const body = (await request.json()) as { email: string; password: string };
      sent.push(body);
      if (body.email !== approvedUser.email || body.password !== PASSWORD) {
        return HttpResponse.json(
          { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Email or password is wrong' },
          { status: 401 },
        );
      }
      current = approvedUser;
      return HttpResponse.json(approvedUser);
    }),
  );
  return sent;
}

async function logIn(user: ReturnType<typeof renderApp>['user'], email: string, password: string) {
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('Login page', () => {
  it('S02.1 AC5 logs in with the email in any letter case and shows the name and "Log out"', async () => {
    const sent = setUpLoginServer();
    const { user, router } = renderApp('/login');

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    await logIn(user, 'ANNA@Lab.Test', PASSWORD);

    await waitFor(() => expect(router.state.location.pathname).toBe('/contribute'));
    expect(sent).toEqual([{ email: 'anna@lab.test', password: PASSWORD }]);
    const banner = screen.getByRole('banner');
    expect(await within(banner).findByText(approvedUser.name)).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(within(banner).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('S02.1 AC5 uses a labelled password input for the current password and links to sign up', async () => {
    renderApp('/login');

    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/signup',
    );
  });

  it('S02.1 AC5 shows the field messages and sends nothing when the form is empty', async () => {
    const sent = setUpLoginServer();
    const { user } = renderApp('/login');

    await user.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByLabelText('Email')).toHaveAccessibleDescription(
      'Enter a valid email address',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password');
    expect(sent).toEqual([]);
  });

  it('S02.1 AC6 shows "Email or password is wrong" for a wrong password and keeps the values', async () => {
    setUpLoginServer();
    const { user, router } = renderApp('/login');

    await logIn(user, approvedUser.email, 'wrong-password');

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is wrong');
    expect(screen.getByLabelText('Email')).toHaveValue(approvedUser.email);
    expect(screen.getByLabelText('Password')).toHaveValue('wrong-password');
    expect(router.state.location.pathname).toBe('/login');
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });

  it('S02.1 AC6 shows the same message for an email that has no account', async () => {
    setUpLoginServer();
    const { user } = renderApp('/login');

    await logIn(user, 'nobody@lab.test', PASSWORD);

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is wrong');
  });

  it('S02.1 AC9 lands on the local path in next after logging in', async () => {
    setUpLoginServer();
    const { user, router } = renderApp('/login?next=%2Fcontribute%3Ftab%3Ddrafts');

    await logIn(user, approvedUser.email, PASSWORD);

    await waitFor(() => expect(router.state.location.pathname).toBe('/contribute'));
    expect(router.state.location.search).toBe('?tab=drafts');
  });

  it.each(['//evil.example', 'https://evil.example'])(
    'S02.1 AC9 ignores next=%s and lands on /contribute',
    async (next) => {
      setUpLoginServer();
      const { user, router } = renderApp(`/login?next=${encodeURIComponent(next)}`);

      await logIn(user, approvedUser.email, PASSWORD);

      await waitFor(() => expect(router.state.location.pathname).toBe('/contribute'));
      expect(router.state.location.search).toBe('');
    },
  );

  it('S02.1 AC15 disables the button and shows "Logging in…" while the request is sent', async () => {
    server.use(
      http.post(LOGIN, async () => {
        await delay('infinite');
        return HttpResponse.json(approvedUser);
      }),
    );
    const { user } = renderApp('/login');

    await logIn(user, approvedUser.email, PASSWORD);

    expect(await screen.findByRole('button', { name: 'Logging in…' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it.each([
    [
      '500',
      () =>
        HttpResponse.json(
          { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' },
          { status: 500 },
        ),
    ],
    ['network error', () => HttpResponse.error()],
  ])(
    'S02.1 AC15 shows "Something went wrong, try again." on a %s and keeps the typed values',
    async (_label, answer) => {
      server.use(http.post(LOGIN, answer));
      const { user } = renderApp('/login');

      await logIn(user, approvedUser.email, PASSWORD);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Something went wrong, try again.',
      );
      expect(screen.getByLabelText('Email')).toHaveValue(approvedUser.email);
      expect(screen.getByLabelText('Password')).toHaveValue(PASSWORD);
      expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    },
  );

  it('S02.1 AC16 sends a signed-in user to /contribute', async () => {
    server.use(meHandler(approvedUser));
    const { router } = renderApp('/login');

    await waitFor(() => expect(router.state.location.pathname).toBe('/contribute'));
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('S02.1 AC16 shows only "Loading…" while "me" has not answered', async () => {
    server.use(
      http.get(ME, async () => {
        await delay('infinite');
        return HttpResponse.json({ user: null });
      }),
    );
    renderApp('/login');

    expect(await screen.findByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });
});
