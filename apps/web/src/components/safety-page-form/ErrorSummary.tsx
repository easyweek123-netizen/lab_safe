import type { MouseEvent, Ref } from 'react';
import type { SummaryItem } from './field-labels';

type ErrorSummaryProps = {
  /** Every problem of the last submit, client or server, in the order of the form. */
  items: readonly SummaryItem[];
  /** The form moves focus here after a failed submit. */
  ref?: Ref<HTMLDivElement>;
};

const HEADING_ID = 'page-error-summary-heading';

/** Moves focus to the input itself; the browser scrolls it into view. */
function focusInput(event: MouseEvent<HTMLAnchorElement>, target: string) {
  const input = document.getElementById(target);
  if (input) {
    event.preventDefault();
    input.focus();
  }
}

// The one `alert` at the top of the safety page form after a failed submit (S03.1 AC9): the
// heading, then a link per problem to its input with the problem's message next to it.
export function ErrorSummary({ items, ref }: ErrorSummaryProps) {
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      aria-labelledby={HEADING_ID}
      className="space-y-3 rounded border-2 border-red-700 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      <h2 id={HEADING_ID} className="text-xl font-semibold text-slate-900">
        Your page can't be submitted yet. Fix these fields:
      </h2>
      <ul className="list-disc space-y-2 pl-5">
        {items.map((item) => (
          <li key={item.path} className="text-base break-words text-red-800">
            {item.label ? (
              <>
                <a
                  href={`#${item.target}`}
                  onClick={(event) => focusInput(event, item.target)}
                  className="font-medium text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  {item.label}
                </a>
                {`${item.label.endsWith('?') ? ' ' : ': '}${item.message}`}
              </>
            ) : (
              <a
                href={`#${item.target}`}
                onClick={(event) => focusInput(event, item.target)}
                className="font-medium text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                {item.message}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
