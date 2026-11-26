import type { RevisionStatus, SubmissionSummary } from '@labsafe/shared';
import { Link } from 'react-router';
import { useMySubmissions } from '../../api/submissions';
import { formatDate } from '../../components/format-date';

/** A submission's status in words (never by colour alone). */
const STATUS_LABELS: Record<RevisionStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

/**
 * Where a row's name leads: an approved page to its public page (S04.2 AC10), any other to its
 * edit page (S03.2 AC1) or, rejected, its fix form (S04.3 AC4). An approved row without a slug (outside the contract) gets no link.
 */
function rowLink(submission: SubmissionSummary): string | null {
  if (submission.status === 'APPROVED') {
    return submission.slug === null ? null : `/instruments/${submission.slug}`;
  }
  return `/contribute/submissions/${submission.id}`;
}

// The "My submissions" part of `/contribute` (S03.1 AC16): the caller's own submissions, newest
// first, as `GET /api/submissions/mine` returns them; loading, empty, error with Retry. Each name
// is a link to the submission's edit page (S03.2 AC1), or to the public page once approved (S04.2
// AC10). A rejected row shows the admin's note word for word, line breaks kept, and links to the
// fix form (S04.3 AC4).
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
        {data.submissions.map((submission) => {
          const to = rowLink(submission);
          return (
            <li
              key={submission.id}
              className="min-w-0 space-y-1 rounded border border-slate-200 px-4 py-3"
            >
              <p className="text-base font-semibold break-words">
                {to === null ? (
                  submission.name
                ) : (
                  <Link
                    to={to}
                    className="inline-block rounded py-1 text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    {submission.name}
                  </Link>
                )}
              </p>
              <p className="text-base text-slate-700">
                Submitted{' '}
                <time dateTime={submission.submittedAt}>{formatDate(submission.submittedAt)}</time>
              </p>
              <p className="text-base text-slate-700">{`Status: ${STATUS_LABELS[submission.status]}`}</p>
              {submission.status === 'REJECTED' && submission.reviewNote !== null && (
                <p className="text-base break-words whitespace-pre-wrap text-slate-900">
                  {`Admin's note: ${submission.reviewNote}`}
                </p>
              )}
            </li>
          );
        })}
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
