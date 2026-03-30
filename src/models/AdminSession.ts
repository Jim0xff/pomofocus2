import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, type Relation } from 'typeorm';
import { AdminUser } from './AdminUser.js';

const IS_SQLJS = (process.env.DB_TYPE || '').toLowerCase() === 'sqljs';
const DATE_COLUMN_TYPE = IS_SQLJS ? 'datetime' : 'timestamp';
const ID_COLUMN_TYPE = IS_SQLJS ? 'integer' : 'bigint';
const FK_COLUMN_TYPE = IS_SQLJS ? 'integer' : 'bigint';

@Entity('admin_sessions')
@Unique('uq_admin_sessions_token_hash', ['tokenHash'])
@Index('idx_admin_sessions_admin_user_id', ['adminUserId'])
@Index('idx_admin_sessions_expires_at', ['expiresAt'])
export class AdminSession {
  @PrimaryGeneratedColumn({ type: ID_COLUMN_TYPE as any })
  id!: string;

  @Column({ name: 'admin_user_id', type: FK_COLUMN_TYPE as any })
  adminUserId!: string;

  @ManyToOne(() => AdminUser, (u) => u.sessions, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'admin_user_id' })
  adminUser!: Relation<AdminUser>;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: DATE_COLUMN_TYPE })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: DATE_COLUMN_TYPE })
  createdAt!: Date;

  @Column({ name: 'revoked_at', type: DATE_COLUMN_TYPE, nullable: true })
  revokedAt!: Date | null;
}
