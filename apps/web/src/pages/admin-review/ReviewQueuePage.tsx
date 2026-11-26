import { Link, useLocation } from 'react-router';
import { useReviewQueue } from '../../api/review';
import { ReviewQueueRow } from './ReviewQueueRow';

/** The confirmation that S04.2's approve and S04.3's reject put in the router state. */
function confirmationFrom(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'confirmation' in state) {
    const { confirmation } = state;
    return typeof confirmation === 'string' ? confirmation : null;
  }
  return null;
}

/** The approved page's public address from the router state (S04.2 AC1), only an `/instruments/` path. */
function publicPathFrom(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'publicPath' in state) {
    const { publicPath } = state;
    return typeof publicPath === 'string' && publicPath.startsWith('/instruments/')
      ? publicPath
      : null;
  }
  return null;
}

// `/admin/review` (S04.1 "UI states"), behind `RequireAccount level="admin"`: every pending page
// in the order the server sends it (oldest submission first), each a link to its preview.
// Loading, empty, error with Retry; once the list has loaded, a failed background refresh keeps
// it on screen (E03-D7). Shows the confirmation from the router state, if any, with the link to
// the approved page's public address (S04.2 AC1).
export function ReviewQueuePage() {
  const { data, isError, isFetching, refetch } = useReviewQueue();
  const { state } = useLocation();
  const confirmation = confirmationFrom(state);
  const publicPath = publicPathFrom(state);

  function renderList() {
    if (data) {
      if (data.items.length === 0) {
        return <p className="text-base text-slate-700">No pages waiting for review.</p>;
      }
      return (
        <ul aria-labelledby="review-queue-heading" className="space-y-3">
          {data.items.map((item) => (
            <ReviewQueueRow key={item.id} item={item} />
          ))}
        </ul>
      );
    }
    // No data yet: the error state, unless a Retry is running (then loading again).
    if (isError && !isFetching) {
      return (
        <div className="space-y-3">
          <p role="alert" className="text-base text-slate-900">
            Couldn't load the pages to review, try again.
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
        Loading pages to review…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h1 id="review-queue-heading" className="text-2xl font-bold tracking-tight text-slate-900">
        Pages to review
      </h1>
      {confirmation && (
        <p
          role="status"
          className="rounded border border-green-700 bg-green-50 px-4 py-3 text-base break-words text-slate-900"
        >
          {confirmation}
          {publicPath && (
            <>
              {' '}
              <Link
                to={publicPath}
                className="font-medium text-blue-700 underline hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Open the public page
              </Link>
            </>
          )}
        </p>
      )}
      {renderList()}
    </div>
  );
}
