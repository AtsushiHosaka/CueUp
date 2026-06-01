import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryNotificationJobRepository } from './notifications/notificationJobRepository.js';
import { NotificationJobService } from './notifications/notificationJobService.js';
import { InMemoryReminderRepository } from './reminders/reminderRepository.js';
import { ReminderService } from './reminders/reminderService.js';
import { SnoozeService } from './reminders/snoozeService.js';
import { routeRequest } from './server.js';

const testConfig = {
  port: 0,
  nodeEnv: 'test',
  aiProvider: 'disabled' as const,
  serverOnlyCredentialNames: ['OPENAI_API_KEY'],
};

test('GET /health returns service status', async () => {
  const response = await routeRequest('GET', '/health', 'localhost', testConfig);
  const body = response.payload as { status: string; service: string };

  assert.equal(response.statusCode, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'cueup-api');
});

test('GET /v1/bootstrap returns free plan limits', async () => {
  const response = await routeRequest('GET', '/v1/bootstrap', 'localhost', testConfig);
  const body = response.payload as { planLimits: { free: { activeReminders: number } } };

  assert.equal(response.statusCode, 200);
  assert.equal(body.planLimits.free.activeReminders, 20);
});

test('POST /v1/reminders creates a reminder for the authenticated user', async () => {
  const dependencies = {
    reminders: new ReminderService(new InMemoryReminderRepository(), () => 'reminder-1'),
  };
  const response = await routeRequest('POST', '/v1/reminders', 'localhost', testConfig, {
    actor: { userId: 'alice', role: 'user' },
    body: {
      title: 'Plan workout',
      scheduledAt: '2026-06-01T09:00:00.000Z',
      characterId: 'character-1',
    },
    dependencies,
    now: '2026-06-01T00:00:00.000Z',
    plan: 'free',
  });
  const body = response.payload as { reminder: { id: string; userId: string; title: string } };

  assert.equal(response.statusCode, 201);
  assert.equal(body.reminder.id, 'reminder-1');
  assert.equal(body.reminder.userId, 'alice');
  assert.equal(body.reminder.title, 'Plan workout');
});

test('GET /v1/reminders requires an authenticated user', async () => {
  const response = await routeRequest('GET', '/v1/reminders', 'localhost', testConfig);
  const body = response.payload as { error: string };

  assert.equal(response.statusCode, 401);
  assert.equal(body.error, 'authentication_required');
});

test('PATCH /v1/reminders/:id reports validation errors', async () => {
  const dependencies = {
    reminders: new ReminderService(
      new InMemoryReminderRepository([
        {
          id: 'reminder-1',
          userId: 'alice',
          title: 'Plan workout',
          note: null,
          scheduledAt: '2026-06-01T09:00:00.000Z',
          recurrenceRule: null,
          characterId: 'character-1',
          folderId: null,
          tagIds: [],
          status: 'active',
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ]),
      () => 'generated-1',
    ),
  };
  const response = await routeRequest(
    'PATCH',
    '/v1/reminders/reminder-1',
    'localhost',
    testConfig,
    {
      actor: { userId: 'alice', role: 'user' },
      body: {
        scheduledAt: 'not-a-date',
      },
      dependencies,
      now: '2026-06-01T00:00:00.000Z',
    },
  );
  const body = response.payload as { error: string; details: { field: string } };

  assert.equal(response.statusCode, 400);
  assert.equal(body.error, 'invalid_request');
  assert.equal(body.details.field, 'scheduledAt');
});

test('POST /v1/reminders/:id/complete returns completed and next reminder envelope', async () => {
  const dependencies = {
    reminders: new ReminderService(
      new InMemoryReminderRepository([
        {
          id: 'reminder-1',
          userId: 'alice',
          title: 'Plan workout',
          note: null,
          scheduledAt: '2026-06-01T09:00:00.000Z',
          recurrenceRule: { frequency: 'daily', interval: 1 },
          characterId: 'character-1',
          folderId: null,
          tagIds: [],
          status: 'active',
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ]),
      () => 'generated-1',
    ),
  };
  const response = await routeRequest(
    'POST',
    '/v1/reminders/reminder-1/complete',
    'localhost',
    testConfig,
    {
      actor: { userId: 'alice', role: 'user' },
      dependencies,
      now: '2026-06-01T10:00:00.000Z',
    },
  );
  const body = response.payload as {
    reminder: { id: string; status: string; completedAt: string };
    nextReminder: { id: string; scheduledAt: string };
  };

  assert.equal(response.statusCode, 200);
  assert.equal(body.reminder.id, 'reminder-1');
  assert.equal(body.reminder.status, 'completed');
  assert.equal(body.reminder.completedAt, '2026-06-01T10:00:00.000Z');
  assert.equal(body.nextReminder.id, 'generated-1');
  assert.equal(body.nextReminder.scheduledAt, '2026-06-02T09:00:00.000Z');
});

test('POST /v1/reminders/:id/snooze returns snoozed reminder and scheduled job', async () => {
  const reminderRepository = new InMemoryReminderRepository([
    {
      id: 'reminder-1',
      userId: 'alice',
      title: 'Plan workout',
      note: null,
      scheduledAt: '2026-06-01T09:00:00.000Z',
      recurrenceRule: null,
      characterId: 'character-1',
      folderId: null,
      tagIds: [],
      status: 'active',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    },
  ]);
  const dependencies = {
    reminders: new ReminderService(reminderRepository, () => 'generated-1'),
    snoozes: new SnoozeService(
      reminderRepository,
      new NotificationJobService(new InMemoryNotificationJobRepository(), () => 'job-1'),
    ),
  };
  const response = await routeRequest(
    'POST',
    '/v1/reminders/reminder-1/snooze',
    'localhost',
    testConfig,
    {
      actor: { userId: 'alice', role: 'user' },
      body: {
        durationMinutes: 10,
      },
      dependencies,
      now: '2026-06-01T09:00:00.000Z',
    },
  );
  const body = response.payload as {
    reminder: { id: string; status: string; snoozedUntil: string; snoozeCount: number };
    notificationJob: { reminderId: string; scheduledFor: string; status: string };
  };

  assert.equal(response.statusCode, 200);
  assert.equal(body.reminder.id, 'reminder-1');
  assert.equal(body.reminder.status, 'snoozed');
  assert.equal(body.reminder.snoozedUntil, '2026-06-01T09:10:00.000Z');
  assert.equal(body.reminder.snoozeCount, 1);
  assert.equal(body.notificationJob.reminderId, 'reminder-1');
  assert.equal(body.notificationJob.scheduledFor, '2026-06-01T09:10:00.000Z');
  assert.equal(body.notificationJob.status, 'scheduled');
});
