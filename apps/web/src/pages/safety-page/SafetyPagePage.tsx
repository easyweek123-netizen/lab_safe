import { InstrumentSlugParam } from '@labsafe/shared';
import { useParams } from 'react-router';
import { ApiError } from '../../api/client';
import { usePublishedPage } from '../../api/instruments';
import { SafetyPageView } from '../../components/safety-page-view/SafetyPageView';
import { NotFoundPage } from '../not-found/NotFoundPage';

/** A 404 (unknown or unpublished slug) or a 400 (slug too long) means "Page not found". */
function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 400);
}

// `/instruments/:slug` (S04.2 "UI states"), outside every `RequireAccount`: the published page
// for anyone, in the same `SafetyPageView` as the admin's preview, with its title as the page's
// only h1 and the "Last approved" line. A slug outside `InstrumentSlugParam` sends no request;
// an unknown or unpublished one shows "Page not found". Once loaded, a failed background
// refresh keeps the page (E03-D7).
export function SafetyPagePage() {
  const { slug = '' } = useParams();
  const validSlug = InstrumentSlugParam.safeParse({ slug }).success;
  const { data, error, isError, isFetching, refetch } = usePublishedPage(slug, {
    enabled: validSlug,
  });

  if (!validSlug || (!data && isNotFound(error))) {
    return <NotFoundPage />;
  }
  if (data) {
    return <SafetyPageView page={data.page} headingLevel={1} />;
  }
  // No data yet, so no title: a hidden h1 keeps one h1 per page. The error state shows unless a
  // Retry is running (then loading again).
  return (
    <section className="space-y-3">
      <h1 className="sr-only">Safety page</h1>
      {isError && !isFetching ? (
        <>
          <p role="alert" className="text-base text-slate-900">
            Couldn't load this safety page, try again.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-11 rounded bg-blue-700 px-5 py-2 text-base font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Retry
          </button>
        </>
      ) : (
        <p role="status" className="text-base text-slate-700">
          Loading safety page…
        </p>
      )}
    </section>
  );
}
