import type { RevisionStatus } from '@labsafe/shared';
import { Link } from 'react-router';
import { useMySubmissions } from '../../api/submissions';

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

/** A submission's status in words (never by colour alone). */
const STATUS_LABELS: Record<RevisionStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// The "My submissions" part of `/contribute` (S03.1 AC16): the caller's own submissions, newest
// first, as `GET /api/submissions/mine` returns them; loading, empty, error with Retry. Each name
// is a link to the submission's edit page (S03.2 AC1).
export function MySubmissions() {
  const { data, isPending, isError, isFetching, refetch } = useMySubmissions();

  function renderList() {
    // While a Retry runs, show the loading state again instead of the old error (as HomePage).
    if (isPending || (isError && isFetching)) {
      return (
        <p role="status" className="text-base text-slate-700">
          Loading your submissions…
        </p>
      );
    }
    if (isError) {
      return (
        <div className="space-y-3">
          <p role="alert" className="text-base text-slate-900">
            Couldn't load your submissions, try again.
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
    if (data.submissions.length === 0) {
      return <p className="text-base text-slate-700">You haven't submitted any pages yet.</p>;
    }
    return (
      <ul aria-labelledby="my-submissions-heading" className="space-y-3">
        {data.submissions.map((submission) => (
          <li
            key={submission.id}
            className="min-w-0 space-y-1 rounded border border-slate-200 px-4 py-3"
          >
            <p className="text-base font-semibold break-words">
              <Link
                to={`/contribute/submissions/${submission.id}`}
                className="inline-block rounded py-1 text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                {submission.name}
              </Link>
            </p>
            <p className="text-base text-slate-700">
              Submitted{' '}
              <time dateTime={submission.submittedAt}>
                {DATE_FORMAT.format(new Date(submission.submittedAt))}
              </time>
            </p>
            <p className="text-base text-slate-700">{`Status: ${STATUS_LABELS[submission.status]}`}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="space-y-3">
      <h2 id="my-submissions-heading" className="text-xl font-semibold text-slate-900">
        My submissions
      </h2>
      {renderList()}
    </section>
  );
}
