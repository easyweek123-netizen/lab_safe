import { Link, Outlet } from 'react-router';

// The frame of every page (E01 design §8): a header with the wordmark and one main area
// with a maximum width. Mobile-first: nothing is wider than the viewport, text is at least 16 px.
export function AppShell() {
  return (
    <div className="min-h-screen bg-white text-base text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-3">
          <Link
            to="/"
            className="rounded text-xl font-bold tracking-tight text-slate-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            LabSafe
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
