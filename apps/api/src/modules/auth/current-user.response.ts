import type { CurrentUser } from '@labsafe/shared';
import type { User } from '../users/user.entity';

/** The account as the API returns it: never the password hash (E02 design "Data"). */
export function toCurrentUserResponse(
  user: Pick<User, 'id' | 'name' | 'email' | 'role' | 'status'>,
): CurrentUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
}
