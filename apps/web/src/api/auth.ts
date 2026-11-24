import {
  CurrentUser,
  SessionResponse,
  type LoginRequest,
  type SignUpRequest,
} from '@labsafe/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiGet, apiSend } from './client';

/** The query key of `useMe`; actions that may change who is signed in invalidate it. */
export const ME_KEY = ['auth', 'me'] as const;

/**
 * Who is signed in (`GET /api/auth/me`; `user` is null for an anonymous visitor). The default
 * stale time, so every page load and every newly mounted gate asks the server again (C3, C7).
 */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => apiGet('/auth/me', SessionResponse),
  });
}

/** Asks the server again who is signed in; the mutation finishes once `me` has answered. */
function useRefreshMe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ME_KEY });
}

/** `POST /api/auth/signup` → 201 `CurrentUser` and the session cookie. */
export function useSignUp() {
  const refreshMe = useRefreshMe();
  return useMutation({
    mutationFn: (request: SignUpRequest) => apiSend('POST', '/auth/signup', CurrentUser, request),
    onSuccess: refreshMe,
  });
}

/** `POST /api/auth/login` → 200 `CurrentUser` and the session cookie. */
export function useLogIn() {
  const refreshMe = useRefreshMe();
  return useMutation({
    mutationFn: (request: LoginRequest) => apiSend('POST', '/auth/login', CurrentUser, request),
    onSuccess: refreshMe,
  });
}

/** `POST /api/auth/logout` → 204. A 401 (the session had already ended) counts as logged out. */
export function useLogOut() {
  const refreshMe = useRefreshMe();
  return useMutation({
    mutationFn: async () => {
      try {
        await apiSend('POST', '/auth/logout');
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          throw error;
        }
      }
    },
    onSuccess: refreshMe,
  });
}
