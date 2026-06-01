import assert from 'node:assert/strict';
import test from 'node:test';

import type { Reminder } from '@cueup/shared';

import type { Actor } from './data/accessControl.js';
import {
  InMemoryReminderRepository,
  ReminderService,
  ReminderServiceError,
  calculateNextScheduledAt,
  type ReminderRepository,
} from './reminders.js';

const alice: Actor = { userId: 'alice', role: 'user' };
const bob: Actor = { userId: 'bob', role: 'user' };
const now = '2026-06-01T00:00:00.000Z';

function createReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'reminder-1',
    userId: 'alice',
    title: 'Finish proposal',
    note: null,
    scheduledAt: '2026-06-01T09:00:00.000Z',
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

function createService(seedReminders: readonly Reminder[] = [], serviceNow = now): ReminderService {
  const ids = ['generated-1', 'generated-2'];

  return new ReminderService(new InMemoryReminderRepository(seedReminders), {
    idFactory: () => ids.shift() ?? 'generated-fallback',
    now: () => new Date(serviceNow),
  });
}

function assertReminderError(error: unknown, code: ReminderServiceError['code']): boolean {
  assert.ok(error instanceof ReminderServiceError);
  assert.equal(error.code, code);

  return true;
}

test('creates, lists, and reads reminders for the owning user only', () => {
  const service = createService([createReminder({ id: 'bob-reminder', userId: 'bob' })]);
  const reminder = service.create(alice, 'free', {
    title: '  finish   proposal  ',
    note: '',
    scheduledAt: '2026-06-01T01:00:00.000Z',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    characterId: 'character-1',
    folderId: 'folder-1',
    tagIds: ['tag-1', 'tag-2'],
  });

  assert.equal(reminder.id, 'generated-1');
  assert.equal(reminder.title, 'finish proposal');
  assert.equal(reminder.note, null);
  assert.equal(reminder.status, 'active');
  assert.deepEqual(reminder.recurrenceRule, {
    frequency: 'daily',
    interval: 1,
    until: null,
  });
  assert.deepEqual(
    service.list(alice).map((listedReminder) => listedReminder.id),
    ['generated-1'],
  );
  assert.equal(service.get(alice, 'generated-1').folderId, 'folder-1');
});

test('rejects invalid create and update input', () => {
  const service = createService([createReminder()]);

  assert.throws(
    () =>
      service.create(alice, 'free', {
        title: 'Bad date',
        scheduledAt: 'not-a-date',
        characterId: 'character-1',
      }),
    (error) => assertReminderError(error, 'VALIDATION_ERROR'),
  );
  assert.throws(
    () =>
      service.update(alice, 'reminder-1', {
        tagIds: 'tag-1',
      }),
    (error) => assertReminderError(error, 'VALIDATION_ERROR'),
  );
  assert.throws(
    () =>
      service.update(alice, 'reminder-1', {
        status: 'deleted',
      }),
    (error) => assertReminderError(error, 'VALIDATION_ERROR'),
  );
});

test('enforces access checks, not found, and soft deletion', () => {
  const service = createService([createReminder()]);

  assert.throws(
    () => service.get(bob, 'reminder-1'),
    (error) => assertReminderError(error, 'ACCESS_DENIED'),
  );
  assert.throws(
    () => service.get(alice, 'missing'),
    (error) => assertReminderError(error, 'RECORD_NOT_FOUND'),
  );

  const deleted = service.delete(alice, 'reminder-1');

  assert.equal(deleted.status, 'deleted');
  assert.equal(deleted.deletedAt, now);
  assert.throws(
    () => service.get(alice, 'reminder-1'),
    (error) => assertReminderError(error, 'RECORD_NOT_FOUND'),
  );
});

test('returns upgrade details when a free user reaches the active reminder limit', () => {
  const reminders = Array.from({ length: 20 }, (_, index) =>
    createReminder({
      id: `reminder-${index}`,
      scheduledAt: `2026-06-${String(index + 2).padStart(2, '0')}T09:00:00.000Z`,
    }),
  );
  const service = createService(reminders);

  assert.throws(
    () =>
      service.create(alice, 'free', {
        title: 'Another reminder',
        scheduledAt: '2026-07-01T09:00:00.000Z',
        characterId: 'character-1',
      }),
    (error) => {
      assertReminderError(error, 'FREE_PLAN_LIMIT_REACHED');
      assert.deepEqual((error as ReminderServiceError).details.upgrade, {
        requiredPlan: 'pro',
      });

      return true;
    },
  );
});

test('completes recurring reminders and creates the next scheduled reminder', () => {
  const service = createService(
    [
      createReminder({
        recurrenceRule: {
          frequency: 'daily',
          interval: 2,
          until: null,
        },
      }),
    ],
    '2026-06-03T10:00:00.000Z',
  );
  const result = service.complete(alice, 'reminder-1');

  assert.equal(result.completed.status, 'completed');
  assert.equal(result.completed.completedAt, '2026-06-03T10:00:00.000Z');
  assert.equal(result.nextReminder?.id, 'generated-1');
  assert.equal(result.nextReminder?.status, 'active');
  assert.equal(result.nextReminder?.scheduledAt, '2026-06-05T09:00:00.000Z');
});

test('stops recurring reminders when the next occurrence is beyond until', () => {
  assert.equal(
    calculateNextScheduledAt(
      '2026-06-01T09:00:00.000Z',
      {
        frequency: 'daily',
        interval: 1,
        until: '2026-06-01T23:59:59.000Z',
      },
      '2026-06-01T10:00:00.000Z',
    ),
    null,
  );
});

test('converts repository failures into service unavailable errors', () => {
  const failingRepository: ReminderRepository = {
    listAll() {
      throw new Error('database is down');
    },
    getById() {
      throw new Error('database is down');
    },
    save() {
      throw new Error('database is down');
    },
  };
  const service = new ReminderService(failingRepository);

  assert.throws(
    () => service.list(alice),
    (error) => assertReminderError(error, 'PERSISTENCE_UNAVAILABLE'),
  );
});
