import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequest } from '@labsafe/shared';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import type { z } from 'zod';
import { useLogIn, useMe } from '../../api/auth';
import { ApiError } from '../../api/client';
import { TextField } from '../../components/TextField';
import { safeNext } from './safe-next';

const FIELDS = ['email', 'password'] as const;
type Field = (typeof FIELDS)[number];

function isField(path: string): path is Field {
  return (FIELDS as readonly string[]).includes(path);
}

/** The `alert` above the button: none when the server named the fields (400). */
function formAlert(error: Error | null): string | null {
  if (!error) {
    return null;
  }
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_CREDENTIALS') {
      return 'Email or password is wrong';
    }
    if (error.fields?.some((field) => isField(field.path))) {
      return null;
    }
  }
  return 'Something went wrong, try again.';
}

// `/login` (S02.1 "UI states"): email and password, checked with the shared schema on submit.
// After logging in, and for a visitor who is already signed in (AC16), it goes to `next` when
// that is a local path, otherwise to `/contribute` (AC9).
export function LoginPage() {
  const me = useMe();
  const logIn = useLogIn();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const target = safeNext(searchParams.get('next'));
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<typeof LoginRequest>, unknown, LoginRequest>({
    resolver: zodResolver(LoginRequest),
    defaultValues: { email: '', password: '' },
  });

  if (me.isPending) {
    return (
      <p role="status" className="text-base text-slate-700">
        Loading…
      </p>
    );
  }

  // If `me` failed, the visitor is treated as anonymous, as in the header.
  if (me.data?.user) {
    return <Navigate to={target} replace />;
  }

  const onSubmit = handleSubmit((request) => {
    logIn.mutate(request, {
      onSuccess: () => void navigate(target, { replace: true }),
      onError: (error) => {
        if (!(error instanceof ApiError)) {
          return;
        }
        for (const field of error.fields ?? []) {
          if (isField(field.path)) {
            setError(field.path, { type: 'server', message: field.message });
          }
        }
      },
    });
  });

  const alert = formAlert(logIn.error);

  return (
    <section className="mx-auto w-full max-w-md space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log in</h1>
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        <TextField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          registration={register('email')}
          error={errors.email?.message}
        />
        <TextField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          registration={register('password')}
          error={errors.password?.message}
        />
        {alert && (
          <p
            role="alert"
            className="rounded border border-red-700 px-3 py-2 text-base text-red-800"
          >
            {alert}
          </p>
        )}
        <button
          type="submit"
          disabled={logIn.isPending}
          className="min-h-11 w-full rounded bg-blue-700 px-5 py-2 text-base font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60 sm:w-auto"
        >
          {logIn.isPending ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p>
        <Link
          to="/signup"
          className="inline-flex min-h-11 items-center rounded text-base font-medium text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
