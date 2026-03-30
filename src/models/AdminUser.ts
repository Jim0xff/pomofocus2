import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn, type Relation } from 'typeorm';
import { AdminSession } from './AdminSession.js';

const IS_SQLJS = (process.env.DB_TYPE || '').toLowerCase() === 'sqljs' && !process.env.DATABASE_URL;
const DATE_COLUMN_TYPE = IS_SQLJS ? 'datetime' : 'timestamp';
const ID_COLUMN_TYPE = IS_SQLJS ? 'integer' : 'bigint';

@Entity('admin_users')
@Unique('uq_admin_users_username', ['username'])
export class AdminUser {
  @PrimaryGeneratedColumn({ type: ID_COLUMN_TYPE as any })
  id!: string;

  @Column({ name: 'username', type: 'varchar', length: 64 })
  username!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: DATE_COLUMN_TYPE })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: DATE_COLUMN_TYPE })
  updatedAt!: Date;

  @OneToMany(() => AdminSession, (s) => s.adminUser)
  sessions!: Relation<AdminSession[]>;
}
