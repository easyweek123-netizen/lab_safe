import { Navigate, Outlet, useLocation } from 'react-router';
import { useMe } from '../api/auth';
import { AccountNotice } from './AccountNotice';

/** Who may see the pages under the gate: any approved account, or admins only. */
export type AccessLevel = 'contributor' | 'admin';

type RequireAccountProps = {
  level: AccessLevel;
};

/** `/login?next=<path>`; slashes stay readable (`next=/contribute`), the rest is encoded. */
function loginPath(path: string): string {
  return `/login?next=${encodeURIComponent(path).replaceAll('%2F', '/')}`;
}

// The account gate (E02 design "Screens", decision E02-D7): a layout route that decides from
// `useMe()` at the requested address. Loading, error with Retry (AC15), anonymous → login with
// `next` (AC9), PENDING or REJECTED → the notice (AC8), otherwise the page. At level
// `contributor` every APPROVED account passes; at level `admin` only admins, and an approved
// contributor sees "No access" (S02.2 AC10).
// Once `me` has loaded, the gate decides from the cached data, also while a background refresh
// runs or after it failed (network error or 500), so a half-written form under it stays mounted
// (S03.3 AC1, decision E03-D7). A refresh that succeeds with other data re-decides (S03.3 AC2).
export function RequireAccount({ level }: RequireAccountProps) {
  const { data, isError, isFetching, refetch } = useMe();
  const location = useLocation();

  if (data === undefined) {
    // While a Retry runs, show the loading state again instead of the old error (as HomePage).
    if (isError && !isFetching) {
      return (
        <div className="space-y-3">
          <p role="alert" className="text-base text-slate-900">
            Couldn't load, try again.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-11 rounded bg-blue-700 px-5 py-2 text-base font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Retry
          </button>
        </div>
      );
    }
    return (
      <p role="status" className="text-base text-slate-700">
        Loading…
      </p>
    );
  }

  const { user } = data;
  if (!user) {
    return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  }

  if (user.status === 'PENDING') {
    return <AccountNotice kind="waiting" />;
  }
  if (user.status === 'REJECTED') {
    return <AccountNotice kind="not-approved" />;
  }

  switch (level) {
    case 'contributor':
      // Any approved account, contributor or admin.
      return <Outlet />;
    case 'admin':
      return user.role === 'ADMIN' ? <Outlet /> : <AccountNotice kind="no-access" />;
  }
}
