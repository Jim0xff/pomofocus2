import { TaskStatus } from '../domain/entities';
import type { TaskRepositoryContract } from '../domain/repositories';
import type { SettingsService } from './settings.service';

export interface EstimateFinishTimeInput {
  date: string;
  includeBreak: boolean;
}

export interface EstimateFinishTimeResult {
  basedOnFocusMinutes: number;
  estimatedFinishAt: Date;
  remainingPomodoros: number;
}

export interface TodayStatsResult {
  completedPomodoros: number;
  completedTasks: number;
  estimatedFinishAt: Date;
  totalTasks: number;
}

export class StatsService {
  public constructor(
    private readonly taskRepository: TaskRepositoryContract,
    private readonly settingsService: SettingsService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async estimateFinishTime(
    userId: string,
    input: EstimateFinishTimeInput,
  ): Promise<EstimateFinishTimeResult> {
    void input.date;

    const [settings, tasks] = await Promise.all([
      this.settingsService.getSettings(userId),
      this.taskRepository.findByUser(userId),
    ]);

    const remainingPomodoros = tasks
      .filter((task) => task.status !== TaskStatus.COMPLETED)
      .reduce((total, task) => total + Math.max(task.estimatedPomodoros - task.actualPomodoros, 0), 0);

    const focusSeconds = remainingPomodoros * settings.focusMinutes * 60;
    let breakSeconds = 0;

    if (input.includeBreak && remainingPomodoros > 0) {
      for (let cycle = 1; cycle < remainingPomodoros; cycle += 1) {
        breakSeconds +=
          cycle % settings.longBreakInterval === 0
            ? settings.longBreakMinutes * 60
            : settings.shortBreakMinutes * 60;
      }
    }

    return {
      basedOnFocusMinutes: settings.focusMinutes,
      estimatedFinishAt: new Date(this.now().getTime() + (focusSeconds + breakSeconds) * 1000),
      remainingPomodoros,
    };
  }

  public async todayStats(userId: string): Promise<TodayStatsResult> {
    const [estimate, tasks] = await Promise.all([
      this.estimateFinishTime(userId, {
        date: this.now().toISOString().slice(0, 10),
        includeBreak: true,
      }),
      this.taskRepository.findByUser(userId),
    ]);

    return {
      completedPomodoros: tasks.reduce((total, task) => total + task.actualPomodoros, 0),
      completedTasks: tasks.filter((task) => task.status === TaskStatus.COMPLETED).length,
      estimatedFinishAt: estimate.estimatedFinishAt,
      totalTasks: tasks.length,
    };
  }
}
