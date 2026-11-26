import { PHOTO_MAX_BYTES } from '@labsafe/shared';
import { useRef, useState, type ChangeEvent } from 'react';
import { photoUrl, useUploadPhoto } from '../../api/photos';
import { photoUploadMessage, PHOTO_TOO_LARGE_MESSAGE } from './failure-messages';

type PhotoFieldProps = {
  /**
   * The field's id (`fieldId('photoId')`), which the error summary targets: the file input's while
   * no photo is shown, "Change photo"'s while one is (the input is then `<id>-file`). It also names
   * the hint (`<id>-hint`) and the message (`<id>-error`).
   */
  id: string;
  /** The uploaded photo's id held by the form, or none yet. */
  value: string | null | undefined;
  /** Called with the stored photo's id after a successful upload. */
  onChange: (photoId: string) => void;
  /** The form's own message for `photoId` (client check or server `fields`). */
  error?: string;
  /** Called whenever a new file is chosen, before it is checked or uploaded (S04.4 AC3). */
  onFileChosen?: () => void;
};

const HINT = 'JPEG or PNG, at most 5 MB';

// The photo of a safety page (S03.1 "UI states", decision E03-D1): a chosen file is checked
// against 5 MB and uploaded at once; the form keeps only the stored photo's id. A failed upload
// keeps the photo the form already had (AC17). The hint and the message describe the control a
// keyboard user reaches: the file input, or "Change photo" while a photo is shown, which then
// also carries the field's id (S04.4 AC1, AC2). The message sits in a polite live region, so it
// is announced when it appears without a second `alert` next to the form's.
export function PhotoField({ id, value, onChange, error, onFileChosen }: PhotoFieldProps) {
  const upload = useUploadPhoto();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tooLarge, setTooLarge] = useState(false);

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared, so choosing the same file again is a new choice.
    event.target.value = '';
    if (!file) {
      return;
    }
    onFileChosen?.();
    upload.reset();
    if (file.size > PHOTO_MAX_BYTES) {
      setTooLarge(true);
      return;
    }
    setTooLarge(false);
    upload.mutate(file, { onSuccess: (photo) => onChange(photo.id) });
  };

  const message = tooLarge
    ? PHOTO_TOO_LARGE_MESSAGE
    : upload.error
      ? photoUploadMessage(upload.error)
      : error;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const hasPhoto = Boolean(value);
  const inputId = hasPhoto ? `${id}-file` : id;
  const describedBy = message ? `${hintId} ${errorId}` : hintId;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-base font-medium text-slate-900">
        Photo
      </label>
      <p id={hintId} className="text-base text-slate-700">
        {HINT}
      </p>
      {value && (
        <img
          src={photoUrl(value)}
          alt="Photo of the instrument"
          className="block h-auto max-h-80 w-full max-w-sm rounded border border-slate-300 object-contain"
        />
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg, image/png"
        disabled={upload.isPending}
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy}
        onChange={onInputChange}
        // With a photo, the input is hidden and "Change photo" opens its picker.
        hidden={hasPhoto}
        className={
          'block w-full max-w-full text-base text-slate-900 file:mr-3 file:min-h-11 file:rounded file:border file:border-slate-400 file:bg-white file:px-4 file:py-2 file:text-base file:font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'
        }
      />
      {hasPhoto && (
        <button
          id={id}
          type="button"
          aria-describedby={describedBy}
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded border border-slate-400 bg-white px-4 py-2 text-base font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60"
        >
          Change photo
        </button>
      )}
      {upload.isPending && (
        <p role="status" className="text-base text-slate-700">
          Uploading photo…
        </p>
      )}
      <div aria-live="polite">
        {message && (
          <p id={errorId} className="text-base break-words text-red-800">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
