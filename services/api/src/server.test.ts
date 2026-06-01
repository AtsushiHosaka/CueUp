import assert from 'node:assert/strict';
import test from 'node:test';

import { StaticAiTextProvider } from './ai/aiProvider.js';
import { InMemoryChatMessageRepository } from './chat/chatRepository.js';
import { ChatService } from './chat/chatService.js';
import { CharacterCatalogService } from './characters/characterCatalogService.js';
import { InMemoryCharacterRepository } from './characters/characterRepository.js';
import { CustomCharacterService } from './characters/customCharacterService.js';
import { InMemoryNotificationJobRepository } from './notifications/notificationJobRepository.js';
import { NotificationJobService } from './notifications/notificationJobService.js';
import { InMemoryUsageQuotaRepository } from './notifications/notificationRepository.js';
import { InMemoryOrganizerRepository } from './organizer/organizerRepository.js';
import { OrganizerService } from './organizer/organizerService.js';
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

function createChatDependencies(
  params: {
    provider?: StaticAiTextProvider;
    chatMessageCount?: number;
  } = {},
) {
  let id = 1;
  const reminderRepository = new InMemoryReminderRepository();
  const chatMessages = new InMemoryChatMessageRepository();
  const quotas = new InMemoryUsageQuotaRepository(
    params.chatMessageCount === undefined
      ? []
      : [
          {
            id: 'quota-existing',
            userId: 'alice',
            period: '2026-06',
            aiNotificationCount: 0,
            chatMessageCount: params.chatMessageCount,
            createdAt: '2026-06-01T00:00:00.000Z',
            updatedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
  );

  return {
    chatMessages,
    dependencies: {
      chat: new ChatService(
        new CharacterCatalogService(new InMemoryCharacterRepository(), reminderRepository),
        chatMessages,
        quotas,
        params.provider ??
          new StaticAiTextProvider({
            text: 'Strict Boss: Start now. Pick the next concrete step.',
            model: 'test-chat',
          }),
        () => `chat-${id++}`,
      ),
      reminders: new ReminderService(reminderRepository, () => 'reminder-1'),
    },
    quotas,
  };
}

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

test('POST /v1/chats/:characterId/messages stores a character chat exchange', async () => {
  const { dependencies } = createChatDependencies();
  const response = await routeRequest(
    'POST',
    '/v1/chats/character-strict-boss/messages',
    'localhost',
    testConfig,
    {
      actor: { userId: 'alice', role: 'user' },
      body: {
        body: '企画書を明日の朝に思い出したい',
        createReminderDraft: true,
      },
      dependencies,
      now: '2026-06-01T09:00:00.000Z',
      plan: 'free',
    },
  );
  const body = response.payload as {
    messages: Array<{ role: string; body: string }>;
    quota: { chatMessageCount: number };
    reminderDraft: { characterId: string; title: string };
  };

  assert.equal(response.statusCode, 201);
  assert.deepEqual(
    body.messages.map((message) => message.role),
    ['system', 'user', 'assistant'],
  );
  assert.equal(body.messages[2]?.body, 'Strict Boss: Start now. Pick the next concrete step.');
  assert.equal(body.quota.chatMessageCount, 1);
  assert.equal(body.reminderDraft.characterId, 'character-strict-boss');
  assert.equal(body.reminderDraft.title, '企画書を明日の朝に思い出したい');
});

test('GET /v1/chats/:characterId/messages returns owned chat history', async () => {
  const { dependencies } = createChatDependencies();

  await routeRequest('POST', '/v1/chats/character-strict-boss/messages', 'localhost', testConfig, {
    actor: { userId: 'alice', role: 'user' },
    body: {
      body: '集中したい',
    },
    dependencies,
    now: '2026-06-01T09:00:00.000Z',
    plan: 'free',
  });

  const response = await routeRequest(
    'GET',
    '/v1/chats/character-strict-boss/messages',
    'localhost',
    testConfig,
    {
      actor: { userId: 'alice', role: 'user' },
      dependencies,
      now: '2026-06-01T09:01:00.000Z',
      plan: 'free',
    },
  );
  const body = response.payload as { messages: Array<{ role: string }> };

  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    body.messages.map((message) => message.role),
    ['system', 'user', 'assistant'],
  );
});

test('POST /v1/chats/:characterId/messages blocks free monthly chat limit', async () => {
  const { dependencies } = createChatDependencies({ chatMessageCount: 5 });
  const response = await routeRequest(
    'POST',
    '/v1/chats/character-strict-boss/messages',
    'localhost',
    testConfig,
    {
      actor: { userId: 'alice', role: 'user' },
      body: {
        body: 'もう一回相談したい',
      },
      dependencies,
      now: '2026-06-01T09:00:00.000Z',
      plan: 'free',
    },
  );
  const body = response.payload as { error: string; details: { upgradeTarget: string } };

  assert.equal(response.statusCode, 402);
  assert.equal(body.error, 'plan_limit_exceeded');
  assert.equal(body.details.upgradeTarget, 'pro');
});

test('POST /v1/chats/:characterId/messages reports AI failures to the UI', async () => {
  const { dependencies } = createChatDependencies({
    provider: new StaticAiTextProvider(new Error('provider down')),
  });
  const response = await routeRequest(
    'POST',
    '/v1/chats/character-strict-boss/messages',
    'localhost',
    testConfig,
    {
      actor: { userId: 'alice', role: 'user' },
      body: {
        body: '集中できない',
      },
      dependencies,
      now: '2026-06-01T09:00:00.000Z',
      plan: 'free',
    },
  );
  const body = response.payload as { error: string };

  assert.equal(response.statusCode, 503);
  assert.equal(body.error, 'ai_unavailable');
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

test('POST /v1/reminders/:id/snooze fails fast when snooze dependencies are missing', async () => {
  const dependencies = {
    reminders: new ReminderService(new InMemoryReminderRepository(), () => 'generated-1'),
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
  const body = response.payload as { error: string };

  assert.equal(response.statusCode, 500);
  assert.equal(body.error, 'internal_error');
});

test('GET /v1/folders requires an authenticated user', async () => {
  const response = await routeRequest('GET', '/v1/folders', 'localhost', testConfig);
  const body = response.payload as { error: string };

  assert.equal(response.statusCode, 401);
  assert.equal(body.error, 'authentication_required');
});

test('POST /v1/folders creates a folder for the authenticated user', async () => {
  const reminderRepository = new InMemoryReminderRepository();
  const dependencies = {
    organizer: new OrganizerService(
      new InMemoryOrganizerRepository(),
      reminderRepository,
      () => 'folder-1',
    ),
    reminders: new ReminderService(reminderRepository, () => 'generated-1'),
  };
  const response = await routeRequest('POST', '/v1/folders', 'localhost', testConfig, {
    actor: { userId: 'alice', role: 'user' },
    body: {
      name: ' Work ',
      color: '#335C67',
    },
    dependencies,
    now: '2026-06-01T00:00:00.000Z',
    plan: 'free',
  });
  const body = response.payload as { folder: { id: string; userId: string; name: string } };

  assert.equal(response.statusCode, 201);
  assert.equal(body.folder.id, 'folder-1');
  assert.equal(body.folder.userId, 'alice');
  assert.equal(body.folder.name, 'Work');
});

test('PUT /v1/reminders/:id/tags assigns tags used by smart lists', async () => {
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
    organizer: new OrganizerService(
      new InMemoryOrganizerRepository({
        tags: [
          {
            id: 'tag-work',
            userId: 'alice',
            name: '仕事',
            color: null,
            createdAt: '2026-06-01T00:00:00.000Z',
            updatedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      }),
      reminderRepository,
      () => 'organizer-1',
    ),
    reminders: new ReminderService(reminderRepository, () => 'generated-1'),
  };

  const assignResponse = await routeRequest(
    'PUT',
    '/v1/reminders/reminder-1/tags',
    'localhost',
    testConfig,
    {
      actor: { userId: 'alice', role: 'user' },
      body: {
        tagIds: ['tag-work'],
      },
      dependencies,
      now: '2026-06-01T01:00:00.000Z',
    },
  );
  const smartListResponse = await routeRequest(
    'GET',
    '/v1/smart-lists/work',
    'localhost',
    testConfig,
    {
      actor: { userId: 'alice', role: 'user' },
      dependencies,
      now: '2026-06-01T00:00:00.000Z',
    },
  );
  const smartListBody = smartListResponse.payload as { reminders: Array<{ id: string }> };

  assert.equal(assignResponse.statusCode, 200);
  assert.equal(
    (await reminderRepository.findById('reminder-1'))?.updatedAt,
    '2026-06-01T01:00:00.000Z',
  );
  assert.equal(smartListResponse.statusCode, 200);
  assert.deepEqual(
    smartListBody.reminders.map((reminder) => reminder.id),
    ['reminder-1'],
  );
});

test('POST /v1/characters/custom creates an owner-scoped custom character', async () => {
  const dependencies = {
    reminders: new ReminderService(new InMemoryReminderRepository(), () => 'reminder-1'),
    characters: new CustomCharacterService(new InMemoryCharacterRepository(), () => 'custom-1'),
  };
  const response = await routeRequest('POST', '/v1/characters/custom', 'localhost', testConfig, {
    actor: { userId: 'alice', role: 'user' },
    body: {
      name: 'Deadline Navigator',
      relationship: 'accountability partner',
      tone: 'direct but kind',
      strictness: 7,
      warmth: 6,
      catchphrases: ['Next small step'],
      prohibitedStyle: ['personal insults'],
      iconUrl: 'https://example.com/icon.png',
    },
    dependencies,
    now: '2026-06-01T00:00:00.000Z',
    plan: 'free',
  });
  const body = response.payload as {
    character: { id: string; ownerUserId: string; personaPrompt: string };
  };

  assert.equal(response.statusCode, 201);
  assert.equal(body.character.id, 'custom-1');
  assert.equal(body.character.ownerUserId, 'alice');
  assert.equal(body.character.personaPrompt.includes('Deadline Navigator'), true);
});

test('PATCH /v1/characters/custom/:id maps safety review errors', async () => {
  const repository = new InMemoryCharacterRepository([
    {
      id: 'custom-1',
      ownerUserId: 'alice',
      type: 'custom',
      name: 'Deadline Navigator',
      relationship: 'accountability partner',
      tone: 'direct but kind',
      personaPrompt: 'Original fictional character: Deadline Navigator',
      strictness: 7,
      warmth: 6,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    },
  ]);
  const dependencies = {
    reminders: new ReminderService(new InMemoryReminderRepository(), () => 'reminder-1'),
    characters: new CustomCharacterService(repository, () => 'unused'),
  };
  const response = await routeRequest(
    'PATCH',
    '/v1/characters/custom/custom-1',
    'localhost',
    testConfig,
    {
      actor: { userId: 'alice', role: 'user' },
      body: {
        tone: 'Taylor Swift style',
      },
      dependencies,
      now: '2026-06-01T00:00:00.000Z',
    },
  );
  const body = response.payload as { error: string; details: { reason: string } };

  assert.equal(response.statusCode, 422);
  assert.equal(body.error, 'safety_review_required');
  assert.equal(body.details.reason, 'real_person_reference');
});
