import { AdminUser, AdminUserList, type Role, type SessionResponse } from '@labsafe/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ME_KEY } from './auth';
import { ApiError, apiGet, apiSend } from './client';

const PENDING_KEY = ['admin', 'users', 'PENDING'] as const;
const APPROVED_KEY = ['admin', 'users', 'APPROVED'] as const;

/** The pending sign-ups, oldest first (`GET /api/admin/users?status=PENDING`). Admins only. */
export function usePendingSignUps() {
  return useQuery({
    queryKey: PENDING_KEY,
    queryFn: () => apiGet('/admin/users?status=PENDING', AdminUserList),
  });
}

/** What an admin decides about a sign-up. */
export type SignUpDecision = 'approve' | 'reject';

/**
 * `POST /api/admin/users/:id/approve` or `…/reject` → 200 `AdminUser`. Success and 409
 * `USER_NOT_PENDING` reload the pending list; 401 or 403 ask `me` again, so the account gate
 * re-decides (E02 design "Screens"). The mutation settles only after that reload has answered,
 * so the row stays disabled until it disappears.
 */
export function useDecideSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: SignUpDecision }) =>
      apiSend('POST', `/admin/users/${encodeURIComponent(id)}/${decision}`, AdminUser),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PENDING_KEY }),
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        return undefined;
      }
      if (error.status === 409) {
        return queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      }
      if (error.status === 401 || error.status === 403) {
        return queryClient.invalidateQueries({ queryKey: ME_KEY });
      }
      return undefined;
    },
  });
}

/** The approved accounts, by name then email (`GET /api/admin/users?status=APPROVED`). Admins only. */
export function useApprovedAccounts() {
  return useQuery({
    queryKey: APPROVED_KEY,
    queryFn: () => apiGet('/admin/users?status=APPROVED', AdminUserList),
  });
}

/**
 * `PUT /api/admin/users/:id/role` → 200 `AdminUser` (S02.3). Success and 409 reload the approved
 * list; a change of the signed-in admin's own role (AC7), 401 or 403 (AC11) also ask `me` again,
 * so the header and the account gate re-decide. The mutation settles only after those reloads,
 * so the row stays disabled until it shows the new role.
 */
export function useChangeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiSend('PUT', `/admin/users/${encodeURIComponent(id)}/role`, AdminUser, { role }),
    onSuccess: (account) => {
      const me = queryClient.getQueryData<SessionResponse>(ME_KEY);
      const reloads = [queryClient.invalidateQueries({ queryKey: APPROVED_KEY })];
      if (me?.user?.id === account.id) {
        reloads.push(queryClient.invalidateQueries({ queryKey: ME_KEY }));
      }
      return Promise.all(reloads);
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        return undefined;
      }
      if (error.status === 409) {
        return queryClient.invalidateQueries({ queryKey: APPROVED_KEY });
      }
      if (error.status === 401 || error.status === 403) {
        return queryClient.invalidateQueries({ queryKey: ME_KEY });
      }
      return undefined;
    },
  });
}
