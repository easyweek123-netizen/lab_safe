import { MySubmissions, Submission, type SafetyPageContent } from '@labsafe/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from './client';

/** The query key of `useMySubmissions`; a submit invalidates it. */
export const MY_SUBMISSIONS_KEY = ['submissions', 'mine'] as const;

/** The caller's own submissions, newest first (`GET /api/submissions/mine`). */
export function useMySubmissions() {
  return useQuery({
    queryKey: MY_SUBMISSIONS_KEY,
    queryFn: () => apiGet('/submissions/mine', MySubmissions),
  });
}

/**
 * `POST /api/submissions` with the page → 201 `Submission`; success reloads My submissions and
 * settles once that has answered. Sent at once even offline (`networkMode: 'always'`, E03-D7). A
 * 401 or 403 does not ask `me` again, so the typed page stays on screen (AC17).
 */
export function useSubmitPage() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (content: SafetyPageContent) =>
      apiSend('POST', '/submissions', Submission, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_SUBMISSIONS_KEY }),
  });
}

/** The query key of `useSubmission(id)`; a save invalidates it. */
export function submissionKey(id: string) {
  return ['submissions', id] as const;
}

/**
 * One submission (`GET /api/submissions/:id`, S03.2). The server answers 404 to everyone but the
 * author and admins (E03-D4). A failed background refresh keeps the cached data (E03-D7). Not
 * sent while `enabled` is false (a malformed id).
 */
export function useSubmission(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: submissionKey(id),
    queryFn: () => apiGet(`/submissions/${encodeURIComponent(id)}`, Submission),
    enabled,
  });
}

/**
 * `PUT /api/submissions/:id` with the corrected page → 200 `Submission`, as `useSubmitPage`: sent
 * at once even offline, no `me` refresh on 401 or 403 (S03.1 AC17). Success reloads My
 * submissions and this submission and settles once both have answered.
 */
export function useUpdateSubmission(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (content: SafetyPageContent) =>
      apiSend('PUT', `/submissions/${encodeURIComponent(id)}`, Submission, content),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_SUBMISSIONS_KEY }),
        queryClient.invalidateQueries({ queryKey: submissionKey(id) }),
      ]),
  });
}
