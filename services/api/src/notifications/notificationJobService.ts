import type { IsoDateTime, NotificationJob, UUID } from '@cueup/shared';

import type { NotificationJobRepository } from './notificationJobRepository.js';

export type NotificationJobIdFactory = () => UUID;

export class NotificationJobService {
  constructor(
    private readonly repository: NotificationJobRepository,
    private readonly idFactory: NotificationJobIdFactory,
    private readonly maxAttempts = 3,
  ) {}

  async scheduleSnoozeJob(params: {
    userId: UUID;
    reminderId: UUID;
    scheduledFor: IsoDateTime;
    now: IsoDateTime;
  }): Promise<NotificationJob> {
    const existing = await this.repository.findActiveByReminderId(params.reminderId);

    return this.repository.save({
      id: existing?.id ?? this.idFactory(),
      userId: params.userId,
      reminderId: params.reminderId,
      type: 'snooze',
      scheduledFor: params.scheduledFor,
      status: 'scheduled',
      attempts: existing?.attempts ?? 0,
      lastError: null,
      createdAt: existing?.createdAt ?? params.now,
      updatedAt: params.now,
    });
  }

  async recordFailure(params: {
    job: NotificationJob;
    errorMessage: string;
    retryAt: IsoDateTime;
    now: IsoDateTime;
  }): Promise<NotificationJob> {
    const attempts = params.job.attempts + 1;
    const retryable = attempts < this.maxAttempts;

    return this.repository.save({
      ...params.job,
      attempts,
      lastError: params.errorMessage,
      scheduledFor: retryable ? params.retryAt : params.job.scheduledFor,
      status: retryable ? 'retry_scheduled' : 'failed',
      updatedAt: params.now,
    });
  }

  async cancelJob(job: NotificationJob, now: IsoDateTime): Promise<NotificationJob> {
    return this.repository.save({
      ...job,
      status: 'canceled',
      updatedAt: now,
    });
  }
}
