import type { AdminUser } from '@labsafe/shared';
import type { User } from './user.entity';

/** The columns an `AdminUser` is built from: never the password hash (E02 design "Data"). */
export type AdminUserFields = Pick<User, 'id' | 'name' | 'email' | 'role' | 'status' | 'createdAt'>;

/** An account as an admin sees it; `createdAt` as an ISO string. */
export function toAdminUserResponse(user: AdminUserFields): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
