import type { AdminUser, Role } from '@labsafe/shared';
import { useChangeRole } from '../../api/admin-users';

/** The outcome of a role change, for the page's message (S02.3 AC3–AC5, AC11). */
export type RoleOutcome = { kind: 'done'; account: AdminUser } | { kind: 'failed'; error: unknown };

type AccountRowProps = {
  account: AdminUser;
  /** Called before a change is sent, to clear the previous message. */
  onStart: () => void;
  onOutcome: (outcome: RoleOutcome) => void;
};

const ROLE_WORDS: Record<Role, string> = {
  ADMIN: 'Admin',
  CONTRIBUTOR: 'Contributor',
};

const BUTTON =
  'min-h-11 rounded px-4 py-2 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60';
const PRIMARY = `${BUTTON} bg-blue-700 text-white hover:bg-blue-800`;
const SECONDARY = `${BUTTON} border border-slate-300 text-slate-900 hover:bg-slate-100`;

// One approved account: name, email, the role in words, and "Make admin" for a contributor or
// "Remove admin" for an admin. The button's accessible name starts with its visible text and adds
// the person's name ("Make admin Anna Approved"), so screen readers know whose role changes. While
// the change is being sent, the button is disabled (AC11).
export function AccountRow({ account, onStart, onOutcome }: AccountRowProps) {
  const changeRole = useChangeRole();
  const isAdmin = account.role === 'ADMIN';
  const nextRole: Role = isAdmin ? 'CONTRIBUTOR' : 'ADMIN';
  const action = isAdmin ? 'Remove admin' : 'Make admin';

  function send() {
    onStart();
    // `mutateAsync` settles even when the page has been replaced by the gate by then (AC7).
    changeRole.mutateAsync({ id: account.id, role: nextRole }).then(
      (updated) => onOutcome({ kind: 'done', account: updated }),
      (error: unknown) => onOutcome({ kind: 'failed', error }),
    );
  }

  return (
    <li className="space-y-3 rounded border border-slate-200 px-4 py-3">
      <div className="min-w-0 space-y-1">
        <p className="text-base font-semibold break-words text-slate-900">{account.name}</p>
        <p className="text-base break-words text-slate-700">{account.email}</p>
        <p className="text-base text-slate-700">
          <span className="sr-only">Role: </span>
          {ROLE_WORDS[account.role]}
        </p>
      </div>
      <button
        type="button"
        onClick={send}
        disabled={changeRole.isPending}
        aria-label={`${action} ${account.name}`}
        className={isAdmin ? SECONDARY : PRIMARY}
      >
        {action}
      </button>
    </li>
  );
}
