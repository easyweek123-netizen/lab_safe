import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_STATUSES,
  CurrentUser,
  Email,
  ErrorCode,
  LoginRequest,
  ROLES,
  SessionResponse,
  SignUpRequest,
} from '../index';

const VALID = { name: 'Sara Lab', email: 'sara@lab.test', password: 'correct horse' };

/** The `path` and message of every issue, in the shape of the API's `fields` entries. */
function fieldsOf(result: {
  success: boolean;
  error?: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> };
}) {
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

describe('ROLES and ACCOUNT_STATUSES', () => {
  it('S02.1 AC4 lists the fixed roles and statuses', () => {
    expect(ROLES).toEqual(['CONTRIBUTOR', 'ADMIN']);
    expect(ACCOUNT_STATUSES).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
  });
});

describe('ErrorCode', () => {
  it.each(['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_CREDENTIALS', 'EMAIL_TAKEN'])(
    'S02.1 AC2 knows the code %s',
    (code) => {
      expect(ErrorCode.safeParse(code).success).toBe(true);
    },
  );
});

describe('SignUpRequest', () => {
  it('S02.1 AC2 accepts a valid body and trims the name', () => {
    expect(SignUpRequest.parse({ ...VALID, name: '  Sara Lab  ' })).toEqual(VALID);
  });

  it('S02.1 AC2 accepts the limits: 1 and 100 name characters, 8 and 128 password characters', () => {
    expect(SignUpRequest.safeParse({ ...VALID, name: 'S', password: 'x'.repeat(8) }).success).toBe(
      true,
    );
    expect(
      SignUpRequest.safeParse({ ...VALID, name: 'S'.repeat(100), password: 'x'.repeat(128) })
        .success,
    ).toBe(true);
  });

  it.each([
    ['an empty name', { name: '' }, 'Enter your name'],
    ['a name of only spaces', { name: '   ' }, 'Enter your name'],
    ['a missing name', { name: undefined }, 'Enter your name'],
    ['a name of 101 characters', { name: 'S'.repeat(101) }, 'Name must be at most 100 characters'],
  ])('S02.1 AC2 refuses %s', (_label, change, message) => {
    const result = SignUpRequest.safeParse({ ...VALID, ...change });

    expect(fieldsOf(result)).toEqual([{ path: 'name', message }]);
  });

  it.each([
    ['an address without @', 'sara.lab.test'],
    ['an empty email', ''],
    ['a missing email', undefined],
    ['an address longer than 254 characters', `${'a'.repeat(64)}@${'b'.repeat(186)}.test`],
  ])('S02.1 AC2 refuses %s with "Enter a valid email address"', (_label, email) => {
    const result = SignUpRequest.safeParse({ ...VALID, email });

    expect(fieldsOf(result)).toEqual([{ path: 'email', message: 'Enter a valid email address' }]);
  });

  it.each([
    ['7 characters', 'x'.repeat(7), 'Password must be at least 8 characters'],
    ['a missing password', undefined, 'Password must be at least 8 characters'],
    ['129 characters', 'x'.repeat(129), 'Password must be at most 128 characters'],
  ])('S02.1 AC2 refuses a password of %s', (_label, password, message) => {
    const result = SignUpRequest.safeParse({ ...VALID, password });

    expect(fieldsOf(result)).toEqual([{ path: 'password', message }]);
  });

  it('S02.1 AC2 reports one entry per problem', () => {
    const result = SignUpRequest.safeParse({ name: '', email: 'nope', password: 'short' });

    expect(fieldsOf(result)).toEqual([
      { path: 'name', message: 'Enter your name' },
      { path: 'email', message: 'Enter a valid email address' },
      { path: 'password', message: 'Password must be at least 8 characters' },
    ]);
  });

  it('S02.1 AC3 trims and lower-cases the email', () => {
    expect(SignUpRequest.parse({ ...VALID, email: '  Sara@Lab.TEST ' }).email).toBe(
      'sara@lab.test',
    );
  });

  it('S02.1 AC4 strips role and status from a sign-up body', () => {
    const parsed = SignUpRequest.parse({ ...VALID, role: 'ADMIN', status: 'APPROVED' });

    expect(parsed).toEqual(VALID);
    expect(Object.keys(parsed).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('Email', () => {
  it('S02.1 AC5 lower-cases an address in any letter case', () => {
    expect(Email.parse('SARA@LAB.TEST')).toBe('sara@lab.test');
  });
});

describe('LoginRequest', () => {
  it('S02.1 AC5 accepts an email in any letter case and lower-cases it', () => {
    expect(LoginRequest.parse({ email: 'Sara@Lab.TEST', password: 'x' })).toEqual({
      email: 'sara@lab.test',
      password: 'x',
    });
  });

  it('S02.1 AC2 refuses an empty password with "Enter your password"', () => {
    const result = LoginRequest.safeParse({ email: 'sara@lab.test', password: '' });

    expect(fieldsOf(result)).toEqual([{ path: 'password', message: 'Enter your password' }]);
  });

  it('S02.1 AC2 refuses a password of 129 characters', () => {
    const result = LoginRequest.safeParse({ email: 'sara@lab.test', password: 'x'.repeat(129) });

    expect(fieldsOf(result)).toEqual([
      { path: 'password', message: 'Password must be at most 128 characters' },
    ]);
  });
});

describe('CurrentUser and SessionResponse', () => {
  const USER = {
    id: '0b6f1c1e-3f4a-4d8b-9a6e-2c5d7e8f9a01',
    name: 'Sara Lab',
    email: 'sara@lab.test',
    role: 'CONTRIBUTOR',
    status: 'PENDING',
  };

  it('S02.1 AC13 has no password or hash field', () => {
    const parsed = CurrentUser.parse({ ...USER, password: 'x', passwordHash: 'scrypt$…' });

    expect(parsed).toEqual(USER);
  });

  it('S02.1 AC4 refuses an unknown role or status', () => {
    expect(CurrentUser.safeParse({ ...USER, role: 'OWNER' }).success).toBe(false);
    expect(CurrentUser.safeParse({ ...USER, status: 'BANNED' }).success).toBe(false);
  });

  it('S02.1 AC7 accepts a signed-in and an anonymous session', () => {
    expect(SessionResponse.safeParse({ user: USER }).success).toBe(true);
    expect(SessionResponse.safeParse({ user: null }).success).toBe(true);
    expect(SessionResponse.safeParse({}).success).toBe(false);
  });
});
