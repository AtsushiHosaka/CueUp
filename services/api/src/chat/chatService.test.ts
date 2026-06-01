import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FREE_PLAN_LIMITS,
  createEmptyUsageQuota,
  createEntitlementSnapshot,
  type Character,
  type ChatMessage,
  type User,
} from '@cueup/shared';

import type { AiGenerationRequest, AiGenerationResult, AiTextProvider } from '../ai/aiProvider.js';
import { CharacterCatalogService } from '../characters/characterCatalogService.js';
import { InMemoryCharacterRepository } from '../characters/characterRepository.js';
import { SEEDED_CHARACTERS } from '../characters/seedCharacters.js';
import type { Actor } from '../data/accessControl.js';
import { InMemoryUsageQuotaRepository } from '../notifications/notificationRepository.js';
import { InMemoryReminderRepository } from '../reminders/reminderRepository.js';
import { ChatServiceError } from './chatErrors.js';
import { InMemoryChatMessageRepository } from './chatRepository.js';
import { ChatService } from './chatService.js';

const now = new Date('2026-06-01T09:00:00.000Z');
const actor: Actor = {
  userId: 'user-1',
  role: 'user',
};
const user: User = {
  id: actor.userId,
  provider: 'apple',
  locale: 'ja',
  timezone: 'Asia/Tokyo',
  plan: 'free',
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

class CapturingProvider implements AiTextProvider {
  readonly prompts: string[] = [];

  constructor(private readonly result: AiGenerationResult | Error) {}

  async generateText(request: AiGenerationRequest): Promise<AiGenerationResult> {
    this.prompts.push(request.prompt);

    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }
}

function entitlement(monthlyChats = FREE_PLAN_LIMITS.monthlyChats) {
  return {
    ...createEntitlementSnapshot({
      user,
      subscriptions: [],
      characterPackPurchases: [],
      usageQuota: createEmptyUsageQuota({
        id: 'quota-snapshot',
        userId: user.id,
        period: '2026-06',
        now: now.toISOString(),
      }),
      now,
    }),
    limits: {
      ...FREE_PLAN_LIMITS,
      monthlyChats,
    },
  };
}

function createService(params: {
  provider: CapturingProvider;
  messages?: ChatMessage[];
  characters?: Character[];
  quotaCount?: number;
}) {
  let id = 1;
  const quotaRepository = new InMemoryUsageQuotaRepository(
    params.quotaCount === undefined
      ? []
      : [
          {
            id: 'quota-existing',
            userId: user.id,
            period: '2026-06',
            aiNotificationCount: 0,
            chatMessageCount: params.quotaCount,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
        ],
  );
  const messageRepository = new InMemoryChatMessageRepository(params.messages);
  const service = new ChatService(
    new CharacterCatalogService(
      new InMemoryCharacterRepository(params.characters ?? SEEDED_CHARACTERS),
      new InMemoryReminderRepository(),
    ),
    messageRepository,
    quotaRepository,
    params.provider,
    () => `generated-${id++}`,
  );

  return {
    messageRepository,
    provider: params.provider,
    quotaRepository,
    service,
  };
}

test('sendMessage stores system user and assistant messages with character voice', async () => {
  const { messageRepository, provider, service } = createService({
    provider: new CapturingProvider({
      text: 'Strict Boss: Start now. Decide the next concrete step.',
      model: 'test-chat',
    }),
  });

  const result = await service.sendMessage({
    actor,
    user,
    characterId: 'character-strict-boss',
    entitlement: entitlement(),
    input: {
      body: '企画書をリマインダーにしたい',
      createReminderDraft: true,
    },
    now,
  });
  const history = await messageRepository.listByUserAndCharacter(
    actor.userId,
    'character-strict-boss',
  );

  assert.deepEqual(
    result.messages.map((message) => message.role),
    ['system', 'user', 'assistant'],
  );
  assert.deepEqual(
    history.map((message) => message.role),
    ['system', 'user', 'assistant'],
  );
  assert.match(provider.prompts[0] ?? '', /Strict Boss/);
  assert.match(provider.prompts[0] ?? '', /strict but constructive boss/);
  assert.match(provider.prompts[0] ?? '', /企画書をリマインダーにしたい/);
  assert.equal(result.quota.chatMessageCount, 1);
  assert.equal(result.reminderDraft?.characterId, 'character-strict-boss');
  assert.equal(result.reminderDraft?.title, '企画書をリマインダーにしたい');
});

test('listMessages returns only the authenticated user character history', async () => {
  const { service } = createService({
    provider: new CapturingProvider({
      text: 'ok',
      model: 'test-chat',
    }),
    messages: [
      chatMessage({ id: 'message-owned', userId: actor.userId }),
      chatMessage({ id: 'message-other-user', userId: 'other-user' }),
      chatMessage({ id: 'message-other-character', characterId: 'character-gentle-friend' }),
    ],
  });

  const messages = await service.listMessages({
    actor,
    characterId: 'character-strict-boss',
    entitlement: entitlement(),
  });

  assert.deepEqual(
    messages.map((message) => message.id),
    ['message-owned'],
  );
});

test('sendMessage blocks after the monthly chat limit without calling AI', async () => {
  const provider = new CapturingProvider({
    text: 'should not run',
    model: 'test-chat',
  });
  const { service } = createService({
    provider,
    quotaCount: 5,
  });

  await assert.rejects(
    () =>
      service.sendMessage({
        actor,
        user,
        characterId: 'character-strict-boss',
        entitlement: entitlement(5),
        input: {
          body: 'もう一回相談したい',
        },
        now,
      }),
    (error) =>
      error instanceof ChatServiceError &&
      error.code === 'CHAT_FREE_LIMIT_EXCEEDED' &&
      error.details.upgradeTarget === 'pro',
  );
  assert.equal(provider.prompts.length, 0);
});

test('sendMessage returns provider errors without storing chat messages', async () => {
  const { messageRepository, service } = createService({
    provider: new CapturingProvider(new Error('provider down')),
  });

  await assert.rejects(
    () =>
      service.sendMessage({
        actor,
        user,
        characterId: 'character-strict-boss',
        entitlement: entitlement(),
        input: {
          body: '集中できない',
        },
        now,
      }),
    { code: 'CHAT_PROVIDER_UNAVAILABLE' },
  );

  assert.deepEqual(
    await messageRepository.listByUserAndCharacter(actor.userId, 'character-strict-boss'),
    [],
  );
});

test('sendMessage rejects unsafe user input', async () => {
  const { service } = createService({
    provider: new CapturingProvider({
      text: 'unused',
      model: 'test-chat',
    }),
  });

  await assert.rejects(
    () =>
      service.sendMessage({
        actor,
        user,
        characterId: 'character-strict-boss',
        entitlement: entitlement(),
        input: {
          body: 'kill this task',
        },
        now,
      }),
    (error) =>
      error instanceof ChatServiceError &&
      error.code === 'CHAT_VALIDATION_ERROR' &&
      error.details.reason === 'blocked_content',
  );
});

function chatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'message-1',
    userId: actor.userId,
    characterId: 'character-strict-boss',
    role: 'user',
    body: 'hello',
    createdAt: now.toISOString(),
    ...overrides,
  };
}
