import type { NotificationJob, UUID } from '@cueup/shared';

export interface NotificationJobRepository {
  findActiveByReminderId(reminderId: UUID): Promise<NotificationJob | undefined>;
  save(job: NotificationJob): Promise<NotificationJob>;
}

export class InMemoryNotificationJobRepository implements NotificationJobRepository {
  private readonly jobs = new Map<UUID, NotificationJob>();

  constructor(initialJobs: NotificationJob[] = []) {
    for (const job of initialJobs) {
      this.jobs.set(job.id, job);
    }
  }

  async findActiveByReminderId(reminderId: UUID): Promise<NotificationJob | undefined> {
    return [...this.jobs.values()].find(
      (job) =>
        job.reminderId === reminderId &&
        (job.status === 'scheduled' || job.status === 'retry_scheduled'),
    );
  }

  async save(job: NotificationJob): Promise<NotificationJob> {
    this.jobs.set(job.id, job);
    return job;
  }
}
