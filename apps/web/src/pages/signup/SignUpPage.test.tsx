import type { CurrentUser } from '@labsafe/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ME, meHandler, pendingUser, server } from '../../test/msw';
import { renderApp } from '../../test/render';

const SIGNUP = '*/api/auth/signup';

/** Waits for the form, then types the given values (an empty value is left empty). */
async function fillForm(
  user: ReturnType<typeof renderApp>['user'],
  values: { name: string; email: string; password: string },
) {
  const name = await screen.findByLabelText('Name');
  if (values.name) await user.type(name, values.name);
  if (values.email) await user.type(screen.getByLabelText('Email'), values.email);
  if (values.password) await user.type(screen.getByLabelText('Password'), values.password);
}

const VALID = { name: 'Sara Pending', email: 'sara@lab.test', password: 'correct-horse' };

describe('Sign-up page', () => {
  it('S02.1 AC1 signs up with name, email and password and lands on /contribute', async () => {
    let current: CurrentUser | null = null;
    let sent: unknown;
    server.use(
      http.get(ME, () => HttpResponse.json({ user: current })),
      http.post(SIGNUP, async ({ request }) => {
        sent = await request.json();
        current = pendingUser;
        return HttpResponse.json(pendingUser, { status: 201 });
      }),
    );
    const { user, router } = renderApp('/signup');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign up' })).toBeInTheDocument();
    await fillForm(user, { ...VALID, email: '  Sara@Lab.TEST ' });
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/contribute'));
    expect(sent).toEqual({
      name: 'Sara Pending',
      email: 'sara@lab.test',
      password: 'correct-horse',
    });
    const banner = screen.getByRole('banner');
    expect(await within(banner).findByText(pendingUser.name)).toBeInTheDocument();
  });

  it('S02.1 AC1 uses a labelled password input for a new password and links to log in', async () => {
    renderApp('/signup');

    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByRole('link', { name: 'Already have an account? Log in' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('S02.1 AC2 shows each message next to its input and sends nothing when the form is invalid', async () => {
    let calls = 0;
    server.use(
      http.post(SIGNUP, () => {
        calls += 1;
        return HttpResponse.json(pendingUser, { status: 201 });
      }),
    );
    const { user } = renderApp('/signup');

    await fillForm(user, { name: '', email: 'not-an-email', password: 'short' });
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByLabelText('Name')).toHaveAccessibleDescription('Enter your name');
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Enter a valid email address',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Password must be at least 8 characters',
    );
    expect(calls).toBe(0);
  });

  it('S02.1 AC2 shows "Name must be at most 100 characters" for a long name', async () => {
    const { user } = renderApp('/signup');

    await fillForm(user, { ...VALID, name: 'a'.repeat(101) });
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByLabelText('Name')).toHaveAccessibleDescription(
      'Name must be at most 100 characters',
    );
  });

  it("S02.1 AC2 shows the server's 400 field messages next to their inputs", async () => {
    server.use(
      http.post(SIGNUP, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            fields: [
              { path: 'name', message: 'Enter your name' },
              { path: 'password', message: 'Password must be at least 8 characters' },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = renderApp('/signup');

    await fillForm(user, VALID);
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Enter your name');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Password must be at least 8 characters',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('S02.1 AC3 shows "An account with this email already exists" next to the email input', async () => {
    server.use(
      http.post(SIGNUP, () =>
        HttpResponse.json(
          {
            statusCode: 409,
            code: 'EMAIL_TAKEN',
            message: 'An account with this email already exists',
            fields: [{ path: 'email', message: 'An account with this email already exists' }],
          },
          { status: 409 },
        ),
      ),
    );
    const { user, router } = renderApp('/signup');

    await fillForm(user, { ...VALID, email: 'Sara@Lab.TEST' });
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByText('An account with this email already exists')).toBeVisible();
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'An account with this email already exists',
    );
    expect(screen.getByLabelText('Email')).toHaveValue('Sara@Lab.TEST');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/signup');
  });

  it('S02.1 AC15 disables the button and shows "Signing up…" while the request is sent', async () => {
    server.use(
      http.post(SIGNUP, async () => {
        await delay('infinite');
        return HttpResponse.json(pendingUser, { status: 201 });
      }),
    );
    const { user } = renderApp('/signup');

    await fillForm(user, VALID);
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByRole('button', { name: 'Signing up…' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument();
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
      server.use(http.post(SIGNUP, answer));
      const { user } = renderApp('/signup');

      await fillForm(user, VALID);
      await user.click(screen.getByRole('button', { name: 'Sign up' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Something went wrong, try again.',
      );
      expect(screen.getByLabelText('Name')).toHaveValue(VALID.name);
      expect(screen.getByLabelText('Email')).toHaveValue(VALID.email);
      expect(screen.getByLabelText('Password')).toHaveValue(VALID.password);
      expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled();
    },
  );

  it('S02.1 AC16 sends a signed-in user to /contribute', async () => {
    server.use(meHandler(pendingUser));
    const { router } = renderApp('/signup');

    await waitFor(() => expect(router.state.location.pathname).toBe('/contribute'));
    expect(screen.queryByRole('heading', { name: 'Sign up' })).not.toBeInTheDocument();
  });

  it('S02.1 AC16 shows only "Loading…" while "me" has not answered', async () => {
    server.use(
      http.get(ME, async () => {
        await delay('infinite');
        return HttpResponse.json({ user: null });
      }),
    );
    renderApp('/signup');

    expect(await screen.findByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });
});
