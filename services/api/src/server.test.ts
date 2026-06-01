import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryReminderRepository, ReminderService } from './reminders.js';
import { routeRequest } from './server.js';

const testConfig = {
  port: 0,
  nodeEnv: 'test',
  aiProvider: 'disabled' as const,
  serverOnlyCredentialNames: ['OPENAI_API_KEY'],
};

test('GET /health returns service status', async () => {
  const response = routeRequest('GET', '/health', 'localhost', testConfig);
  const body = response.payload as { status: string; service: string };

  assert.equal(response.statusCode, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'cueup-api');
});

test('GET /v1/bootstrap returns free plan limits', async () => {
  const response = routeRequest('GET', '/v1/bootstrap', 'localhost', testConfig);
  const body = response.payload as { planLimits: { free: { activeReminders: number } } };

  assert.equal(response.statusCode, 200);
  assert.equal(body.planLimits.free.activeReminders, 20);
});

test('POST /v1/reminders creates a reminder for the authenticated user', async () => {
  const dependencies = {
    reminders: new ReminderService(new InMemoryReminderRepository(), {
      idFactory: () => 'reminder-1',
      now: () => new Date('2026-06-01T00:00:00.000Z'),
    }),
  };
  const response = routeRequest('POST', '/v1/reminders', 'localhost', testConfig, {
    actor: { userId: 'alice', role: 'user' },
    body: {
      title: 'Plan workout',
      scheduledAt: '2026-06-01T09:00:00.000Z',
      characterId: 'character-1',
    },
    dependencies,
    plan: 'free',
  });
  const body = response.payload as { reminder: { id: string; userId: string; title: string } };

  assert.equal(response.statusCode, 201);
  assert.equal(body.reminder.id, 'reminder-1');
  assert.equal(body.reminder.userId, 'alice');
  assert.equal(body.reminder.title, 'Plan workout');
});

test('GET /v1/reminders requires an authenticated user', async () => {
  const response = routeRequest('GET', '/v1/reminders', 'localhost', testConfig);
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
      {
        now: () => new Date('2026-06-01T00:00:00.000Z'),
      },
    ),
  };
  const response = routeRequest('PATCH', '/v1/reminders/reminder-1', 'localhost', testConfig, {
    actor: { userId: 'alice', role: 'user' },
    body: {
      scheduledAt: 'not-a-date',
    },
    dependencies,
  });
  const body = response.payload as { error: string; details: { field: string } };

  assert.equal(response.statusCode, 400);
  assert.equal(body.error, 'invalid_request');
  assert.equal(body.details.field, 'scheduledAt');
});
