import type {
  AccountStatus,
  AdminUser,
  AdminUserList,
  AdminUsersQuery,
  Role,
} from '@labsafe/shared';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  type EntityManager,
  type FindOptionsOrder,
  QueryFailedError,
  type Repository,
} from 'typeorm';
import { AppException } from '../../common/app.exception';
import { toAdminUserResponse } from './admin-user.response';
import { User } from './user.entity';

/** The columns of an `AdminUser`: never the hash. */
const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

/** A row of `UPDATE … RETURNING id, name, email, role, status, created_at`. */
interface DecidedRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  created_at: Date;
}

/** `PENDING`: oldest sign-up first (S02.2 AC4); `APPROVED`: by name, then email (S02.3 AC1). */
const LIST_ORDER: Record<AdminUsersQuery['status'], FindOptionsOrder<User>> = {
  PENDING: { createdAt: 'ASC', id: 'ASC' },
  APPROVED: { name: 'ASC', email: 'ASC', id: 'ASC' },
};

const EMAIL_TAKEN_MESSAGE = 'An account with this email already exists';

/** What a new account needs; the email is already lower-cased by the shared `Email` schema. */
export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
}

/** True if the error is the `users_email_key` unique violation (SQLSTATE 23505). */
function isEmailTaken(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: unknown; constraint?: unknown };
  return driverError.code === '23505' && driverError.constraint === 'users_email_key';
}

/**
 * Accounts (table `users`, E02 design "Data"). The entities it returns hold the password hash, so
 * they stay inside the services; responses go through `toCurrentUserResponse`.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Inserts a `PENDING` `CONTRIBUTOR` inside the caller's transaction. Role and status are set
   * here, never taken from the request (S02.1 AC4). An email that already has an account is
   * 409 `EMAIL_TAKEN` with a `fields` entry for `email` (AC3); the unique key decides, so two
   * sign-ups at once cannot both win.
   */
  async createPending(manager: EntityManager, newUser: NewUser): Promise<User> {
    const repository = manager.getRepository(User);
    try {
      return await repository.save(
        repository.create({ ...newUser, role: 'CONTRIBUTOR', status: 'PENDING' }),
      );
    } catch (error) {
      if (isEmailTaken(error)) {
        throw new AppException(409, 'EMAIL_TAKEN', EMAIL_TAKEN_MESSAGE, [
          { path: 'email', message: EMAIL_TAKEN_MESSAGE },
        ]);
      }
      throw error;
    }
  }

  /** The account with this (lower-case) email, including its hash, or null. */
  findByEmail(email: string, manager?: EntityManager): Promise<User | null> {
    return this.repositoryOf(manager).findOneBy({ email });
  }

  /** True if at least one `ADMIN` account exists. */
  adminExists(manager?: EntityManager): Promise<boolean> {
    return this.repositoryOf(manager).existsBy({ role: 'ADMIN' });
  }

  /** Inserts an `APPROVED` `ADMIN` inside the caller's transaction (S02.2 AC1, the first admin). */
  async createApprovedAdmin(manager: EntityManager, newUser: NewUser): Promise<User> {
    const repository = manager.getRepository(User);
    return repository.save(repository.create({ ...newUser, role: 'ADMIN', status: 'APPROVED' }));
  }

  /**
   * Makes an existing account an `APPROVED` `ADMIN` inside the caller's transaction; its name and
   * password stay (S02.2 AC1). Both columns change in one statement, because the database refuses
   * an admin that is not approved (`users_admin_approved_check`).
   */
  async makeApprovedAdmin(manager: EntityManager, id: string): Promise<void> {
    await manager.getRepository(User).update({ id }, { role: 'ADMIN', status: 'APPROVED' });
  }

  /**
   * Every account with this status in one query and without the hash: pending oldest sign-up
   * first (S02.2 AC4), approved by name, then email (S02.3 AC1); ties by id.
   */
  async listByStatus(status: AdminUsersQuery['status']): Promise<AdminUserList> {
    const users = await this.users.find({
      select: ADMIN_USER_SELECT,
      where: { status },
      order: LIST_ORDER[status],
    });
    return { users: users.map(toAdminUserResponse) };
  }

  /**
   * Sets a `PENDING` account to `APPROVED` or `REJECTED` (S02.2 AC6, AC7, AC8). One conditional
   * `UPDATE … WHERE id AND status = 'PENDING'`, so of two admins acting at once only one wins and
   * a rejection is final. No row updated: 404 `NOT_FOUND` if the id is unknown, otherwise 409
   * `USER_NOT_PENDING`; that lookup only picks the error, it never decides the write.
   */
  async decideSignUp(id: string, status: 'APPROVED' | 'REJECTED'): Promise<AdminUser> {
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({ status })
      .where('id = :id AND status = :pending', { id, pending: 'PENDING' })
      .returning('id, name, email, role, status, created_at')
      .execute();
    const rows = result.raw as DecidedRow[];
    const row = rows[0];
    if (row) {
      return toAdminUserResponse({ ...row, createdAt: row.created_at });
    }
    if (!(await this.users.existsBy({ id }))) {
      throw new AppException(404, 'NOT_FOUND', 'This account does not exist.');
    }
    throw new AppException(409, 'USER_NOT_PENDING', 'This sign-up was already handled.');
  }

  /**
   * Sets the role of an `APPROVED` account (S02.3 AC3-AC8, invariant I7, E02 design "Flows",
   * second diagram). One transaction: first every admin row is locked with `FOR UPDATE` (in id
   * order), so two demotions at once run one after the other and the second one sees the first
   * one's result; then the target row is locked and checked. Unknown id: 404; not approved: 409
   * `USER_NOT_APPROVED`; demoting the only admin: 409 `LAST_ADMIN`; the role it already has: 200
   * and nothing changes.
   */
  async changeRole(id: string, role: Role): Promise<AdminUser> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const admins = await repository.find({
        select: { id: true },
        where: { role: 'ADMIN' },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const target = await repository.findOne({
        select: ADMIN_USER_SELECT,
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!target) {
        throw new AppException(404, 'NOT_FOUND', 'This account does not exist.');
      }
      if (target.status !== 'APPROVED') {
        throw new AppException(409, 'USER_NOT_APPROVED', 'Only approved accounts can change role.');
      }
      if (target.role === role) {
        return toAdminUserResponse(target);
      }
      if (role === 'CONTRIBUTOR' && admins.every((admin) => admin.id === target.id)) {
        throw new AppException(409, 'LAST_ADMIN', 'There must be at least one admin.');
      }
      await repository.update({ id }, { role });
      this.logger.log(`Role of account ${id} changed to ${role}.`);
      return toAdminUserResponse({ ...target, role });
    });
  }

  private repositoryOf(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.users;
  }
}
