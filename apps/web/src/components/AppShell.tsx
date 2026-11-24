import { Link, Outlet } from 'react-router';
import { AccountMenu } from './AccountMenu';

// The frame of every page (E01 design §8): a header with the wordmark and one main area
// with a maximum width; the header also holds the account menu (S02.1). Mobile-first: nothing
// is wider than the viewport, text is at least 16 px, and the header wraps at 375 px.
export function AppShell() {
  return (
    <div className="min-h-screen bg-white text-base text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <Link
            to="/"
            className="rounded text-xl font-bold tracking-tight text-slate-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            LabSafe
          </Link>
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
