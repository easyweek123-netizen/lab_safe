import { Link } from 'react-router';

// Shown for every unknown address, inside the app shell (E01 design §8). Static: no data.
export function NotFoundPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="text-base text-slate-700">The page you are looking for does not exist.</p>
      <p>
        <Link
          to="/"
          className="inline-block rounded py-2 text-base font-medium text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          Go to the home page
        </Link>
      </p>
    </section>
  );
}
