import type { UseFormRegisterReturn } from 'react-hook-form';

type RadioGroupProps = {
  /** The first radio's id (the error summary links to it); the others add `-<value>`. */
  id: string;
  label: string;
  /** The choices in order; `description` is shown under the choice and read as its description. */
  options: readonly { value: string; label: string; description?: string }[];
  /** `register('<field>')` of react-hook-form, shared by every radio. */
  registration: UseFormRegisterReturn;
  required?: boolean;
  error?: string;
};

// A labelled set of radio buttons; each choice is named in words, never by colour alone. The
// message is the group's description, as in `TextField`.
export function RadioGroup({ id, label, options, registration, required, error }: RadioGroupProps) {
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
      aria-required={required ? true : undefined}
      aria-invalid={error ? true : undefined}
      className="space-y-2"
    >
      <p id={labelId} className="text-base font-medium text-slate-900">
        {label}
      </p>
      {options.map((option, index) => {
        const radioId = index === 0 ? id : `${id}-${option.value}`;
        const descriptionId = `${radioId}-description`;
        return (
          <div key={option.value} className="flex items-start gap-3">
            <input
              id={radioId}
              type="radio"
              value={option.value}
              aria-describedby={option.description ? descriptionId : undefined}
              className="mt-1 size-5 shrink-0 accent-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              {...registration}
            />
            <div className="min-w-0">
              <label
                htmlFor={radioId}
                className="inline-flex min-h-7 items-center text-base font-medium text-slate-900"
              >
                {option.label}
              </label>
              {option.description && (
                <p id={descriptionId} className="text-base break-words text-slate-700">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {error && (
        <p id={errorId} className="text-base break-words text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
