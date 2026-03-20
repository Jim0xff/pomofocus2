import { UserSettings } from '../domain/entities';
import type { SettingsRepositoryContract } from '../domain/repositories';
import { ServiceError } from './service-error';

export interface UpdateSettingsInput {
  alarmSound?: string | null;
  alarmVolume?: number | null;
  backgroundSoundEnabled?: boolean | null;
  backgroundSoundType?: string | null;
  focusMinutes?: number | null;
  idempotencyKey: string;
  longBreakInterval?: number | null;
  longBreakMinutes?: number | null;
  shortBreakMinutes?: number | null;
}

export class SettingsService {
  public constructor(private readonly settingsRepository: SettingsRepositoryContract) {}

  public async getSettings(userId: string): Promise<UserSettings> {
    const existing = await this.settingsRepository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    return this.settingsRepository.save(
      this.settingsRepository.create({
        alarmSound: 'classic',
        alarmVolume: 80,
        backgroundSoundEnabled: false,
        backgroundSoundType: null,
        focusMinutes: 25,
        longBreakInterval: 4,
        longBreakMinutes: 15,
        shortBreakMinutes: 5,
        updatedBy: userId,
        userId,
      }),
    );
  }

  public async updateSettings(userId: string, input: UpdateSettingsInput): Promise<UserSettings> {
    this.validateMinutes('focusMinutes', input.focusMinutes);
    this.validateMinutes('shortBreakMinutes', input.shortBreakMinutes);
    this.validateMinutes('longBreakMinutes', input.longBreakMinutes);

    if (input.longBreakInterval !== undefined && input.longBreakInterval !== null) {
      if (!Number.isInteger(input.longBreakInterval) || input.longBreakInterval <= 0) {
        throw new ServiceError('INVALID_SETTINGS', 'longBreakInterval must be a positive integer.', {
          details: {
            field: 'longBreakInterval',
          },
          statusCode: 400,
        });
      }
    }

    if (input.alarmVolume !== undefined && input.alarmVolume !== null) {
      if (!Number.isInteger(input.alarmVolume) || input.alarmVolume < 0 || input.alarmVolume > 100) {
        throw new ServiceError('INVALID_SETTINGS', 'alarmVolume must be between 0 and 100.', {
          details: {
            field: 'alarmVolume',
          },
          statusCode: 400,
        });
      }
    }

    const settings = await this.getSettings(userId);

    if (input.alarmSound !== undefined && input.alarmSound !== null) {
      settings.alarmSound = input.alarmSound;
    }

    if (input.alarmVolume !== undefined && input.alarmVolume !== null) {
      settings.alarmVolume = input.alarmVolume;
    }

    if (input.backgroundSoundEnabled !== undefined && input.backgroundSoundEnabled !== null) {
      settings.backgroundSoundEnabled = input.backgroundSoundEnabled;
    }

    if (input.backgroundSoundType !== undefined) {
      settings.backgroundSoundType = input.backgroundSoundType;
    }

    if (input.focusMinutes !== undefined && input.focusMinutes !== null) {
      settings.focusMinutes = input.focusMinutes;
    }

    if (input.shortBreakMinutes !== undefined && input.shortBreakMinutes !== null) {
      settings.shortBreakMinutes = input.shortBreakMinutes;
    }

    if (input.longBreakMinutes !== undefined && input.longBreakMinutes !== null) {
      settings.longBreakMinutes = input.longBreakMinutes;
    }

    if (input.longBreakInterval !== undefined && input.longBreakInterval !== null) {
      settings.longBreakInterval = input.longBreakInterval;
    }

    settings.updatedBy = userId;

    return this.settingsRepository.save(settings);
  }

  private validateMinutes(field: string, value: number | null | undefined): void {
    if (value === undefined || value === null) {
      return;
    }

    if (!Number.isInteger(value) || value <= 0) {
      throw new ServiceError('INVALID_SETTINGS', `${field} must be a positive integer.`, {
        details: {
          field,
        },
        statusCode: 400,
      });
    }
  }
}
