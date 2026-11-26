import { SubmissionIdParam, type SafetyPageContent } from '@labsafe/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMe } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useMetaLists } from '../../api/meta';
import { useSubmission, useUpdateSubmission } from '../../api/submissions';
import { fromContent } from '../../components/safety-page-form/form-values';
import { SafetyPageForm } from '../../components/safety-page-form/SafetyPageForm';
import { NotFoundPage } from '../not-found/NotFoundPage';
import { ReviewNote } from './ReviewNote';

/** The form shown for one submission: the E03 edit of a pending page, or the S04.3 fix. */
type FormShown = { id: string; fix: boolean };

/** A 404 (missing or not visible, E03-D4) or a 400 (malformed id) means "Page not found". */
function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 400);
}

// `/contribute/submissions/:id` (S03.2 "UI states"): the author's pending page in the S03.1 form,
// filled in once from the loaded submission. Once the form is shown, a later refresh of the
// submission, failed or not, never resets or hides it (AC6, E03-D7): the form's `defaultValues`
// are read only when it mounts. An unknown or malformed id, or someone else's submission (an
// admin's included), shows "Page not found". A save goes to `/contribute` with the confirmation.
// An approved page shows a note and the link to its public page instead of the form (S04.2 AC10);
// a form already on screen stays even if a refresh answers the page approved meanwhile, and saving
// it shows the server's 409 message in the form's alert. A rejected page is the fix form (S04.3
// AC5): h1 "Fix safety page", the admin's note above the form, "Resubmit for review". Whether the
// open form is an edit or a fix is fixed when it is first shown, so a refresh that answers another
// status never changes it (E03-D7); the h1 reads "Edit safety page" until the page has loaded.
export function EditSafetyPagePage() {
  const { id = '' } = useParams();
  const validId = SubmissionIdParam.safeParse({ id }).success;
  const me = useMe();
  const lists = useMetaLists();
  const submission = useSubmission(id, { enabled: validId });
  const updateSubmission = useUpdateSubmission(id);
  const navigate = useNavigate();
  // The id whose form has been shown and its kind (UI state, not server data): once shown, it
  // stays (E03-D7).
  const [formShown, setFormShown] = useState<FormShown | null>(null);
  const formShownFor = formShown?.id ?? null;

  if (!validId || (!submission.data && isNotFound(submission.error))) {
    return <NotFoundPage />;
  }
  // The gate has loaded `me`; only the author edits (an admin may read it, but not here).
  if (submission.data && submission.data.submittedBy.id !== me.data?.user?.id) {
    return <NotFoundPage />;
  }

  const fix =
    formShown !== null && formShown.id === submission.data?.id
      ? formShown.fix
      : submission.data?.status === 'REJECTED';

  const onSubmit = async (content: SafetyPageContent) => {
    const saved = await updateSubmission.mutateAsync(content);
    await navigate('/contribute', {
      state: {
        confirmation: fix
          ? `${saved.content.name} was resubmitted and is waiting for review.`
          : `Your changes to ${saved.content.name} were saved. It is still waiting for review.`,
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

  const approved =
    submission.data?.status === 'APPROVED' && formShownFor !== submission.data.id
      ? submission.data
      : null;
  const showForm = submission.data && lists.data && !approved ? submission.data : null;
  if (showForm && formShownFor !== showForm.id) {
    // Stored during render (React's "information from previous renders" pattern), not in an effect.
    setFormShown({ id: showForm.id, fix });
  }

  function renderBody() {
    if (approved) {
      return (
        <div className="space-y-3">
          <p className="text-base text-slate-900">
            This page was approved and can't be changed here.
          </p>
          {approved.slug !== null && (
            <p className="text-base">
              <Link
                to={`/instruments/${approved.slug}`}
                className="inline-block rounded py-1 text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Open the public page
              </Link>
            </p>
          )}
        </div>
      );
    }
    if (submission.data && lists.data) {
      const note = submission.data.status === 'REJECTED' ? submission.data.reviewNote : null;
      return (
        <>
          {fix && note !== null && <ReviewNote note={note} />}
          <SafetyPageForm
            key={submission.data.id}
            defaultValues={fromContent(submission.data.content)}
            submitLabel={fix ? 'Resubmit for review' : 'Save changes'}
            submittingLabel={fix ? 'Resubmitting…' : 'Saving…'}
            onSubmit={onSubmit}
          />
        </>
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
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {fix ? 'Fix safety page' : 'Edit safety page'}
      </h1>
      {renderBody()}
    </section>
  );
}
