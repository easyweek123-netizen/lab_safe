import { describe, expect, it } from 'vitest';
import {
  AdminUser,
  AdminUserList,
  AdminUsersQuery,
  ChangeRoleRequest,
  ErrorCode,
  UserIdParam,
} from '../index';

const USER = {
  id: '0b8f1a52-3c4d-4e5f-8a6b-7c8d9e0f1a2b',
  name: 'Sara Novak',
  email: 'sara@lab.test',
  role: 'CONTRIBUTOR',
  status: 'PENDING',
  createdAt: '2026-11-24T09:30:00.000Z',
};

describe('ErrorCode', () => {
  it('S02.2 AC8 knows the code USER_NOT_PENDING', () => {
    expect(ErrorCode.safeParse('USER_NOT_PENDING').success).toBe(true);
  });
});

describe('S02.3 ErrorCode', () => {
  it.each(['USER_NOT_APPROVED', 'LAST_ADMIN'])('S02.3 AC5 AC8 knows the code %s', (code) => {
    expect(ErrorCode.safeParse(code).success).toBe(true);
  });
});

describe('ChangeRoleRequest', () => {
  it.each(['ADMIN', 'CONTRIBUTOR'])('S02.3 AC3 AC4 accepts the role %s', (role) => {
    expect(ChangeRoleRequest.parse({ role })).toEqual({ role });
  });

  it('S02.3 AC8 strips other keys', () => {
    expect(ChangeRoleRequest.parse({ role: 'ADMIN', status: 'APPROVED' })).toEqual({
      role: 'ADMIN',
    });
  });

  it.each([
    ['a missing role', {}],
    ['an unknown role', { role: 'OWNER' }],
    ['a lower-case role', { role: 'admin' }],
    ['a null role', { role: null }],
    ['a role list', { role: ['ADMIN'] }],
  ])('S02.3 AC8 refuses %s', (_label, body) => {
    const result = ChangeRoleRequest.safeParse(body);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['role']);
  });
});

describe('AdminUsersQuery', () => {
  it('S02.2 AC4 accepts status PENDING', () => {
    expect(AdminUsersQuery.parse({ status: 'PENDING' })).toEqual({ status: 'PENDING' });
  });

  it('S02.3 AC1 accepts status APPROVED', () => {
    expect(AdminUsersQuery.parse({ status: 'APPROVED' })).toEqual({ status: 'APPROVED' });
  });

  it.each([
    ['a missing status', {}],
    ['status REJECTED', { status: 'REJECTED' }],
    ['a lower-case status', { status: 'pending' }],
    ['a repeated status', { status: ['PENDING', 'PENDING'] }],
  ])('S02.2 AC8 refuses %s', (_label, query) => {
    const result = AdminUsersQuery.safeParse(query);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['status']);
  });
});

describe('UserIdParam', () => {
  it('S02.2 AC8 accepts a UUID', () => {
    expect(UserIdParam.parse({ id: USER.id })).toEqual({ id: USER.id });
  });

  it.each([['not-a-uuid'], [''], ['123'], [`${USER.id}x`]])('S02.2 AC8 refuses the id %j', (id) => {
    const result = UserIdParam.safeParse({ id });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['id']);
  });
});

describe('AdminUser and AdminUserList', () => {
  it('S02.2 AC4 accepts an account with an ISO createdAt', () => {
    expect(AdminUser.parse(USER)).toEqual(USER);
    expect(AdminUserList.parse({ users: [USER] })).toEqual({ users: [USER] });
  });

  it('S02.2 AC4 refuses a createdAt that is not an ISO date-time', () => {
    expect(AdminUser.safeParse({ ...USER, createdAt: '24 Nov 2026' }).success).toBe(false);
  });

  it('S02.2 AC4 has no password or hash field', () => {
    expect(Object.keys(AdminUser.shape).sort()).toEqual(
      ['createdAt', 'email', 'id', 'name', 'role', 'status'].sort(),
    );
  });
});
