import { SubmissionIdParam } from '@labsafe/shared';
import { Link, useParams } from 'react-router';
import { ApiError } from '../../api/client';
import { useReviewSubmission } from '../../api/review';
import { formatDate } from '../../components/format-date';
import { SafetyPageView } from '../../components/safety-page-view/SafetyPageView';
import { NotFoundPage } from '../not-found/NotFoundPage';
import { DecisionPanel } from './DecisionPanel';
import { ALREADY_REVIEWED_MESSAGE } from './decision-messages';

/** A 404 (unknown id) or a 400 (malformed id) means "Page not found". */
function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 400);
}

// `/admin/review/:id` (S04.1 "UI states"), behind `RequireAccount level="admin"`: who submitted
// the page and when, then the page exactly as the public page shows it (`SafetyPageView` under
// this h1, so its title is a level-2 heading). A malformed id sends no request; an unknown one
// shows "Page not found". Once loaded, a failed background refresh keeps the preview (E03-D7).
// A pending page has the decision panel (S04.2) between the submitter line and the view; a page
// that is no longer pending says so there instead, with no decision buttons (S04.2 AC8).
export function ReviewSubmissionPage() {
  const { id = '' } = useParams();
  const validId = SubmissionIdParam.safeParse({ id }).success;
  const { data, error, isError, isFetching, refetch } = useReviewSubmission(id, {
    enabled: validId,
  });

  if (!validId || (!data && isNotFound(error))) {
    return <NotFoundPage />;
  }

  function renderBody() {
    if (data) {
      return (
        <>
          <p className="text-base break-words text-slate-700">
            {`Submitted by ${data.submittedBy.name} on `}
            <time dateTime={data.submittedAt}>{formatDate(data.submittedAt)}</time>
          </p>
          {data.status === 'PENDING' ? (
            <DecisionPanel
              id={data.id}
              version={data.version}
              name={data.page.content.name}
              onReload={() => void refetch()}
            />
          ) : (
            <div className="space-y-2 rounded border border-slate-400 bg-slate-50 px-4 py-3 text-base text-slate-900">
              <p>{ALREADY_REVIEWED_MESSAGE}</p>
              <Link
                to="/admin/review"
                className="inline-block font-medium text-blue-700 underline hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Back to pages to review
              </Link>
            </div>
          )}
          <SafetyPageView page={data.page} headingLevel={2} />
        </>
      );
    }
    // No data yet: the error state, unless a Retry is running (then loading again).
    if (isError && !isFetching) {
      return (
        <div className="space-y-3">
          <p role="alert" className="text-base text-slate-900">
            Couldn't load this page, try again.
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

  return (
    <div className="min-w-0 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Review a new page</h1>
      {renderBody()}
    </div>
  );
}
