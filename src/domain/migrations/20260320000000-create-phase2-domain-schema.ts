import {
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
  TableUnique,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreatePhase2DomainSchema20260320000000 implements MigrationInterface {
  name = 'CreatePhase2DomainSchema20260320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tasks',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'estimated_pomodoros',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'actual_pomodoros',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'deleted_by',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        checks: [
          new TableCheck({
            name: 'CHK_tasks_estimated_pomodoros_positive',
            expression: '"estimated_pomodoros" > 0',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_tasks_user_id_status',
            columnNames: ['user_id', 'status'],
          }),
          new TableIndex({
            name: 'IDX_tasks_updated_at',
            columnNames: ['updated_at'],
          }),
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'pomodoro_sessions',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'task_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'mode',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'running',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'remaining_seconds',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'focus_cycles_completed',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'version',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'paused_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'ended_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_pomodoro_sessions_task_id',
            columnNames: ['task_id'],
            referencedTableName: 'tasks',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_pomodoro_sessions_user_id_running',
            columnNames: ['user_id', 'running'],
          }),
          new TableIndex({
            name: 'IDX_pomodoro_sessions_task_id',
            columnNames: ['task_id'],
          }),
          new TableIndex({
            name: 'IDX_pomodoro_sessions_updated_at',
            columnNames: ['updated_at'],
          }),
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'task_progress_events',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'task_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'session_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'delta_actual_pomodoros',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_task_progress_events_task_id',
            columnNames: ['task_id'],
            referencedTableName: 'tasks',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
          new TableForeignKey({
            name: 'FK_task_progress_events_session_id',
            columnNames: ['session_id'],
            referencedTableName: 'pomodoro_sessions',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_task_progress_events_task_id_created_at',
            columnNames: ['task_id', 'created_at'],
          }),
          new TableIndex({
            name: 'IDX_task_progress_events_user_id_created_at',
            columnNames: ['user_id', 'created_at'],
          }),
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'user_settings',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'focus_minutes',
            type: 'integer',
            default: 25,
            isNullable: false,
          },
          {
            name: 'short_break_minutes',
            type: 'integer',
            default: 5,
            isNullable: false,
          },
          {
            name: 'long_break_minutes',
            type: 'integer',
            default: 15,
            isNullable: false,
          },
          {
            name: 'long_break_interval',
            type: 'integer',
            default: 4,
            isNullable: false,
          },
          {
            name: 'alarm_sound',
            type: 'varchar',
            length: '50',
            default: "'classic'",
            isNullable: false,
          },
          {
            name: 'alarm_volume',
            type: 'integer',
            default: 80,
            isNullable: false,
          },
          {
            name: 'background_sound_enabled',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'background_sound_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_user_settings_user_id',
            columnNames: ['user_id'],
          }),
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'idempotency_keys',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'operation',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'idem_key',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'request_hash',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'succeeded'",
            isNullable: false,
          },
          {
            name: 'lock_owner',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'response_snapshot',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_idempotency_keys_operation_idem_key',
            columnNames: ['operation', 'idem_key'],
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_idempotency_keys_expires_at',
            columnNames: ['expires_at'],
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('idempotency_keys', true);
    await queryRunner.dropTable('user_settings', true);
    await queryRunner.dropTable('task_progress_events', true);
    await queryRunner.dropTable('pomodoro_sessions', true);
    await queryRunner.dropTable('tasks', true);
  }
}
