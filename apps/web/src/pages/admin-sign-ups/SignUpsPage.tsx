import { useState } from 'react';
import { usePendingSignUps } from '../../api/admin-users';
import { ApiError } from '../../api/client';
import { SignUpRow, type SignUpOutcome } from './SignUpRow';

/** The page's message after an action: a `status` on success, an `alert` on failure. */
type Message = { role: 'status' | 'alert'; text: string };

function messageFor(outcome: SignUpOutcome): Message {
  if (outcome.kind === 'done') {
    const verb = outcome.decision === 'approve' ? 'Approved' : 'Rejected';
    return { role: 'status', text: `${verb} ${outcome.name}.` };
  }
  if (outcome.error instanceof ApiError && outcome.error.code === 'USER_NOT_PENDING') {
    return { role: 'alert', text: 'This sign-up was already handled.' };
  }
  // 500, a network error, or a 401/403 (then the account gate takes over the page).
  return { role: 'alert', text: "Couldn't save, try again." };
}

// `/admin/sign-ups` (S02.2 "UI states"), behind `RequireAccount level="admin"`: the pending
// sign-ups, oldest first, each with "Approve" and "Reject". Loading, empty, error with Retry,
// and the message of the last action.
export function SignUpsPage() {
  const { data, isPending, isError, isFetching, refetch } = usePendingSignUps();
  const [message, setMessage] = useState<Message | null>(null);

  function renderList() {
    // While a Retry runs, show the loading state again instead of the old error (as HomePage).
    if (isPending || (isError && isFetching)) {
      return (
        <p role="status" className="text-base text-slate-700">
          Loading…
        </p>
      );
    }
    if (isError) {
      return (
        <div className="space-y-3">
          <p role="alert" className="text-base text-slate-900">
            Couldn't load, try again.
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
    if (data.users.length === 0) {
      return <p className="text-base text-slate-700">No pending sign-ups</p>;
    }
    return (
      <ul aria-label="Pending sign-ups" className="space-y-3">
        {data.users.map((signUp) => (
          <SignUpRow
            key={signUp.id}
            signUp={signUp}
            onStart={() => setMessage(null)}
            onOutcome={(outcome) => setMessage(messageFor(outcome))}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign-ups</h1>
      {message && (
        <p role={message.role} className="text-base break-words text-slate-900">
          {message.text}
        </p>
      )}
      {renderList()}
    </div>
  );
}
