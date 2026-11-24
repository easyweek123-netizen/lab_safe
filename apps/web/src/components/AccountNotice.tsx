/** The notices the account gate shows instead of a protected page (S02.1 AC8, S02.2 AC10). */
export type AccountNoticeKind = 'waiting' | 'not-approved' | 'no-access';

const NOTICES: Record<AccountNoticeKind, { title: string; message: string }> = {
  waiting: {
    title: 'Waiting for approval',
    message: 'Your account is waiting for approval.',
  },
  'not-approved': {
    title: 'Sign-up not approved',
    message: 'Your sign-up was not approved.',
  },
  'no-access': {
    title: 'No access',
    message: "You don't have access to this page.",
  },
};

type AccountNoticeProps = {
  kind: AccountNoticeKind;
};

// Shown by `RequireAccount` at the requested address (decision E02-D7), so it is the page's
// only h1.
export function AccountNotice({ kind }: AccountNoticeProps) {
  const notice = NOTICES[kind];
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight break-words text-slate-900">
        {notice.title}
      </h1>
      <p className="text-base text-slate-700">{notice.message}</p>
    </section>
  );
}
