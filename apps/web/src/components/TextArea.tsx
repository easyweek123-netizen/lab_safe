import type { UseFormRegisterReturn } from 'react-hook-form';

type TextAreaProps = {
  /** Unique on the page; also names the hint (`<id>-hint`) and the message (`<id>-error`). */
  id: string;
  label: string;
  /** A prompt under the label, read with it as the input's description. */
  hint?: string;
  rows?: number;
  /** `register('<field>')` of react-hook-form. */
  registration: UseFormRegisterReturn;
  /** The client or server message for this field, shown under the input. */
  error?: string;
};

// The multi-line sibling of `TextField`: a labelled text area with an optional hint and its
// message, both the input's accessible description.
export function TextArea({ id, label, hint, rows = 4, registration, error }: TextAreaProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-base font-medium text-slate-900">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-base text-slate-700">
          {hint}
        </p>
      )}
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="block w-full rounded border border-slate-400 px-3 py-2 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 aria-invalid:border-red-700"
        {...registration}
      />
      {error && (
        <p id={errorId} className="text-base break-words text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
