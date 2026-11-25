import { zodResolver } from '@hookform/resolvers/zod';
import { SafetyPageContent } from '@labsafe/shared';
import { useCallback, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useIsUploadingPhoto } from '../../api/photos';
import { ApiError } from '../../api/client';
import { EmergencySection } from './EmergencySection';
import { ErrorSummary } from './ErrorSummary';
import { submitFailureMessage } from './failure-messages';
import { isFieldPath, summaryItems } from './field-labels';
import { emptyFormValues, toContent, type SafetyPageFormValues } from './form-values';
import { GuidelinesSection } from './GuidelinesSection';
import { HazardsSection } from './HazardsSection';
import { IdentitySection } from './IdentitySection';
import { RiskSection } from './RiskSection';

/**
 * The form's values mapped to the content and checked with the shared `SafetyPageContent`, so
 * the browser applies exactly the server's rules (apps/web/CLAUDE.md "Forms"). The cast only
 * satisfies the pipe's input type: `toContent` leaves out an unchosen field on purpose, and the
 * schema then names it.
 */
const FormSchema = z
  .custom<SafetyPageFormValues>()
  .transform((values) => toContent(values) as z.input<typeof SafetyPageContent>)
  .pipe(SafetyPageContent);

type SafetyPageFormProps = {
  /** The values to start with: the empty form, or a stored page for the edit page (S03.2). */
  defaultValues?: SafetyPageFormValues;
  /** The submit button's label, for example "Submit for review". */
  submitLabel: string;
  /** The submit button's label while `onSubmit` runs, for example "Submitting…". */
  submittingLabel: string;
  /** Sends the checked page. Rejects with the `ApiError` of a failed request. */
  onSubmit: (content: SafetyPageContent) => Promise<void>;
};

/** The server's `fields` that name a field of this form, or none. */
function serverFields(error: unknown) {
  if (!(error instanceof ApiError)) {
    return [];
  }
  return (error.fields ?? []).filter((field) => isFieldPath(field.path));
}

// The safety page form (S03.1 AC1, AC8–AC12, AC17), shared by the new page and the edit page
// (S03.2): the five groups in PRD order, one error summary for every client and server problem,
// and an `alert` for a failed submit. A failure never resets the form, so everything typed and
// the photo stay (decision E03-D7).
export function SafetyPageForm({
  defaultValues = emptyFormValues,
  submitLabel,
  submittingLabel,
  onSubmit,
}: SafetyPageFormProps) {
  const form = useForm<SafetyPageFormValues, unknown, SafetyPageContent>({
    resolver: zodResolver(FormSchema),
    defaultValues,
    // Focus goes to the error summary instead of the first input.
    shouldFocusError: false,
  });
  const {
    control,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const hazards = useWatch({ control, name: 'hazards' });
  const protectiveEquipment = useWatch({ control, name: 'protectiveEquipment' });
  const uploading = useIsUploadingPhoto();
  const [failure, setFailure] = useState<string | null>(null);

  // The summary may not be on screen yet when a submit fails; it takes focus when it appears.
  const summary = useRef<HTMLDivElement | null>(null);
  const focusWhenShown = useRef(false);
  const summaryRef = useCallback((node: HTMLDivElement | null) => {
    summary.current = node;
    if (node && focusWhenShown.current) {
      focusWhenShown.current = false;
      node.focus();
    }
  }, []);
  const focusSummary = () => {
    if (summary.current) {
      summary.current.focus();
    } else {
      focusWhenShown.current = true;
    }
  };

  const onValid = async (content: SafetyPageContent) => {
    setFailure(null);
    try {
      await onSubmit(content);
    } catch (error) {
      const fields = serverFields(error);
      if (fields.length === 0) {
        setFailure(submitFailureMessage(error));
        return;
      }
      for (const field of fields) {
        if (isFieldPath(field.path)) {
          setError(field.path, { type: 'server', message: field.message });
        }
      }
      focusSummary();
    }
  };
  const onInvalid = () => {
    setFailure(null);
    focusSummary();
  };

  const items = summaryItems(errors, { hazards, protectiveEquipment });

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(onValid, onInvalid)(event)}
        className="space-y-8"
      >
        {items.length > 0 && <ErrorSummary ref={summaryRef} items={items} />}
        <IdentitySection />
        <RiskSection />
        <HazardsSection />
        <GuidelinesSection />
        <EmergencySection />
        <div className="space-y-4 border-t border-slate-300 pt-4">
          {failure && (
            <p
              role="alert"
              className="rounded border border-red-700 px-3 py-2 text-base text-red-800"
            >
              {failure}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className="min-h-11 w-full rounded bg-blue-700 px-5 py-2 text-base font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
