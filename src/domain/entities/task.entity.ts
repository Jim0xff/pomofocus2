import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PomodoroSession } from './pomodoro-session.entity';
import { TaskStatus } from './task-status';
import { TaskProgressEvent } from './task-progress-event.entity';

@Entity({ name: 'tasks' })
@Index('IDX_tasks_user_id_status', ['userId', 'status'])
@Index('IDX_tasks_updated_at', ['updatedAt'])
@Check('CHK_tasks_estimated_pomodoros_positive', '"estimated_pomodoros" > 0')
export class Task {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'estimated_pomodoros', type: 'integer' })
  estimatedPomodoros!: number;

  @Column({ name: 'actual_pomodoros', type: 'integer', default: 0 })
  actualPomodoros!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: TaskStatus.ACTIVE,
  })
  status!: TaskStatus;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'deleted_by', type: 'varchar', length: 64, nullable: true })
  deletedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany('PomodoroSession', 'task')
  pomodoroSessions!: PomodoroSession[];

  @OneToMany('TaskProgressEvent', 'task')
  progressEvents!: TaskProgressEvent[];
}
