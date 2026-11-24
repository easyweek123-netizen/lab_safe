import { z } from 'zod';
import { AccountStatus, Role } from './auth';

// Sign-up review and accounts for admins (S02.2 and S02.3 API contracts, E02 design "Endpoints").

/**
 * `GET /api/admin/users?status=`: `PENDING` oldest sign-up first (S02.2), `APPROVED` by name,
 * then email (S02.3).
 */
export const AdminUsersQuery = z.object({
  status: z.enum(['PENDING', 'APPROVED']),
});
export type AdminUsersQuery = z.infer<typeof AdminUsersQuery>;

/** `:id` of `/api/admin/users/:id/…`. */
export const UserIdParam = z.object({
  id: z.uuid(),
});
export type UserIdParam = z.infer<typeof UserIdParam>;

/** An account as an admin sees it. Never has a password or hash field. */
export const AdminUser = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: Role,
  status: AccountStatus,
  /** The sign-up date, an ISO 8601 date-time in UTC. */
  createdAt: z.iso.datetime(),
});
export type AdminUser = z.infer<typeof AdminUser>;

export const AdminUserList = z.object({
  users: z.array(AdminUser),
});
export type AdminUserList = z.infer<typeof AdminUserList>;

/** `PUT /api/admin/users/:id/role` (S02.3). Other keys are stripped. */
export const ChangeRoleRequest = z.object({
  role: Role,
});
export type ChangeRoleRequest = z.infer<typeof ChangeRoleRequest>;
