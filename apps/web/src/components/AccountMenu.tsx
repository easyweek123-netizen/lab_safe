import { Link } from 'react-router';
import { useLogOut, useMe } from '../api/auth';

const LINK_CLASS =
  'inline-flex min-h-11 items-center rounded px-2 text-base font-medium text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700';

// The account part of the header (S02.1 "UI states"): nothing while `me` loads, "Log in" for an
// anonymous visitor or when `me` failed, and the name, "Contributor area" and "Log out" when
// signed in; admins also get "Sign-ups" (S02.2 AC10) and "Accounts" (S02.3 AC10). It wraps
// instead of scrolling sideways at 375 px.
export function AccountMenu() {
  const { data, isPending, isError } = useMe();
  const logOut = useLogOut();

  if (isPending) {
    return null;
  }

  const user = isError ? null : data.user;
  if (!user) {
    return (
      <Link to="/login" className={LINK_CLASS}>
        Log in
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className="min-w-0 px-2 text-base break-words text-slate-700">{user.name}</span>
      <Link to="/contribute" className={LINK_CLASS}>
        Contributor area
      </Link>
      {user.role === 'ADMIN' && user.status === 'APPROVED' && (
        <>
          <Link to="/admin/sign-ups" className={LINK_CLASS}>
            Sign-ups
          </Link>
          <Link to="/admin/accounts" className={LINK_CLASS}>
            Accounts
          </Link>
        </>
      )}
      <button
        type="button"
        onClick={() => logOut.mutate()}
        disabled={logOut.isPending}
        className="min-h-11 rounded border border-slate-300 px-4 py-2 text-base font-medium text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60"
      >
        Log out
      </button>
    </div>
  );
}
