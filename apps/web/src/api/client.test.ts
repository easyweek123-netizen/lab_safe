import { CurrentUser } from '@labsafe/shared';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { approvedUser, server } from '../test/msw';
import { ApiError, apiSend } from './client';

const URL_PATTERN = '*/api/things';

describe('apiSend', () => {
  it('S02.1 AC5 sends JSON with the body and returns the validated response', async () => {
    let seen: { method: string; contentType: string | null; body: unknown } | undefined;
    server.use(
      http.post(URL_PATTERN, async ({ request }) => {
        seen = {
          method: request.method,
          contentType: request.headers.get('content-type'),
          body: await request.json(),
        };
        return HttpResponse.json(approvedUser, { status: 201 });
      }),
    );

    const result = await apiSend('POST', '/things', CurrentUser, { name: 'x' });

    expect(result).toEqual(approvedUser);
    expect(seen).toEqual({ method: 'POST', contentType: 'application/json', body: { name: 'x' } });
  });

  it('S02.1 AC7 sends {} when there is no body and accepts 204 without a body', async () => {
    let seen: { contentType: string | null; body: string } | undefined;
    server.use(
      http.put(URL_PATTERN, async ({ request }) => {
        seen = { contentType: request.headers.get('content-type'), body: await request.text() };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(apiSend('PUT', '/things')).resolves.toBeUndefined();
    expect(seen).toEqual({ contentType: 'application/json', body: '{}' });
  });

  it("S02.1 AC5 raises ApiError with the server's code and fields", async () => {
    server.use(
      http.post(URL_PATTERN, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            fields: [{ path: 'email', message: 'Enter a valid email address' }],
          },
          { status: 400 },
        ),
      ),
    );

    const error: unknown = await apiSend('POST', '/things', CurrentUser, {}).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      fields: [{ path: 'email', message: 'Enter a valid email address' }],
    });
  });

  it('S02.1 AC5 raises ApiError with status 0 on a network error', async () => {
    server.use(http.post(URL_PATTERN, () => HttpResponse.error()));

    const error: unknown = await apiSend('POST', '/things', CurrentUser, {}).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0 });
  });

  it('S02.1 AC5 raises ApiError when the body breaks the contract', async () => {
    server.use(http.post(URL_PATTERN, () => HttpResponse.json({ id: 'nope' })));

    const error: unknown = await apiSend('POST', '/things', CurrentUser, {}).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 200 });
  });
});
