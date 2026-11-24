import { zodResolver } from '@hookform/resolvers/zod';
import { SignUpRequest } from '@labsafe/shared';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';
import type { z } from 'zod';
import { useMe, useSignUp } from '../../api/auth';
import { ApiError } from '../../api/client';
import { TextField } from '../../components/TextField';

const AFTER_SIGN_UP = '/contribute';
const FIELDS = ['name', 'email', 'password'] as const;
type Field = (typeof FIELDS)[number];

function isField(path: string): path is Field {
  return (FIELDS as readonly string[]).includes(path);
}

/** The `alert` above the button: none when the server named the fields (400, 409). */
function formAlert(error: Error | null): string | null {
  if (!error) {
    return null;
  }
  if (error instanceof ApiError && error.fields?.some((field) => isField(field.path))) {
    return null;
  }
  return 'Something went wrong, try again.';
}

// `/signup` (S02.1 "UI states"): name, email and password, checked with the shared schema on
// submit; the server's `fields` errors (400, 409 `EMAIL_TAKEN`) appear next to their inputs.
// A signed-in visitor is sent to `/contribute` (AC16), and so is a new account (AC1).
export function SignUpPage() {
  const me = useMe();
  const signUp = useSignUp();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<typeof SignUpRequest>, unknown, SignUpRequest>({
    resolver: zodResolver(SignUpRequest),
    defaultValues: { name: '', email: '', password: '' },
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
    return <Navigate to={AFTER_SIGN_UP} replace />;
  }

  const onSubmit = handleSubmit((request) => {
    signUp.mutate(request, {
      onSuccess: () => void navigate(AFTER_SIGN_UP, { replace: true }),
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

  const alert = formAlert(signUp.error);

  return (
    <section className="mx-auto w-full max-w-md space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign up</h1>
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        <TextField
          id="signup-name"
          label="Name"
          type="text"
          autoComplete="name"
          registration={register('name')}
          error={errors.name?.message}
        />
        <TextField
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          registration={register('email')}
          error={errors.email?.message}
        />
        <TextField
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
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
          disabled={signUp.isPending}
          className="min-h-11 w-full rounded bg-blue-700 px-5 py-2 text-base font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60 sm:w-auto"
        >
          {signUp.isPending ? 'Signing up…' : 'Sign up'}
        </button>
      </form>
      <p>
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center rounded text-base font-medium text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          Already have an account? Log in
        </Link>
      </p>
    </section>
  );
}
