import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  approvedUser,
  ME,
  mySubmissionsFixture,
  mySubmissionsHandler,
  rotavapContent,
  rotavapSubmission,
  server,
  SUBMISSIONS,
  errorResponse,
} from '../test/msw';
import { MY_SUBMISSIONS_KEY, useMySubmissions, useSubmitPage } from './submissions';

function wrapperWith(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('submission hooks', () => {
  it('S03.1 AC16 useMySubmissions reads GET /api/submissions/mine', async () => {
    server.use(mySubmissionsHandler(mySubmissionsFixture));
    const { result } = renderHook(() => useMySubmissions(), {
      wrapper: wrapperWith(newClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mySubmissionsFixture);
  });

  it('S03.1 AC8 useSubmitPage posts the page and reloads My submissions', async () => {
    let body: unknown;
    server.use(
      http.post(SUBMISSIONS, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(rotavapSubmission, { status: 201 });
      }),
    );
    const queryClient = newClient();
    queryClient.setQueryData(MY_SUBMISSIONS_KEY, { submissions: [] });
    const { result } = renderHook(() => useSubmitPage(), { wrapper: wrapperWith(queryClient) });

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync(rotavapContent);
    });

    expect(body).toEqual(rotavapContent);
    expect(returned).toEqual(rotavapSubmission);
    expect(queryClient.getQueryState(MY_SUBMISSIONS_KEY)?.isInvalidated).toBe(true);
  });

  it('S03.1 AC17 useSubmitPage fails at once while offline instead of waiting', async () => {
    server.use(http.post(SUBMISSIONS, () => HttpResponse.error()));
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useSubmitPage(), { wrapper: wrapperWith(newClient()) });

    act(() => result.current.mutate(rotavapContent));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 0 });
  });

  it('S03.1 AC17 a 401 on submit does not ask who is signed in again', async () => {
    let meCalls = 0;
    server.use(
      http.post(SUBMISSIONS, () => errorResponse(401, 'UNAUTHENTICATED', 'Log in first')),
      http.get(ME, () => {
        meCalls += 1;
        return HttpResponse.json({ user: approvedUser });
      }),
    );
    const queryClient = newClient();
    queryClient.setQueryData(['auth', 'me'], { user: approvedUser });
    const { result } = renderHook(() => useSubmitPage(), { wrapper: wrapperWith(queryClient) });

    act(() => result.current.mutate(rotavapContent));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 401 });
    expect(queryClient.getQueryState(['auth', 'me'])?.isInvalidated).toBe(false);
    expect(meCalls).toBe(0);
  });
});
