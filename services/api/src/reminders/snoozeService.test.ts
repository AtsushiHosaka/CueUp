import assert from 'node:assert/strict';
import test from 'node:test';

import type { NotificationJob, NotificationMessage, Reminder, UsageQuota } from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import { InMemoryNotificationJobRepository } from '../notifications/notificationJobRepository.js';
import { NotificationJobService } from '../notifications/notificationJobService.js';
import { ReminderServiceError } from './reminderErrors.js';
import { InMemoryReminderRepository, type ReminderRepository } from './reminderRepository.js';
import { SnoozeService, type SnoozeMessageGenerator } from './snoozeService.js';

const now = '2026-06-01T09:00:00.000Z';
const alice: Actor = { userId: 'alice', role: 'user' };
const bob: Actor = { userId: 'bob', role: 'user' };

function createReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'reminder-1',
    userId: 'alice',
    title: 'Finish proposal',
    note: null,
    scheduledAt: '2026-06-01T10:00:00.000Z',
    recurrenceRule: null,
    characterId: 'character-1',
    folderId: null,
    tagIds: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createService(reminders: Reminder[], generator?: SnoozeMessageGenerator) {
  let jobId = 1;

  return new SnoozeService(
    new InMemoryReminderRepository(reminders),
    new NotificationJobService(new InMemoryNotificationJobRepository(), () => `job-${jobId++}`),
    generator,
  );
}

function assertReminderError(error: unknown, code: ReminderServiceError['code']): boolean {
  assert.ok(error instanceof ReminderServiceError);
  assert.equal(error.code, code);

  return true;
}

test('snoozeReminder saves the next notification time and schedules a snooze job', async () => {
  const service = createService([createReminder()]);
  const result = await service.snoozeReminder({
    actor: alice,
    id: 'reminder-1',
    input: { durationMinutes: 15 },
    now,
  });

  assert.equal(result.reminder.status, 'snoozed');
  assert.equal(result.reminder.scheduledAt, '2026-06-01T09:15:00.000Z');
  assert.equal(result.reminder.snoozedUntil, '2026-06-01T09:15:00.000Z');
  assert.equal(result.reminder.snoozeCount, 1);
  assert.equal(result.notificationJob.reminderId, 'reminder-1');
  assert.equal(result.notificationJob.scheduledFor, '2026-06-01T09:15:00.000Z');
  assert.equal(result.notificationJob.status, 'scheduled');
});

test('snoozeReminder validates input and access control', async () => {
  const service = createService([createReminder()]);

  await assert.rejects(
    () =>
      service.snoozeReminder({
        actor: alice,
        id: 'reminder-1',
        input: { durationMinutes: 0 },
        now,
      }),
    (error) => assertReminderError(error, 'REMINDER_VALIDATION_ERROR'),
  );
  await assert.rejects(
    () =>
      service.snoozeReminder({
        actor: bob,
        id: 'reminder-1',
        input: { durationMinutes: 5 },
        now,
      }),
    (error) => assertReminderError(error, 'REMINDER_ACCESS_DENIED'),
  );
  await assert.rejects(
    () =>
      service.snoozeReminder({
        actor: alice,
        id: 'missing',
        input: { durationMinutes: 5 },
        now,
      }),
    (error) => assertReminderError(error, 'REMINDER_NOT_FOUND'),
  );
});

test('snoozeReminder enforces the per-reminder snooze limit', async () => {
  const service = createService([createReminder({ snoozeCount: 3 })]);

  await assert.rejects(
    () =>
      service.snoozeReminder({
        actor: alice,
        id: 'reminder-1',
        input: { durationMinutes: 5 },
        now,
      }),
    (error) => assertReminderError(error, 'REMINDER_SNOOZE_LIMIT_EXCEEDED'),
  );
});

test('snoozeReminder invokes AI generation hook only when requested', async () => {
  const message: NotificationMessage = {
    id: 'message-1',
    userId: 'alice',
    reminderId: 'reminder-1',
    characterId: 'character-1',
    body: 'Snoozed reminder copy',
    generationStatus: 'success',
    aiModel: 'test-model',
    tokenUsage: null,
    createdAt: now,
  };
  const quota: UsageQuota = {
    id: 'quota-1',
    userId: 'alice',
    period: '2026-06',
    aiNotificationCount: 1,
    chatMessageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  let calls = 0;
  const generator: SnoozeMessageGenerator = async () => {
    calls += 1;

    return { message, quota };
  };
  const service = createService([createReminder()], generator);
  const skipped = await service.snoozeReminder({
    actor: alice,
    id: 'reminder-1',
    input: { durationMinutes: 5 },
    now,
  });
  const generated = await service.snoozeReminder({
    actor: alice,
    id: 'reminder-1',
    input: { durationMinutes: 5, generateMessage: true },
    now,
  });

  assert.equal(calls, 1);
  assert.equal(skipped.message, undefined);
  assert.equal(generated.message?.id, 'message-1');
  assert.equal(generated.quota?.aiNotificationCount, 1);
});

test('snoozeReminder does not schedule a job when reminder persistence fails', async () => {
  const notificationJobs = new InMemoryNotificationJobRepository();
  const failingReminderRepository: ReminderRepository = {
    async findById() {
      return createReminder();
    },
    async listByUser() {
      return [createReminder()];
    },
    async save() {
      throw new Error('database unavailable');
    },
  };
  const service = new SnoozeService(
    failingReminderRepository,
    new NotificationJobService(notificationJobs, () => 'job-1'),
  );

  await assert.rejects(
    () =>
      service.snoozeReminder({
        actor: alice,
        id: 'reminder-1',
        input: { durationMinutes: 5 },
        now,
      }),
    (error) => assertReminderError(error, 'REMINDER_PERSISTENCE_UNAVAILABLE'),
  );
  assert.equal(await notificationJobs.findActiveByReminderId('reminder-1'), undefined);
});

test('snoozeReminder restores the reminder when job scheduling fails', async () => {
  class FailingNotificationJobService extends NotificationJobService {
    async scheduleSnoozeJob(): Promise<NotificationJob> {
      throw new Error('queue unavailable');
    }
  }

  const reminderRepository = new InMemoryReminderRepository([createReminder()]);
  const service = new SnoozeService(
    reminderRepository,
    new FailingNotificationJobService(new InMemoryNotificationJobRepository(), () => 'job-1'),
  );

  await assert.rejects(
    () =>
      service.snoozeReminder({
        actor: alice,
        id: 'reminder-1',
        input: { durationMinutes: 5 },
        now,
      }),
    (error) => assertReminderError(error, 'REMINDER_PERSISTENCE_UNAVAILABLE'),
  );

  assert.deepEqual(await reminderRepository.findById('reminder-1'), createReminder());
});
