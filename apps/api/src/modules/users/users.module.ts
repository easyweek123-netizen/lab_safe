import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersController } from './admin-users.controller';
import { BootstrapAdminService } from './bootstrap-admin.service';
import { User } from './user.entity';
import { UsersService } from './users.service';

/**
 * Accounts (E02 design "Data"). Exports `UsersService` for `AuthModule`. `BootstrapAdminService`
 * creates the first admin at start-up and `AdminUsersController` serves the sign-up review (S02.2).
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AdminUsersController],
  providers: [UsersService, BootstrapAdminService],
  exports: [UsersService],
})
export class UsersModule {}
