import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AccessGuard } from './access.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Session } from './session.entity';
import { SessionsService } from './sessions.service';

/**
 * Sign-up, login, logout and `me`, sessions and the global `AccessGuard` (E02 design "Flows").
 * `AppModule` registers `RequestOriginGuard` before importing this module, so the origin check
 * runs first.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Session]), UsersModule],
  controllers: [AuthController],
  providers: [SessionsService, AuthService, { provide: APP_GUARD, useClass: AccessGuard }],
  exports: [SessionsService],
})
export class AuthModule {}
