import assert from 'node:assert/strict';
import test from 'node:test';

import { StaticAiTextProvider } from './ai/aiProvider.js';
import { InMemoryBillingRepository } from './billing/billingRepository.js';
import { BillingService } from './billing/billingService.js';
import type { VerifiedBillingTransaction } from './billing/billingVerifier.js';
import { InMemoryChatMessageRepository } from './chat/chatRepository.js';
import { ChatService } from './chat/chatService.js';
import { CharacterCatalogService } from './characters/characterCatalogService.js';
import { InMemoryCharacterRepository } from './characters/characterRepository.js';
import { CustomCharacterService } from './characters/customCharacterService.js';
import { InMemoryNotificationJobRepository } from './notifications/notificationJobRepository.js';
import { NotificationJobService } from './notifications/notificationJobService.js';
import { InMemoryUsageQuotaRepository } from './notifications/notificationRepository.js';
import { InMemoryObservabilitySink } from './observability/observabilitySink.js';
import { ObservabilityService } from './observability/observabilityService.js';
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
  billingVerificationEnabled: false,
  billingProducts: [
    {
      id: 'pro-ios',
      displayName: 'CueUp Pro',
      kind: 'pro_subscription' as const,
      platform: 'app_store' as const,
      priceLabel: '$4.99/mo',
      productId: 'cueup.pro.monthly',
    },
    {
      id: 'pack-ios',
      displayName: 'Focus Pack',
      kind: 'character_pack' as const,
      packId: 'focus-pack',
      platform: 'app_store' as const,
      priceLabel: '$1.99',
      productId: 'cueup.pack.focus',
    },
  ],
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
  const observabilitySink = new InMemoryObservabilitySink();
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
      observability: new ObservabilityService(observabilitySink, () => `observability-${id++}`),
      reminders: new ReminderService(reminderRepository, () => 'reminder-1'),
    },
    observabilitySink,
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

test('GET /v1/billing/products returns configured store products', async () => {
  const dependencies = {
    billing: new BillingService(
      new InMemoryBillingRepository(),
      verifier(),
      () => 'quota-1',
      testConfig.billingProducts,
    ),
    reminders: new ReminderService(new InMemoryReminderRepository(), () => 'reminder-1'),
  };
  const response = await routeRequest('GET', '/v1/billing/products', 'localhost', testConfig, {
    dependencies,
  });
  const body = response.payload as { products: Array<{ productId: string; priceLabel: string }> };

  assert.equal(response.statusCode, 200);
  assert.equal(body.products[0]?.productId, 'cueup.pro.monthly');
  assert.equal(body.products[0]?.priceLabel, '$4.99/mo');
});

test('GET /v1/reminders uses default dependencies without billing configured', async () => {
  const response = await routeRequest('GET', '/v1/reminders', 'localhost', testConfig, {
    actor: { userId: 'alice', role: 'user' },
    now: '2026-06-01T00:00:00.000Z',
  });
  const body = response.payload as { reminders: unknown[] };

  assert.equal(response.statusCode, 200);
  assert.deepEqual(body.reminders, []);
});

test('POST /v1/billing/verify rejects unverified receipts', async () => {
  const dependencies = {
    billing: new BillingService(
      new InMemoryBillingRepository(),
      {
        async verify() {
          throw new Error('store rejected');
        },
      },
      () => 'quota-1',
      testConfig.billingProducts,
    ),
    reminders: new ReminderService(new InMemoryReminderRepository(), () => 'reminder-1'),
  };
  const response = await routeRequest('POST', '/v1/billing/verify', 'localhost', testConfig, {
    actor: { userId: 'alice', role: 'user' },
    body: {
      platform: 'app_store',
      productId: 'cueup.pro.monthly',
      receipt: 'client-assertion-only',
    },
    dependencies,
    now: '2026-06-01T00:00:00.000Z',
  });
  const body = response.payload as { error: string; details: { restoreAction: string } };

  assert.equal(response.statusCode, 402);
  assert.equal(body.error, 'billing_verification_failed');
  assert.equal(body.details.restoreAction, 'restore_purchases');
});

