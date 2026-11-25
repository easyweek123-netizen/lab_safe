import { SubmissionIdParam, type SafetyPageContent } from '@labsafe/shared';
import { useNavigate, useParams } from 'react-router';
import { useMe } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useMetaLists } from '../../api/meta';
import { useSubmission, useUpdateSubmission } from '../../api/submissions';
import { fromContent } from '../../components/safety-page-form/form-values';
import { SafetyPageForm } from '../../components/safety-page-form/SafetyPageForm';
import { NotFoundPage } from '../not-found/NotFoundPage';

/** A 404 (missing or not visible, E03-D4) or a 400 (malformed id) means "Page not found". */
function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 400);
}

// `/contribute/submissions/:id` (S03.2 "UI states"): the author's pending page in the S03.1 form,
// filled in once from the loaded submission. Once the form is shown, a later refresh of the
// submission, failed or not, never resets or hides it (AC6, E03-D7): the form's `defaultValues`
// are read only when it mounts. An unknown or malformed id, or someone else's submission (an
// admin's included), shows "Page not found". A save goes to `/contribute` with the confirmation.
export function EditSafetyPagePage() {
  const { id = '' } = useParams();
  const validId = SubmissionIdParam.safeParse({ id }).success;
  const me = useMe();
  const lists = useMetaLists();
  const submission = useSubmission(id, { enabled: validId });
  const updateSubmission = useUpdateSubmission(id);
  const navigate = useNavigate();

  if (!validId || (!submission.data && isNotFound(submission.error))) {
    return <NotFoundPage />;
  }
  // The gate has loaded `me`; only the author edits (an admin may read it, but not here).
  if (submission.data && submission.data.submittedBy.id !== me.data?.user?.id) {
    return <NotFoundPage />;
  }

  const onSubmit = async (content: SafetyPageContent) => {
    const saved = await updateSubmission.mutateAsync(content);
    await navigate('/contribute', {
      state: {
        confirmation: `Your changes to ${saved.content.name} were saved. It is still waiting for review.`,
      },
    });
  };

  // The error state only while there is no data yet; a Retry shows the loading state again.
  const failed = (!submission.data && submission.isError) || (!lists.data && lists.isError);
  const retrying = failed && (submission.isFetching || lists.isFetching);
  const retry = () => {
    if (!submission.data) {
      void submission.refetch();
    }
    if (!lists.data) {
      void lists.refetch();
    }
  };

  function renderBody() {
    if (submission.data && lists.data) {
      return (
        <SafetyPageForm
          key={submission.data.id}
          defaultValues={fromContent(submission.data.content)}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          onSubmit={onSubmit}
        />
      );
    }
    if (failed && !retrying) {
      return (
        <div className="space-y-3">
          <p role="alert" className="text-base text-slate-900">
            Couldn't load this page, try again.
          </p>
          <button
            type="button"
            onClick={retry}
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
    <section className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit safety page</h1>
      {renderBody()}
    </section>
  );
}
