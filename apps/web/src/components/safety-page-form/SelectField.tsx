import type { UseFormRegisterReturn } from 'react-hook-form';

type SelectFieldProps = {
  /** Unique on the page; also names the message element (`<id>-error`). */
  id: string;
  label: string;
  /** The disabled first option shown while nothing is chosen, for example "Choose a category". */
  prompt: string;
  /** The choices in list order; `value` is the stable code or id. */
  options: readonly { value: string; label: string }[];
  /** `register('<field>')` of react-hook-form. */
  registration: UseFormRegisterReturn;
  error?: string;
};

// A labelled choice from a fixed list (AC2): only the given options, no free text. The prompt
// option is disabled, so it can't be chosen back once a value is picked.
export function SelectField({ id, label, prompt, options, registration, error }: SelectFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-base font-medium text-slate-900">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="block min-h-11 w-full max-w-full rounded border border-slate-400 bg-white px-3 py-2 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 aria-invalid:border-red-700"
        {...registration}
      >
        <option value="" disabled>
          {prompt}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-base break-words text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
