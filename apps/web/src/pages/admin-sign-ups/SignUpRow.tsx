import type { AdminUser } from '@labsafe/shared';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useDecideSignUp, type SignUpDecision } from '../../api/admin-users';

/** The outcome of an action, for the page's message (S02.2 AC6–AC8, AC11). */
export type SignUpOutcome =
  { kind: 'done'; decision: SignUpDecision; name: string } | { kind: 'failed'; error: unknown };

type SignUpRowProps = {
  signUp: AdminUser;
  /** Called before an action is sent, to clear the previous message. */
  onStart: () => void;
  onOutcome: (outcome: SignUpOutcome) => void;
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

const BUTTON =
  'min-h-11 rounded px-4 py-2 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60';
const PRIMARY = `${BUTTON} bg-blue-700 text-white hover:bg-blue-800`;
const SECONDARY = `${BUTTON} border border-slate-300 text-slate-900 hover:bg-slate-100`;
const DANGER = `${BUTTON} bg-red-700 text-white hover:bg-red-800`;

// One pending sign-up: name, email, sign-up date, "Approve" and "Reject" with an inline
// confirm step. Focus moves to "Yes, reject" when the step opens and back to "Reject" on
// "Cancel". While an action is being sent, the row's buttons are disabled (AC11).
export function SignUpRow({ signUp, onStart, onOutcome }: SignUpRowProps) {
  const decide = useDecideSignUp();
  const [confirming, setConfirming] = useState(false);
  const rejectRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  function send(decision: SignUpDecision) {
    onStart();
    // `mutateAsync` settles even when the row has gone from the list by then.
    decide.mutateAsync({ id: signUp.id, decision }).then(
      () => onOutcome({ kind: 'done', decision, name: signUp.name }),
      (error: unknown) => onOutcome({ kind: 'failed', error }),
    );
  }

  function openConfirm() {
    flushSync(() => setConfirming(true));
    confirmRef.current?.focus();
  }

  function cancelConfirm() {
    flushSync(() => setConfirming(false));
    rejectRef.current?.focus();
  }

  function confirmReject() {
    setConfirming(false);
    send('reject');
  }

  const busy = decide.isPending;

  return (
    <li className="space-y-3 rounded border border-slate-200 px-4 py-3">
      <div className="min-w-0 space-y-1">
        <p className="text-base font-semibold break-words text-slate-900">{signUp.name}</p>
        <p className="text-base break-words text-slate-700">{signUp.email}</p>
        <p className="text-base text-slate-700">
          Signed up{' '}
          <time dateTime={signUp.createdAt}>{DATE_FORMAT.format(new Date(signUp.createdAt))}</time>
        </p>
      </div>
      {confirming ? (
        <div className="space-y-2">
          <p className="text-base text-slate-900">Reject this sign-up? This can't be undone.</p>
          <div className="flex flex-wrap gap-2">
            <button
              ref={confirmRef}
              type="button"
              onClick={confirmReject}
              disabled={busy}
              className={DANGER}
            >
              Yes, reject
            </button>
            <button type="button" onClick={cancelConfirm} disabled={busy} className={SECONDARY}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => send('approve')} disabled={busy} className={PRIMARY}>
            Approve
          </button>
          <button
            ref={rejectRef}
            type="button"
            onClick={openConfirm}
            disabled={busy}
            className={SECONDARY}
          >
            Reject
          </button>
        </div>
      )}
    </li>
  );
}
