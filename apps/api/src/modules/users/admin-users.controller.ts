import {
  type AdminUser,
  type AdminUserList,
  AdminUsersQuery,
  ChangeRoleRequest,
  UserIdParam,
} from '@labsafe/shared';
import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { Admin } from '../../common/access';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { UsersService } from './users.service';

/**
 * `/api/admin/users` (S02.2 and S02.3 API contracts). `@Admin()` on the class, so every handler is for
 * approved admins only. Approve and reject take body `{}`, which is not read.
 */
@Admin()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * `GET /api/admin/users?status=PENDING|APPROVED` → 200 `AdminUserList`: pending oldest first,
   * approved by name, then email.
   */
  @Get()
  list(
    @Query(new ZodValidationPipe(AdminUsersQuery)) query: AdminUsersQuery,
  ): Promise<AdminUserList> {
    return this.usersService.listByStatus(query.status);
  }

  /** `POST /api/admin/users/:id/approve` → 200 `AdminUser`. */
  @Post(':id/approve')
  @HttpCode(200)
  approve(@Param(new ZodValidationPipe(UserIdParam)) params: UserIdParam): Promise<AdminUser> {
    return this.usersService.decideSignUp(params.id, 'APPROVED');
  }

  /** `POST /api/admin/users/:id/reject` → 200 `AdminUser`. */
  @Post(':id/reject')
  @HttpCode(200)
  reject(@Param(new ZodValidationPipe(UserIdParam)) params: UserIdParam): Promise<AdminUser> {
    return this.usersService.decideSignUp(params.id, 'REJECTED');
  }

  /** `PUT /api/admin/users/:id/role` → 200 `AdminUser` (S02.3). */
  @Put(':id/role')
  changeRole(
    @Param(new ZodValidationPipe(UserIdParam)) params: UserIdParam,
    @Body(new ZodValidationPipe(ChangeRoleRequest)) body: ChangeRoleRequest,
  ): Promise<AdminUser> {
    return this.usersService.changeRole(params.id, body.role);
  }
}
