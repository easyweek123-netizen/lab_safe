import { ApiError } from '../../api/client';

// The texts of a failed decision on the preview (S04.2 AC8, AC9, AC14; S04.3 AC2, AC3).

/** A page that is no longer pending: a loaded preview, and the server's 409 `ALREADY_REVIEWED`. */
export const ALREADY_REVIEWED_MESSAGE = 'This page has already been reviewed.';

/** The decision failed with a network error, also while offline. */
export const DECISION_UNREACHABLE_MESSAGE =
  "Couldn't reach LabSafe. Check your connection and try again.";

/** A 401 while the preview is open. */
export const DECISION_SESSION_ENDED_MESSAGE =
  'Your session has ended. Log in again in another tab, then try again here.';

/** A 403 while the preview is open. */
export const DECISION_FORBIDDEN_MESSAGE = 'Only admins can review pages.';

/** A 500, an answer outside the contract or anything else. */
export const DECISION_FAILED_MESSAGE = 'Something went wrong on our side. Try again.';

/** What the admin can do next after a failed decision. */
export type DecisionFailureAction = 'back-to-queue' | 'reload' | null;

/** The `alert` text of a failed decision and the action that comes with it. */
export function decisionFailure(error: unknown): {
  message: string;
  action: DecisionFailureAction;
} {
  if (!(error instanceof ApiError)) {
    return { message: DECISION_FAILED_MESSAGE, action: null };
  }
  if (error.status === 409 && error.code === 'ALREADY_REVIEWED') {
    return { message: error.message, action: 'back-to-queue' };
  }
  if (error.status === 409 && error.code === 'SUBMISSION_CHANGED') {
    return { message: error.message, action: 'reload' };
  }
  switch (error.status) {
    case 0:
      return { message: DECISION_UNREACHABLE_MESSAGE, action: null };
    case 401:
      return { message: DECISION_SESSION_ENDED_MESSAGE, action: null };
    case 403:
      return { message: DECISION_FORBIDDEN_MESSAGE, action: null };
    default:
      return { message: DECISION_FAILED_MESSAGE, action: null };
  }
}

/**
 * The server's message for the note of a refused reject (400 `VALIDATION_FAILED` with
 * `fields: note`, S04.3 AC2), shown next to the field; undefined for every other failure.
 */
export function noteFieldError(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return undefined;
  }
  return error.fields?.find((field) => field.path === 'note')?.message;
}
