import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * One login (table `sessions`, E02 design "Data"). Mirrors the `CreateUsersAndSessions`
 * migration exactly, including the constraint names. Only the SHA-256 of the cookie token is
 * stored, never the token itself. Deleting a user deletes their sessions.
 */
@Entity({ name: 'sessions' })
@Unique('sessions_token_hash_key', ['tokenHash'])
@Index('sessions_user_id_idx', ['userId'])
export class Session {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'sessions_pkey' })
  id!: string;

  /** SHA-256 of the cookie token, hex. */
  @Column({ type: 'text', name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'sessions_user_id_fkey' })
  user!: User;

  /** Login + 7 days. */
  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
