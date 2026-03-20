import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_settings' })
@Unique('UQ_user_settings_user_id', ['userId'])
export class UserSettings {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ name: 'focus_minutes', type: 'integer', default: 25 })
  focusMinutes!: number;

  @Column({ name: 'short_break_minutes', type: 'integer', default: 5 })
  shortBreakMinutes!: number;

  @Column({ name: 'long_break_minutes', type: 'integer', default: 15 })
  longBreakMinutes!: number;

  @Column({ name: 'long_break_interval', type: 'integer', default: 4 })
  longBreakInterval!: number;

  @Column({ name: 'alarm_sound', type: 'varchar', length: 50, default: 'classic' })
  alarmSound!: string;

  @Column({ name: 'alarm_volume', type: 'integer', default: 80 })
  alarmVolume!: number;

  @Column({ name: 'background_sound_enabled', type: 'boolean', default: false })
  backgroundSoundEnabled!: boolean;

  @Column({
    name: 'background_sound_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  backgroundSoundType!: string | null;

  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
