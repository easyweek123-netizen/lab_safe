import { useState } from 'react';
import { useApprovedAccounts } from '../../api/admin-users';
import { ApiError } from '../../api/client';
import { AccountRow, type RoleOutcome } from './AccountRow';

/** The page's message after a role change: a `status` on success, an `alert` on failure. */
type Message = { role: 'status' | 'alert'; text: string };

function messageFor(outcome: RoleOutcome): Message {
  if (outcome.kind === 'done') {
    const { name, role } = outcome.account;
    const text = role === 'ADMIN' ? `${name} is now an admin.` : `${name} is now a contributor.`;
    return { role: 'status', text };
  }
  if (outcome.error instanceof ApiError && outcome.error.code === 'LAST_ADMIN') {
    return { role: 'alert', text: 'There must be at least one admin.' };
  }
  // 500, a network error, or a 401/403 (then the account gate takes over the page).
  return { role: 'alert', text: "Couldn't save, try again." };
}

// `/admin/accounts` (S02.3 "UI states"), behind `RequireAccount level="admin"`: the approved
// accounts by name then email, each with its role in words and "Make admin" or "Remove admin".
// Loading, error with Retry, and the message of the last change. There is no empty state: there
// is always at least one admin.
export function AccountsPage() {
  const { data, isPending, isError, isFetching, refetch } = useApprovedAccounts();
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
    return (
      <ul aria-label="Approved accounts" className="space-y-3">
        {data.users.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            onStart={() => setMessage(null)}
            onOutcome={(outcome) => setMessage(messageFor(outcome))}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Accounts</h1>
      {message && (
        <p role={message.role} className="text-base break-words text-slate-900">
          {message.text}
        </p>
      )}
      {renderList()}
    </div>
  );
}
