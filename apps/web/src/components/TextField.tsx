import type { UseFormRegisterReturn } from 'react-hook-form';

type TextFieldProps = {
  /** Unique on the page; also names the message element (`<id>-error`). */
  id: string;
  label: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
  /** `register('<field>')` of react-hook-form. */
  registration: UseFormRegisterReturn;
  /** The client or server message for this field, shown under the input. */
  error?: string;
};

// A labelled input of a form with its message next to it (apps/web/CLAUDE.md "Forms"). The
// message is the input's accessible description, so a screen reader reads it with the label.
export function TextField({ id, label, type, autoComplete, registration, error }: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-base font-medium text-slate-900">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="block min-h-11 w-full rounded border border-slate-400 px-3 py-2 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 aria-invalid:border-red-700"
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
