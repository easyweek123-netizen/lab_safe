type NameListProps = {
  label: string;
  names: readonly { key: string; name: string }[];
  /** Shown instead of the list when the page chose "none". */
  none: string | null;
};

// A labelled list of names that wraps, for the compact at-a-glance block (S04.1 AC5).
export function NameList({ label, names, none }: NameListProps) {
  return (
    <div className="space-y-1">
      <p aria-hidden="true" className="text-base font-semibold text-slate-900">
        {`${label}:`}
      </p>
      {none !== null ? (
        <p className="text-base text-slate-800">{none}</p>
      ) : (
        <ul aria-label={label} className="flex flex-wrap gap-2">
          {names.map((item) => (
            <li
              key={item.key}
              className="rounded border border-slate-300 px-2 py-0.5 text-base break-words text-slate-800"
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
