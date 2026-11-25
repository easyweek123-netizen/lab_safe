import type { SafetyPageContent } from '@labsafe/shared';
import { useNavigate } from 'react-router';
import { useMetaLists } from '../../api/meta';
import { useSubmitPage } from '../../api/submissions';
import { SafetyPageForm } from '../../components/safety-page-form/SafetyPageForm';

// `/contribute/new` (S03.1 "UI states"): the empty safety page form once the lists of
// `GET /api/meta/lists` are loaded (AC18). A submitted page goes to `/contribute` with the
// confirmation in the router state (`{ confirmation }`, shown by the contributor area, FE-05).
export function NewSafetyPagePage() {
  const lists = useMetaLists();
  const submitPage = useSubmitPage();
  const navigate = useNavigate();

  const onSubmit = async (content: SafetyPageContent) => {
    const submission = await submitPage.mutateAsync(content);
    await navigate('/contribute', {
      state: {
        confirmation: `${submission.content.name} was submitted and is waiting for review.`,
      },
    });
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">New safety page</h1>
      {/* While a Retry runs, the loading state shows again, as on the home page. */}
      {lists.isPending || (lists.isError && lists.isFetching) ? (
        <p role="status" className="text-base text-slate-700">
          Loading…
        </p>
      ) : lists.isError ? (
        <div className="space-y-3">
          <p role="alert" className="text-base text-slate-900">
            Couldn't load the form, try again.
          </p>
          <button
            type="button"
            onClick={() => void lists.refetch()}
            className="min-h-11 rounded bg-blue-700 px-5 py-2 text-base font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <SafetyPageForm
          submitLabel="Submit for review"
          submittingLabel="Submitting…"
          onSubmit={onSubmit}
        />
      )}
    </section>
  );
}
