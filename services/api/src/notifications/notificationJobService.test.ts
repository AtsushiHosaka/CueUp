import assert from 'node:assert/strict';
import test from 'node:test';

import type { NotificationJob } from '@cueup/shared';

import { InMemoryNotificationJobRepository } from './notificationJobRepository.js';
import { NotificationJobService } from './notificationJobService.js';

const now = '2026-06-01T09:00:00.000Z';

function createJob(overrides: Partial<NotificationJob> = {}): NotificationJob {
  return {
    id: 'job-1',
    userId: 'alice',
    reminderId: 'reminder-1',
    type: 'snooze',
    scheduledFor: '2026-06-01T09:10:00.000Z',
    status: 'scheduled',
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test('scheduleSnoozeJob creates or replaces the active reminder job', async () => {
  let id = 1;
  const repository = new InMemoryNotificationJobRepository();
  const service = new NotificationJobService(repository, () => `generated-${id++}`);

  const first = await service.scheduleSnoozeJob({
    userId: 'alice',
    reminderId: 'reminder-1',
    scheduledFor: '2026-06-01T09:10:00.000Z',
    now,
  });
  const second = await service.scheduleSnoozeJob({
    userId: 'alice',
    reminderId: 'reminder-1',
    scheduledFor: '2026-06-01T09:20:00.000Z',
    now: '2026-06-01T09:05:00.000Z',
  });

  assert.equal(first.id, 'generated-1');
  assert.equal(second.id, first.id);
  assert.equal(second.scheduledFor, '2026-06-01T09:20:00.000Z');
  assert.equal(second.status, 'scheduled');
});

test('recordFailure schedules retries until max attempts then stores a failure', async () => {
  const service = new NotificationJobService(
    new InMemoryNotificationJobRepository(),
    () => 'new',
    2,
  );
  const retry = await service.recordFailure({
    job: createJob(),
    errorMessage: 'push provider unavailable',
    retryAt: '2026-06-01T09:15:00.000Z',
    now: '2026-06-01T09:10:00.000Z',
  });
  const failed = await service.recordFailure({
    job: retry,
    errorMessage: 'push provider unavailable',
    retryAt: '2026-06-01T09:25:00.000Z',
    now: '2026-06-01T09:20:00.000Z',
  });

  assert.equal(retry.status, 'retry_scheduled');
  assert.equal(retry.attempts, 1);
  assert.equal(retry.scheduledFor, '2026-06-01T09:15:00.000Z');
  assert.equal(failed.status, 'failed');
  assert.equal(failed.attempts, 2);
  assert.equal(failed.lastError, 'push provider unavailable');
});

test('cancelJob removes the job from the active reminder lookup', async () => {
  const repository = new InMemoryNotificationJobRepository([createJob()]);
  const service = new NotificationJobService(repository, () => 'new');
  const canceled = await service.cancelJob(createJob(), '2026-06-01T09:05:00.000Z');

  assert.equal(canceled.status, 'canceled');
  assert.equal(await repository.findActiveByReminderId('reminder-1'), undefined);
});
