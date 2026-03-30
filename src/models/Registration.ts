import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

const IS_SQLJS = (process.env.DB_TYPE || '').toLowerCase() === 'sqljs';
const DATE_COLUMN_TYPE = IS_SQLJS ? 'datetime' : 'timestamp';
const ID_COLUMN_TYPE = IS_SQLJS ? 'integer' : 'bigint';

@Entity('registrations')
@Unique('uq_registrations_email', ['email'])
@Index('idx_registrations_submitted_at_desc', ['submittedAt'])
export class Registration {
  @PrimaryGeneratedColumn({ type: ID_COLUMN_TYPE as any })
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'team_name', type: 'varchar', length: 120 })
  teamName!: string;

  @Column({ name: 'project_name', type: 'varchar', length: 160 })
  projectName!: string;

  @Column({ name: 'project_summary', type: 'text' })
  projectSummary!: string;

  @Column({ name: 'member_count', type: 'int' })
  memberCount!: number;

  @Column({ name: 'submitted_at', type: DATE_COLUMN_TYPE, default: () => 'CURRENT_TIMESTAMP' })
  submittedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: DATE_COLUMN_TYPE })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: DATE_COLUMN_TYPE })
  updatedAt!: Date;
}
