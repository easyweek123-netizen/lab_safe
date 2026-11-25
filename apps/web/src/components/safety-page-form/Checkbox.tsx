import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> & {
  id: string;
  /** The choice's name; may hold a decorative image next to the words (GHS pictograms). */
  label: ReactNode;
  /** The client or server message for this choice, shown under it and read as its description. */
  error?: string;
  /** Lets `register('<field>')` of react-hook-form be spread onto the checkbox. */
  ref?: Ref<HTMLInputElement>;
};

// One labelled checkbox of the safety page form. The whole row is the label, at least 44 px
// high, so it is easy to tap; the box has a visible focus ring.
export function Checkbox({ id, label, error, ref, ...input }: CheckboxProps) {
  const errorId = `${id}-error`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="size-5 shrink-0 accent-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          {...input}
        />
        <span className="flex min-w-0 items-center gap-3 text-base break-words text-slate-900">
          {label}
        </span>
      </label>
      {error && (
        <p id={errorId} className="text-base break-words text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
