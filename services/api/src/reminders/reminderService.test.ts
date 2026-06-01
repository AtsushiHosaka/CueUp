import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyUsageQuota,
  createEntitlementSnapshot,
  type Reminder,
  type User,
} from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import { ReminderServiceError } from './reminderErrors.js';
import { InMemoryReminderRepository, type ReminderRepository } from './reminderRepository.js';
import { ReminderService } from './reminderService.js';

const now = '2026-06-01T09:00:00.000Z';
const scheduledAt = '2026-06-01T10:00:00.000Z';
const alice: Actor = { userId: 'alice', role: 'user' };
const bob: Actor = { userId: 'bob', role: 'user' };
const user: User = {
  id: alice.userId,
  provider: 'apple',
  locale: 'en',
  timezone: 'Asia/Tokyo',
  plan: 'free',
  createdAt: now,
  updatedAt: now,
};

function createEntitlement(activeReminders = 20) {
  return {
    ...createEntitlementSnapshot({
      user,
      subscriptions: [],
      characterPackPurchases: [],
      usageQuota: createEmptyUsageQuota({
        id: 'quota-1',
        userId: user.id,
        period: '2026-06',
        now,
      }),
      now: new Date(now),
    }),
    limits: {
      activeReminders,
      activeCharacters: 3,
      customCharacters: 1,
      monthlyAiNotifications: 100,
      monthlyChats: 5,
      notificationHistoryDays: 7,
    },
  };
}

function createService(initialReminders: Reminder[] = []) {
  let nextId = 1;
  const service = new ReminderService(
    new InMemoryReminderRepository(initialReminders),
    () => `generated-${nextId++}`,
  );

  return service;
}

function createReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'reminder-1',
    userId: alice.userId,
    title: 'Finish proposal',
    note: null,
    scheduledAt,
    recurrenceRule: null,
    characterId: 'character-1',
    folderId: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test('createReminder validates input and stores an owned active reminder', async () => {
  const service = createService();

  const reminder = await service.createReminder({
    actor: alice,
    entitlement: createEntitlement(),
    now,
    input: {
      title: '  Finish proposal  ',
      scheduledAt,
      characterId: 'character-1',
      tagIds: ['tag-1'],
      recurrenceRule: { frequency: 'daily', interval: 1 },
    },
  });

  assert.equal(reminder.id, 'generated-1');
  assert.equal(reminder.userId, alice.userId);
  assert.equal(reminder.title, 'Finish proposal');
  assert.equal(reminder.status, 'active');
  assert.deepEqual(reminder.tagIds, ['tag-1']);
  assert.deepEqual(reminder.recurrenceRule, { frequency: 'daily', interval: 1 });
});

test('createReminder returns upgrade metadata when free active reminder limit is reached', async () => {
  const service = createService([createReminder()]);

  await assert.rejects(
    service.createReminder({
      actor: alice,
      entitlement: createEntitlement(1),
      now,
      input: {
        title: 'Second reminder',
        scheduledAt,
        characterId: 'character-1',
      },
    }),
    (error) =>
      error instanceof ReminderServiceError &&
      error.code === 'REMINDER_FREE_LIMIT_EXCEEDED' &&
      error.details.upgradeTarget === 'pro',
  );
});

test('get/update/delete operations are limited to the owning user', async () => {
  const service = createService([createReminder()]);

  await assert.rejects(() => service.getReminder(bob, 'reminder-1'), {
    code: 'REMINDER_ACCESS_DENIED',
  });
  await assert.rejects(
    () =>
      service.updateReminder({
        actor: bob,
        id: 'reminder-1',
        now,
        input: { title: 'Other user edit' },
      }),
    { code: 'REMINDER_ACCESS_DENIED' },
  );
  await assert.rejects(() => service.deleteReminder({ actor: bob, id: 'reminder-1', now }), {
    code: 'REMINDER_ACCESS_DENIED',
  });
});

test('deleteReminder performs logical deletion and hides the reminder', async () => {
  const service = createService([createReminder()]);

  const deleted = await service.deleteReminder({ actor: alice, id: 'reminder-1', now });

  assert.equal(deleted.status, 'deleted');
  assert.equal(deleted.deletedAt, now);
  await assert.rejects(() => service.getReminder(alice, 'reminder-1'), {
    code: 'REMINDER_NOT_FOUND',
  });
});

test('completeReminder stores completedAt and creates the next recurring reminder', async () => {
  const service = createService([
    createReminder({
      recurrenceRule: { frequency: 'weekly', interval: 2 },
    }),
  ]);

  const result = await service.completeReminder({ actor: alice, id: 'reminder-1', now });

  assert.equal(result.completed.status, 'completed');
  assert.equal(result.completed.completedAt, now);
  assert.equal(result.nextReminder?.id, 'generated-1');
  assert.equal(result.nextReminder?.status, 'active');
  assert.equal(result.nextReminder?.scheduledAt, '2026-06-15T10:00:00.000Z');
});

test('listReminders excludes deleted records and sorts by scheduledAt', async () => {
  const service = createService([
    createReminder({ id: 'later', scheduledAt: '2026-06-01T12:00:00.000Z' }),
    createReminder({ id: 'deleted', deletedAt: now }),
    createReminder({ id: 'earlier', scheduledAt: '2026-06-01T09:30:00.000Z' }),
  ]);

  assert.deepEqual(
    (await service.listReminders(alice)).map((reminder) => reminder.id),
    ['earlier', 'later'],
  );
});

test('repository failures are returned as service unavailable errors', async () => {
  const failingRepository: ReminderRepository = {
    async findById() {
      throw new Error('database unavailable');
    },
    async listByUser() {
      throw new Error('database unavailable');
    },
    async save() {
      throw new Error('database unavailable');
    },
  };
  const service = new ReminderService(failingRepository, () => 'generated-1');

  await assert.rejects(() => service.listReminders(alice), {
    code: 'REMINDER_PERSISTENCE_UNAVAILABLE',
  });
});
