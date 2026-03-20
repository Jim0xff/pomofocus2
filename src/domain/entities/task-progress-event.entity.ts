import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TaskProgressEventType } from './task-progress-event-type';
import { PomodoroSession } from './pomodoro-session.entity';
import { Task } from './task.entity';

@Entity({ name: 'task_progress_events' })
@Index('IDX_task_progress_events_task_id_created_at', ['taskId', 'createdAt'])
@Index('IDX_task_progress_events_user_id_created_at', ['userId', 'createdAt'])
export class TaskProgressEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ name: 'task_id', type: 'bigint' })
  taskId!: string;

  @ManyToOne('Task', 'progressEvents', { nullable: false })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @Column({ name: 'session_id', type: 'bigint', nullable: true })
  sessionId!: string | null;

  @ManyToOne('PomodoroSession', 'progressEvents', { nullable: true })
  @JoinColumn({ name: 'session_id' })
  session!: PomodoroSession | null;

  @Column({ name: 'event_type', type: 'varchar', length: 30 })
  eventType!: TaskProgressEventType;

  @Column({ name: 'delta_actual_pomodoros', type: 'integer', default: 0 })
  deltaActualPomodoros!: number;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
