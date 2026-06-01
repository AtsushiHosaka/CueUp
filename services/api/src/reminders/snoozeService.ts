import type {
  IsoDateTime,
  NotificationJob,
  NotificationMessage,
  Reminder,
  UsageQuota,
  UUID,
} from '@cueup/shared';

import {
  AccessDeniedError,
  RecordNotFoundError,
  assertCanAccessRecord,
  type Actor,
} from '../data/accessControl.js';
import { NotificationJobService } from '../notifications/notificationJobService.js';
import { ReminderServiceError, persistenceUnavailable, validationError } from './reminderErrors.js';
import type { ReminderRepository } from './reminderRepository.js';

export type SnoozeReminderInput = {
  durationMinutes?: unknown;
  generateMessage?: unknown;
};

export type SnoozeMessageGeneratorResult = {
  message?: NotificationMessage;
  quota?: UsageQuota;
};

export type SnoozeMessageGenerator = (params: {
  actor: Actor;
  reminder: Reminder;
  snoozedUntil: IsoDateTime;
  now: IsoDateTime;
}) => Promise<SnoozeMessageGeneratorResult>;

export type SnoozeReminderResult = {
  reminder: Reminder;
  notificationJob: NotificationJob;
  message?: NotificationMessage;
  quota?: UsageQuota;
};

export class SnoozeService {
  constructor(
    private readonly reminders: ReminderRepository,
    private readonly jobs: NotificationJobService,
    private readonly messageGenerator?: SnoozeMessageGenerator,
    private readonly maxSnoozes = 3,
  ) {}

  async snoozeReminder(params: {
    actor: Actor;
    id: UUID;
    input: SnoozeReminderInput;
    now: IsoDateTime;
  }): Promise<SnoozeReminderResult> {
    const existing = await this.getAccessibleReminder(params.actor, params.id);
    const snoozeCount = existing.snoozeCount ?? 0;

    if (snoozeCount >= this.maxSnoozes) {
      throw new ReminderServiceError(
        'REMINDER_SNOOZE_LIMIT_EXCEEDED',
        `Reminder snooze limit of ${this.maxSnoozes} reached`,
        {
          limit: this.maxSnoozes,
        },
      );
    }

    const snoozedUntil = getSnoozedUntil(params.input.durationMinutes, params.now);
    const notificationJob = await this.jobs.scheduleSnoozeJob({
      userId: existing.userId,
      reminderId: existing.id,
      scheduledFor: snoozedUntil,
      now: params.now,
    });
    let reminder: Reminder;

    try {
      reminder = await this.writeRepository(() =>
        this.reminders.save({
          ...existing,
          status: 'snoozed',
          scheduledAt: snoozedUntil,
          snoozedUntil,
          snoozeCount: snoozeCount + 1,
          updatedAt: params.now,
        }),
      );
    } catch (error) {
      await this.jobs.cancelJob(notificationJob, params.now);
      throw error;
    }

    if (params.input.generateMessage !== true || this.messageGenerator === undefined) {
      return { reminder, notificationJob };
    }

    const generated = await this.messageGenerator({
      actor: params.actor,
      reminder,
      snoozedUntil,
      now: params.now,
    });

    return {
      reminder,
      notificationJob,
      ...generated,
    };
  }

  private async getAccessibleReminder(actor: Actor, id: UUID): Promise<Reminder> {
    const reminder = await this.readRepository(() => this.reminders.findById(id));

    try {
      return assertCanAccessRecord(actor, reminder, 'snooze');
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        throw new ReminderServiceError('REMINDER_ACCESS_DENIED', error.message);
      }

      if (error instanceof RecordNotFoundError) {
        throw new ReminderServiceError('REMINDER_NOT_FOUND', error.message);
      }

      throw error;
    }
  }

  private async readRepository<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ReminderServiceError) {
        throw error;
      }

      throw persistenceUnavailable();
    }
  }

  private async writeRepository<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    return this.readRepository(operation);
  }
}

function getSnoozedUntil(durationMinutes: unknown, now: IsoDateTime): IsoDateTime {
  if (
    typeof durationMinutes !== 'number' ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 24 * 60
  ) {
    throw validationError(
      'durationMinutes must be an integer between 1 and 1440',
      'durationMinutes',
    );
  }

  const nowDate = new Date(now);

  if (Number.isNaN(nowDate.getTime())) {
    throw validationError('now must be a valid ISO date', 'now');
  }

  return new Date(nowDate.getTime() + durationMinutes * 60 * 1000).toISOString();
}
