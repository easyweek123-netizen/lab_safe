import { Checkbox } from './Checkbox';

type CheckboxWithNoteProps = {
  /** The checkbox's id. */
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** The note input's id (from the issue path, for example `page-hazards-2-note`). */
  noteId: string;
  /** The note input's label, for example "How does the Electrical hazard arise?". */
  noteLabel: string;
  note: string;
  onNoteChange: (note: string) => void;
  /** A required note (hazards) or an optional one (PPE items). */
  noteRequired: boolean;
  /** The message for the note, shown under it. */
  noteError?: string;
};

// A choice of a fixed list that, when ticked, shows a note input under it (S03.1 AC3): the
// required "how does this hazard arise" of a hazard type, the optional note of a PPE item.
export function CheckboxWithNote({
  id,
  label,
  checked,
  onCheckedChange,
  noteId,
  noteLabel,
  note,
  onNoteChange,
  noteRequired,
  noteError,
}: CheckboxWithNoteProps) {
  const errorId = `${noteId}-error`;
  return (
    <div className="min-w-0">
      <Checkbox
        id={id}
        label={label}
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      {checked && (
        <div className="space-y-1 pb-2 pl-8">
          <label htmlFor={noteId} className="block text-base font-medium text-slate-900">
            {noteLabel}
          </label>
          <input
            id={noteId}
            type="text"
            autoComplete="off"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            aria-required={noteRequired ? true : undefined}
            aria-invalid={noteError ? true : undefined}
            aria-describedby={noteError ? errorId : undefined}
            className="block min-h-11 w-full rounded border border-slate-400 px-3 py-2 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 aria-invalid:border-red-700"
          />
          {noteError && (
            <p id={errorId} className="text-base break-words text-red-800">
              {noteError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
