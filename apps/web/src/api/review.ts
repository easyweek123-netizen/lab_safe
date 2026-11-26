import {
  ReviewDecision,
  ReviewQueue,
  ReviewSubmission,
  type RejectSubmissionRequest,
} from '@labsafe/shared';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend } from './client';

/** The query key of `useReviewQueue`; S04.2's approve and S04.3's reject invalidate it. */
export const REVIEW_QUEUE_KEY = ['review-queue'] as const;

/**
 * Every pending page, oldest submission first (`GET /api/admin/review-queue`, S04.1). Admins
 * only. A failed background refresh keeps the cached list (E03-D7); the page decides that.
 */
export function useReviewQueue() {
  return useQuery({
    queryKey: REVIEW_QUEUE_KEY,
    queryFn: () => apiGet('/admin/review-queue', ReviewQueue),
  });
}

/** The query key of `useReviewSubmission(id)`; S04.2 and S04.3 invalidate it. */
export function reviewSubmissionKey(id: string) {
  return ['admin-submissions', id] as const;
}

/**
 * One revision of any status as the admin previews it (`GET /api/admin/submissions/:id`, S04.1).
 * Admins only. A failed background refresh keeps the cached data (E03-D7); the page decides that.
 * Not sent while `enabled` is false (a malformed id).
 */
export function useReviewSubmission(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: reviewSubmissionKey(id),
    queryFn: () => apiGet(`/admin/submissions/${encodeURIComponent(id)}`, ReviewSubmission),
    enabled,
  });
}

/**
 * `POST /api/admin/submissions/:id/approve` with the `version` of the loaded preview → 200
 * `ReviewDecision` (S04.2). As `useUpdateSubmission`: sent at once even offline, no `me` refresh
 * on 401 or 403, so the preview stays. Success reloads the queue first (also while it is not on
 * screen), so the approved row is gone when the admin lands on it, and marks the preview stale
 * without refetching it now: it is about to leave the screen, and a refetch would flash the
 * "already reviewed" state before the navigation.
 */
export function useApproveSubmission(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (version: number) =>
      apiSend('POST', `/admin/submissions/${encodeURIComponent(id)}/approve`, ReviewDecision, {
        version,
      }),
    onSuccess: () => invalidateAfterDecision(queryClient, id),
  });
}

/**
 * `POST /api/admin/submissions/:id/reject` with the admin's note, already checked and trimmed by
 * `RejectSubmissionRequest` → 200 `ReviewDecision { status: "REJECTED" }` (S04.3). Sent, retried
 * and invalidated exactly as `useApproveSubmission`.
 */
export function useRejectSubmission(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (request: RejectSubmissionRequest) =>
      apiSend(
        'POST',
        `/admin/submissions/${encodeURIComponent(id)}/reject`,
        ReviewDecision,
        request,
      ),
    onSuccess: () => invalidateAfterDecision(queryClient, id),
  });
}

/**
 * After a decision: reload the queue at once (also off screen), so the decided row is gone when
 * the admin lands on it; mark the preview stale without refetching it while it is still shown.
 */
function invalidateAfterDecision(queryClient: QueryClient, id: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: REVIEW_QUEUE_KEY, refetchType: 'all' }),
    queryClient.invalidateQueries({ queryKey: reviewSubmissionKey(id), refetchType: 'none' }),
  ]);
}