test('POST /v1/billing/verify grants Pro after verified store transaction', async () => {
  const dependencies = {
    billing: new BillingService(
      new InMemoryBillingRepository(),
      verifier({
        kind: 'pro_subscription',
        platform: 'app_store',
        productId: 'cueup.pro.monthly',
        status: 'active',
        transactionId: 'txn-1',
        purchasedAt: '2026-06-01T00:00:00.000Z',
        expiresAt: '2026-07-01T00:00:00.000Z',
      }),
      () => 'quota-1',
      testConfig.billingProducts,
    ),
    reminders: new ReminderService(new InMemoryReminderRepository(), () => 'reminder-1'),
  };
  const response = await routeRequest('POST', '/v1/billing/verify', 'localhost', testConfig, {
    actor: { userId: 'alice', role: 'user' },
    body: {
      platform: 'app_store',
      productId: 'cueup.pro.monthly',
      receipt: 'store-receipt',
    },
    dependencies,
    now: '2026-06-01T00:00:00.000Z',
  });
  const body = response.payload as {
    entitlement: { plan: string; limits: { activeReminders: number } };
    subscription: { status: string };
  };

  assert.equal(response.statusCode, 200);
  assert.equal(body.subscription.status, 'active');
  assert.equal(body.entitlement.plan, 'pro');
  assert.equal(body.entitlement.limits.activeReminders, 1000);
});

test('POST /v1/billing/usage maps Free quota limit errors', async () => {
  const dependencies = {
    billing: new BillingService(
      new InMemoryBillingRepository({
        quotas: [
          {
            id: 'quota-1',
            userId: 'alice',
            period: '2026-06',
            aiNotificationCount: 0,
            chatMessageCount: 5,
            createdAt: '2026-06-01T00:00:00.000Z',
            updatedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      }),
      verifier(),
      () => 'quota-2',
      testConfig.billingProducts,
    ),
    reminders: new ReminderService(new InMemoryReminderRepository(), () => 'reminder-1'),
  };
  const response = await routeRequest('POST', '/v1/billing/usage', 'localhost', testConfig, {
    actor: { userId: 'alice', role: 'user' },
    body: {
      kind: 'chat_message',
    },
    dependencies,
    now: '2026-06-01T00:00:00.000Z',
  });
  const body = response.payload as { error: string; details: { upgradeTarget: string } };

  assert.equal(response.statusCode, 402);
  assert.equal(body.error, 'plan_limit_exceeded');
  assert.equal(body.details.upgradeTarget, 'pro');
});

test('GET /v1/reminders uses default dependencies when billing is not configured', async () => {
  const response = await routeRequest(
    'GET',
    '/v1/reminders',
    'localhost',
    {
      ...testConfig,
      billingProducts: [],
    },
    {
      actor: { userId: 'alice', role: 'user' },
      now: '2026-06-01T00:00:00.000Z',
      plan: 'free',
    },
  );
  const body = response.payload as { reminders: unknown[] };

  assert.equal(response.statusCode, 200);
  assert.equal(Array.isArray(body.reminders), true);
});

test('POST /v1/chats/:characterId/messages stores a character chat exchange', async () => {
  const { dependencies, observabilitySink } = createChatDependencies();
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
  assert.equal(observabilitySink.analyticsEvents[0]?.eventType, 'chat_message_sent');
  assert.equal(observabilitySink.analyticsEvents[0]?.context.characterId, 'character-strict-boss');
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
  const { dependencies, observabilitySink } = createChatDependencies({ chatMessageCount: 5 });
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
  assert.equal(observabilitySink.analyticsEvents[0]?.eventType, 'free_limit_reached');
  assert.equal(observabilitySink.analyticsEvents[0]?.context.feature, 'chat');
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

function verifier(transaction?: VerifiedBillingTransaction) {
  return {
    async verify() {
      if (transaction === undefined) {
        throw new Error('not configured for this test');
      }

      return transaction;
    },
  };
}
