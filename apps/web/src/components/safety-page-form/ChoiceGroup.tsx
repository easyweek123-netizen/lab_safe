import type { ReactNode } from 'react';

type ChoiceGroupProps = {
  /** Names the group's message element (`<id>-error`). */
  id: string;
  /** The group's name, as its legend. */
  legend: string;
  /** A prompt under the legend, read as part of the group's description. */
  hint?: string;
  /** The message for the whole group, for example "Choose at least one hazard, …". */
  error?: string;
  /** Lays short choices out in two columns from the `sm` width; one column at 375 px. */
  columns?: boolean;
  children: ReactNode;
};

// A named set of checkboxes inside a form group (hazard types, GHS pictograms, PPE items,
// S03.1 AC2). The choices stack; short ones may use two columns on wider screens.
export function ChoiceGroup({ id, legend, hint, error, columns, children }: ChoiceGroupProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  return (
    <fieldset
      aria-describedby={describedBy || undefined}
      aria-invalid={error ? true : undefined}
      className="min-w-0 space-y-2"
    >
      <legend className="text-base font-medium text-slate-900">{legend}</legend>
      {hint && (
        <p id={hintId} className="text-base text-slate-700">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-base break-words text-red-800">
          {error}
        </p>
      )}
      <div className={columns ? 'grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2' : 'space-y-1'}>
        {children}
      </div>
    </fieldset>
  );
}
