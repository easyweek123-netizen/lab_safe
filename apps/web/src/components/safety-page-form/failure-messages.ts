import { ApiError } from '../../api/client';

// The texts of S03.1 AC17 for the photo field and for submitting the page (FE-04);
// they say "try again", so they fit saving and resubmitting too (S04.4 AC4).

/** A 401 while the form is open: the session ended; the form stays (decision E03-D7). */
export const SESSION_ENDED_MESSAGE =
  'Your session has ended. Log in again in another tab, then try again here.';

/** A 403 while the form is open. */
export const CANNOT_SUBMIT_MESSAGE = "Your account can't submit pages.";

/** A photo larger than `PHOTO_MAX_BYTES` (also the server's 413 message). */
export const PHOTO_TOO_LARGE_MESSAGE = 'The photo must be at most 5 MB.';

/** A photo upload that failed with a network error, a 500 or an answer outside the contract. */
export const PHOTO_UPLOAD_FAILED_MESSAGE =
  "Couldn't upload the photo. Check your connection and try again.";

/** The message next to the photo field for a failed upload (AC5, AC6, AC17). */
export function photoUploadMessage(error: Error): string {
  if (!(error instanceof ApiError)) {
    return PHOTO_UPLOAD_FAILED_MESSAGE;
  }
  switch (error.status) {
    case 401:
      return SESSION_ENDED_MESSAGE;
    case 403:
      return CANNOT_SUBMIT_MESSAGE;
    case 413:
    case 415:
      // The server's own message ("The photo must be at most 5 MB.", "Only JPEG or PNG …").
      return error.code ? error.message : PHOTO_UPLOAD_FAILED_MESSAGE;
    case 400:
      return error.fields?.[0]?.message ?? PHOTO_UPLOAD_FAILED_MESSAGE;
    default:
      return PHOTO_UPLOAD_FAILED_MESSAGE;
  }
}

/** Submitting failed with a network error, also while offline (AC17). */
export const SUBMIT_UNREACHABLE_MESSAGE =
  "Couldn't reach LabSafe. Your page is still here; check your connection and try again.";

/** Submitting failed with a 500 or an answer outside the contract (AC17). */
export const SUBMIT_FAILED_MESSAGE =
  'Something went wrong on our side. Your page is still here; try again.';

/** The `alert` above the submit button for a failed submit that names no field (AC17; a 409, S04.2 AC10). */
export function submitFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return SUBMIT_FAILED_MESSAGE;
  }
  switch (error.status) {
    case 0:
      return SUBMIT_UNREACHABLE_MESSAGE;
    case 401:
      return SESSION_ENDED_MESSAGE;
    case 403:
      return CANNOT_SUBMIT_MESSAGE;
    case 409:
      // The server's own message, e.g. "This page has already been reviewed." (S04.2 AC10).
      return error.code ? error.message : SUBMIT_FAILED_MESSAGE;
    default:
      return SUBMIT_FAILED_MESSAGE;
  }
}
