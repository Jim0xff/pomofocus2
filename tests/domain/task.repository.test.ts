import {
  applyTaskVisibilityFilter,
  buildTaskWhere,
  type TaskQueryBuilderLike,
} from '../../src/domain/repositories';
import { TaskStatus } from '../../src/domain/entities';

describe('task repository helpers', () => {
  it('applies the default archived task filter to find conditions', () => {
    const where = buildTaskWhere({ userId: 'user-1' });

    expect(where.userId).toBe('user-1');
    expect(where.status).toMatchObject({
      _type: 'not',
      _value: TaskStatus.ARCHIVED,
    });
    expect(where.deletedAt).toMatchObject({
      _type: 'isNull',
    });
  });

  it('skips the archived task filter when explicitly requested', () => {
    const where = buildTaskWhere({ userId: 'user-1' }, { includeArchived: true });

    expect(where).toEqual({ userId: 'user-1' });
  });

  it('adds archived visibility constraints to query builders by default', () => {
    const calls: Array<{ condition: string; parameters?: Record<string, unknown> }> = [];
    const queryBuilder: TaskQueryBuilderLike = {
      andWhere(condition, parameters) {
        calls.push({ condition, parameters });
        return this;
      },
    };

    applyTaskVisibilityFilter(queryBuilder, 'tasks');

    expect(calls).toEqual([
      {
        condition: 'tasks.status != :archivedStatus',
        parameters: { archivedStatus: TaskStatus.ARCHIVED },
      },
      {
        condition: 'tasks.deleted_at IS NULL',
        parameters: undefined,
      },
    ]);
  });

  it('does not mutate query builders when archived records are included', () => {
    const queryBuilder: TaskQueryBuilderLike = {
      andWhere: jest.fn().mockReturnThis(),
    };

    applyTaskVisibilityFilter(queryBuilder, 'tasks', { includeArchived: true });

    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
  });
});
