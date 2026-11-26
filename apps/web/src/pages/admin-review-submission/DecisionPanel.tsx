import { zodResolver } from '@hookform/resolvers/zod';
import { RejectSubmissionRequest } from '@labsafe/shared';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { z } from 'zod';
import { useApproveSubmission, useRejectSubmission } from '../../api/review';
import { TextArea } from '../../components/TextArea';
import { decisionFailure, noteFieldError } from './decision-messages';

/** The router state `/admin/review` reads after a decision (S04.2 AC1). */
interface DecisionConfirmation {
  confirmation: string;
  /** The approved page's public address (none for a rejected page), for the link "Open the public page". */
  publicPath: string | null;
}

interface DecisionPanelProps {
  /** The submission's id. */
  id: string;
  /** The `version` of the loaded preview; the decision sends it back (AC9). */
  version: number;
  /** The page's name, for the confirmation. */
  name: string;
  /** Loads the current version of the preview ("Reload the page", AC9). */
  onReload: () => void;
}

const BUTTON_CLASS =
  'min-h-11 rounded bg-green-700 px-5 py-2 text-base font-medium text-white hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-60';

const REJECT_BUTTON_CLASS =
  'min-h-11 rounded bg-red-700 px-5 py-2 text-base font-medium text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60';

// The admin's decision on a pending page (S04.2, S04.3), between the submitter line and the
// view: "Approve", then the note for the contributor and "Reject". One `alert` for a failed
// decision above the buttons: starting a decision resets the other one and the mutation drops
// its own error when it runs again. While a decision is sent every decision button is disabled.
// The note is checked with the shared `RejectSubmissionRequest` before anything is sent; its
// message, and a server `fields: note`, show next to the field, which gets the focus (AC2).
export function DecisionPanel({ id, version, name, onReload }: DecisionPanelProps) {
  const navigate = useNavigate();
  const approve = useApproveSubmission(id);
  const reject = useRejectSubmission(id);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<z.input<typeof RejectSubmissionRequest>, unknown, RejectSubmissionRequest>({
    resolver: zodResolver(RejectSubmissionRequest),
    defaultValues: { note: '' },
  });
  const busy = approve.isPending || reject.isPending;
  // A note the server refused shows next to the field, not as an alert.
  const failedDecision = approve.isError
    ? approve.error
    : reject.isError && !noteFieldError(reject.error)
      ? reject.error
      : null;
  const failure = failedDecision ? decisionFailure(failedDecision) : null;

  function goToQueue(confirmation: string, publicPath: string | null) {
    const state: DecisionConfirmation = { confirmation, publicPath };
    void navigate('/admin/review', { state });
  }

  function handleApprove() {
    reject.reset();
    approve.mutate(version, {
      onSuccess: (decision) =>
        goToQueue(
          `${name} was approved and published.`,
          decision.slug ? `/instruments/${decision.slug}` : null,
        ),
    });
  }

  const handleReject = handleSubmit((request) => {
    approve.reset();
    reject.mutate(request, {
      onSuccess: () => goToQueue(`${name} was rejected. The contributor can see your note.`, null),
      onError: (error) => {
        const message = noteFieldError(error);
        if (message) {
          setError('note', { type: 'server', message });
          setFocus('note');
        }
      },
    });
  });

  function handleReload() {
    approve.reset();
    reject.reset();
    onReload();
  }

  return (
    <section aria-label="Decision" className="space-y-3">
      {failure && (
        <div
          role="alert"
          className="space-y-3 rounded border border-red-700 bg-red-50 px-4 py-3 text-base break-words text-slate-900"
        >
          <p>{failure.message}</p>
          {failure.action === 'back-to-queue' && (
            <Link
              to="/admin/review"
              className="inline-block font-medium text-blue-700 underline hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Back to pages to review
            </Link>
          )}
          {failure.action === 'reload' && (
            <button
              type="button"
              onClick={handleReload}
              className="min-h-11 rounded bg-blue-700 px-5 py-2 text-base font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Reload the page
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={handleApprove} disabled={busy} className={BUTTON_CLASS}>
          {approve.isPending ? 'Approving…' : 'Approve'}
        </button>
      </div>
      <form noValidate onSubmit={(event) => void handleReject(event)} className="space-y-3">
        <TextArea
          id="review-note"
          label="Note for the contributor"
          registration={register('note')}
          error={errors.note?.message}
        />
        <button type="submit" disabled={busy} className={REJECT_BUTTON_CLASS}>
          {reject.isPending ? 'Rejecting…' : 'Reject'}
        </button>
      </form>
    </section>
  );
}
