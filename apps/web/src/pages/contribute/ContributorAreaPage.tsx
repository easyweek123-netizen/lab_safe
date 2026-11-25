import { Link, useLocation } from 'react-router';
import { MySubmissions } from './MySubmissions';

/** The confirmation that `/contribute/new` puts in the router state after a submit (S03.1 AC8). */
function confirmationFrom(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'confirmation' in state) {
    const { confirmation } = state;
    return typeof confirmation === 'string' ? confirmation : null;
  }
  return null;
}

// `/contribute` (S02.1 "UI states"): the contributor area, shown by `RequireAccount` only to an
// approved contributor or an admin. S03.1 adds the "New safety page" link, the confirmation after
// a submit (from the router state) and My submissions.
export function ContributorAreaPage() {
  const location = useLocation();
  const confirmation = confirmationFrom(location.state);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contributor area</h1>
        <p className="text-base text-slate-700">Here you will write and update safety pages.</p>
        <p>
          <Link
            to="/contribute/new"
            className="inline-flex min-h-11 items-center rounded bg-blue-700 px-5 py-2 text-base font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            New safety page
          </Link>
        </p>
        {confirmation && (
          <p
            role="status"
            className="rounded border border-green-700 bg-green-50 px-4 py-3 text-base break-words text-slate-900"
          >
            {confirmation}
          </p>
        )}
      </section>
      <MySubmissions />
    </div>
  );
}
