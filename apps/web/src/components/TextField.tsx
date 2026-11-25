import type { UseFormRegisterReturn } from 'react-hook-form';

type TextFieldProps = {
  /** Unique on the page; also names the message element (`<id>-error`). */
  id: string;
  label: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
  /** A prompt under the label, read with it as the input's description (`<id>-hint`). */
  hint?: string;
  /** Marks the input as required for assistive technology; the shared schema still decides. */
  required?: boolean;
  /** Turns the input off, for example an emergency item marked "Not applicable". */
  disabled?: boolean;
  /** `register('<field>')` of react-hook-form. */
  registration: UseFormRegisterReturn;
  /** The client or server message for this field, shown under the input. */
  error?: string;
};

// A labelled input of a form with its message next to it (apps/web/CLAUDE.md "Forms"). The
// message is the input's accessible description, so a screen reader reads it with the label.
export function TextField({
  id,
  label,
  type,
  autoComplete,
  hint,
  required,
  disabled,
  registration,
  error,
}: TextFieldProps) {
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
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-required={required ? true : undefined}
        disabled={disabled}
        aria-describedby={describedBy || undefined}
        className="block min-h-11 w-full rounded border border-slate-400 px-3 py-2 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 aria-invalid:border-red-700 disabled:bg-slate-100 disabled:text-slate-500"
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
