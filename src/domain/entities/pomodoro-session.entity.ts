import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PomodoroSessionMode } from './pomodoro-session-mode';
import { TaskProgressEvent } from './task-progress-event.entity';
import { Task } from './task.entity';

@Entity({ name: 'pomodoro_sessions' })
@Index('IDX_pomodoro_sessions_user_id_running', ['userId', 'running'])
@Index('IDX_pomodoro_sessions_user_id_running_updated_at', ['userId', 'running', 'updatedAt'])
@Index('IDX_pomodoro_sessions_task_id', ['taskId'])
@Index('IDX_pomodoro_sessions_user_id_task_id_updated_at', ['userId', 'taskId', 'updatedAt'])
@Index('IDX_pomodoro_sessions_updated_at', ['updatedAt'])
export class PomodoroSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ name: 'task_id', type: 'bigint' })
  taskId!: string;

  @ManyToOne('Task', 'pomodoroSessions', { nullable: false })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @Column({ type: 'varchar', length: 20 })
  mode!: PomodoroSessionMode;

  @Column({ type: 'boolean', default: false })
  running!: boolean;

  @Column({ name: 'remaining_seconds', type: 'integer' })
  remainingSeconds!: number;

  @Column({ name: 'focus_cycles_completed', type: 'integer', default: 0 })
  focusCyclesCompleted!: number;

  @Column({ type: 'integer', default: 0 })
  version!: number;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'paused_at', type: 'timestamptz', nullable: true })
  pausedAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany('TaskProgressEvent', 'session')
  progressEvents!: TaskProgressEvent[];
}
