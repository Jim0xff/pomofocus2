import { getMetadataArgsStorage } from 'typeorm';

import { IdempotencyKey, Task, UserSettings } from '../../src/domain/entities';
import { TaskStatus } from '../../src/domain/entities';

describe('domain entity metadata', () => {
  const storage = getMetadataArgsStorage();

  it('defines task defaults and positive estimated pomodoro check', () => {
    const taskColumns = storage.columns.filter((column) => column.target === Task);
    const statusColumn = taskColumns.find((column) => column.propertyName === 'status');
    const actualPomodorosColumn = taskColumns.find(
      (column) => column.propertyName === 'actualPomodoros',
    );
    const deletedAtColumn = taskColumns.find((column) => column.propertyName === 'deletedAt');
    const taskCheck = storage.checks.find((check) => check.target === Task);

    expect(statusColumn?.options.default).toBe(TaskStatus.ACTIVE);
    expect(actualPomodorosColumn?.options.default).toBe(0);
    expect(deletedAtColumn?.options.nullable).toBe(true);
    expect(taskCheck?.expression).toBe('"estimated_pomodoros" > 0');
  });

  it('marks user settings userId as unique', () => {
    const userSettingsUnique = storage.uniques.find(
      (unique) => unique.target === UserSettings && unique.name === 'UQ_user_settings_user_id',
    );

    expect(userSettingsUnique?.columns).toEqual(['userId']);
  });

  it('marks idempotency keys operation and idemKey as unique', () => {
    const idempotencyUnique = storage.uniques.find(
      (unique) =>
        unique.target === IdempotencyKey &&
        unique.name === 'UQ_idempotency_keys_operation_idem_key',
    );

    expect(idempotencyUnique?.columns).toEqual(['operation', 'idemKey']);
  });
});
