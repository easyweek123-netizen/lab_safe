import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { AccessRequest } from '../../../src/common/access';
import { AppException } from '../../../src/common/app.exception';
import { RequestOriginGuard } from '../../../src/common/request-origin.guard';

function outcome(method: string, headers: AccessRequest['headers']): string {
  const request: AccessRequest = { method, headers: { host: 'localhost:4100', ...headers } };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  try {
    return new RequestOriginGuard().canActivate(context) ? 'allow' : 'deny';
  } catch (error) {
    if (error instanceof AppException) return `${error.status} ${error.code}`;
    throw error;
  }
}

const JSON_TYPE = { 'content-type': 'application/json' };

describe('RequestOriginGuard', () => {
  it('S02.1 AC12 lets GET, HEAD and OPTIONS pass whatever their headers', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(
        outcome(method, { origin: 'https://evil.example', 'content-type': 'text/plain' }),
      ).toBe('allow');
    }
  });

  it('S02.1 AC12 lets a same-origin JSON POST, PUT, PATCH and DELETE pass', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(outcome(method, { ...JSON_TYPE, origin: 'http://localhost:4100' })).toBe('allow');
    }
  });

  it('S02.1 AC12 lets a JSON POST without an Origin header pass', () => {
    expect(outcome('POST', JSON_TYPE)).toBe('allow');
  });

  it('S02.1 AC12 accepts parameters and any letter case in the Content-Type', () => {
    expect(outcome('POST', { 'content-type': 'Application/JSON; charset=utf-8' })).toBe('allow');
    expect(outcome('POST', { 'content-type': 'multipart/form-data; boundary=x' })).toBe('allow');
  });

  it('S02.1 AC12 compares the Origin host with the Host header in any letter case', () => {
    expect(
      outcome('POST', { ...JSON_TYPE, origin: 'http://LOCALHOST:4100', host: 'Localhost:4100' }),
    ).toBe('allow');
  });

  it('S02.1 AC12 refuses a POST whose Origin names another host with 403 FORBIDDEN', () => {
    expect(outcome('POST', { ...JSON_TYPE, origin: 'https://evil.example' })).toBe('403 FORBIDDEN');
  });

  it('S02.1 AC12 refuses an Origin with the same host name but another port', () => {
    expect(outcome('POST', { ...JSON_TYPE, origin: 'http://localhost:5173' })).toBe(
      '403 FORBIDDEN',
    );
  });

  it('S02.1 AC12 refuses an Origin that is not a URL, such as "null"', () => {
    expect(outcome('POST', { ...JSON_TYPE, origin: 'null' })).toBe('403 FORBIDDEN');
  });

  it('S02.1 AC12 refuses an Origin when the Host header is missing', () => {
    expect(
      outcome('POST', { ...JSON_TYPE, origin: 'http://localhost:4100', host: undefined }),
    ).toBe('403 FORBIDDEN');
  });

  it('S02.1 AC12 refuses text/plain, form-urlencoded and a missing Content-Type with 403 FORBIDDEN', () => {
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', undefined]) {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        expect(outcome(method, { 'content-type': type })).toBe('403 FORBIDDEN');
      }
    }
  });

  it('S02.1 AC12 refuses a lookalike type such as application/json-patch+json', () => {
    expect(outcome('POST', { 'content-type': 'application/json-patch+json' })).toBe(
      '403 FORBIDDEN',
    );
  });
});
