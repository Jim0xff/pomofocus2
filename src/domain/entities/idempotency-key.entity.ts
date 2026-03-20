import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { IdempotencyKeyStatus } from './idempotency-key-status';

@Entity({ name: 'idempotency_keys' })
@Unique('UQ_idempotency_keys_operation_idem_key', ['operation', 'idemKey'])
@Index('IDX_idempotency_keys_expires_at', ['expiresAt'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  operation!: string;

  @Column({ name: 'idem_key', type: 'varchar', length: 128 })
  idemKey!: string;

  @Column({ name: 'request_hash', type: 'varchar', length: 128 })
  requestHash!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: IdempotencyKeyStatus.SUCCEEDED,
  })
  status!: IdempotencyKeyStatus;

  @Column({ name: 'lock_owner', type: 'varchar', length: 128, nullable: true })
  lockOwner!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'response_snapshot', type: 'jsonb', nullable: true })
  responseSnapshot!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
