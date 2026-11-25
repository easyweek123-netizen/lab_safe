import { ACCOUNT_STATUSES, type AccountStatus, ROLES, type Role } from '@labsafe/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { sqlList } from '../../db/sql-list';

/**
 * One account (table `users`, E02 design "Data"). Mirrors the `CreateUsersAndSessions` migration
 * exactly, including the constraint names, so a generated migration finds no change. The columns
 * are exactly the NFR5 list plus the two timestamps. Never map it to a response directly: it holds
 * the password hash.
 */
@Entity({ name: 'users' })
@Unique('users_email_key', ['email'])
@Check('users_email_check', `email = lower(email)`)
@Check('users_name_check', `name = btrim(name) AND char_length(name) BETWEEN 1 AND 100`)
@Check('users_role_check', `role IN (${sqlList(ROLES)})`)
@Check('users_status_check', `status IN (${sqlList(ACCOUNT_STATUSES)})`)
@Check('users_admin_approved_check', `role <> 'ADMIN' OR status = 'APPROVED'`)
export class User {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'users_pkey' })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  /** Stored lower-case; the shared `Email` schema lower-cases it first (E02-D1). */
  @Column({ type: 'text' })
  email!: string;

  /** `scrypt$N$r$p$salt$hash` (`common/password.ts`). */
  @Column({ type: 'text', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'text', default: 'CONTRIBUTOR' })
  role!: Role;

  @Column({ type: 'text', default: 'PENDING' })
  status!: AccountStatus;

  /** The sign-up date. */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
