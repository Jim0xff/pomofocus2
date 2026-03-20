import { TableIndex, type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSessionQueryIndexes20260320194951 implements MigrationInterface {
  name = 'AddSessionQueryIndexes20260320194951';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'pomodoro_sessions',
      new TableIndex({
        name: 'IDX_pomodoro_sessions_user_id_running_updated_at',
        columnNames: ['user_id', 'running', 'updated_at'],
      }),
    );
    await queryRunner.createIndex(
      'pomodoro_sessions',
      new TableIndex({
        name: 'IDX_pomodoro_sessions_user_id_task_id_updated_at',
        columnNames: ['user_id', 'task_id', 'updated_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'pomodoro_sessions',
      'IDX_pomodoro_sessions_user_id_task_id_updated_at',
    );
    await queryRunner.dropIndex(
      'pomodoro_sessions',
      'IDX_pomodoro_sessions_user_id_running_updated_at',
    );
  }
}
