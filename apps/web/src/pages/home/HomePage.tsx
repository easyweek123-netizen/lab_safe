import { useMetaLists } from '../../api/meta';

// The home page (E01 design §8): the LabSafe name, a one-line purpose, and the lab rooms and
// hazard types from `GET /api/meta/lists`. There is no empty state: the lists are never empty.
// E06 replaces this page with search.
export function HomePage() {
  const { data, isPending, isError, isFetching, refetch } = useMetaLists();

  // While a Retry runs, show the loading state again instead of the old error, so the visitor
  // (and a screen reader) can tell that Retry is working, and a failed Retry mounts a new alert.
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
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">LabSafe</h1>
        <p className="text-base text-slate-700">
          Safety information for every instrument in our chemistry lab.
        </p>
      </section>

      <section className="space-y-3">
        <h2 id="lab-rooms-heading" className="text-xl font-semibold text-slate-900">
          Lab rooms
        </h2>
        <ul aria-labelledby="lab-rooms-heading" className="grid gap-2 sm:grid-cols-2">
          {data.labRooms.map((room) => (
            <li
              key={room.id}
              className="rounded border border-slate-200 px-3 py-2 text-base break-words"
            >
              {`${room.code} · ${room.name}`}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 id="hazard-types-heading" className="text-xl font-semibold text-slate-900">
          Hazard types
        </h2>
        <ul aria-labelledby="hazard-types-heading" className="grid gap-2 sm:grid-cols-2">
          {data.hazardTypes.map((hazard) => (
            <li
              key={hazard.value}
              className="rounded border border-slate-200 px-3 py-2 text-base break-words"
            >
              {hazard.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
