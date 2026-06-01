import assert from 'node:assert/strict';
import test from 'node:test';

import type { EntitlementSnapshot, NotificationMessage } from '@cueup/shared';
import { FREE_PLAN_LIMITS, PRO_PLAN_LIMITS } from '@cueup/shared';

import { NotificationHistoryService } from './notificationHistoryService.js';
import { NotificationHistoryServiceError } from './notificationHistoryErrors.js';
import { InMemoryNotificationMessageRepository } from './notificationRepository.js';

const now = new Date('2026-06-01T12:00:00.000Z');
const actor = {
  userId: 'user-1',
  role: 'user' as const,
};

const freeEntitlement: EntitlementSnapshot = {
  userId: actor.userId,
  plan: 'free',
  limits: FREE_PLAN_LIMITS,
  activeCharacterPackIds: [],
  usageQuota: {
    id: 'quota-1',
    userId: actor.userId,
    period: '2026-06',
    aiNotificationCount: 0,
    chatMessageCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
};

const proEntitlement: EntitlementSnapshot = {
  ...freeEntitlement,
  plan: 'pro',
  limits: PRO_PLAN_LIMITS,
};

test('listHistory returns visible user messages newest first with screen fields', async () => {
  const service = new NotificationHistoryService(
    new InMemoryNotificationMessageRepository([
      createMessage({
        id: 'message-old',
        createdAt: '2026-05-31T12:00:00.000Z',
        sentAt: '2026-05-31T12:01:00.000Z',
      }),
      createMessage({
        id: 'message-other-user',
        userId: 'user-2',
        createdAt: '2026-06-01T12:00:00.000Z',
      }),
      createMessage({
        id: 'message-hidden',
        createdAt: '2026-06-01T11:00:00.000Z',
        hiddenAt: '2026-06-01T11:30:00.000Z',
      }),
      createMessage({
        id: 'message-new',
        body: 'Strict Boss: 今やる。',
        generationStatus: 'success',
        createdAt: '2026-06-01T12:00:00.000Z',
      }),
    ]),
  );

  const result = await service.listHistory({
    actor,
    entitlement: freeEntitlement,
    now,
  });

  assert.deepEqual(
    result.items.map((item) => item.id),
    ['message-new', 'message-old'],
  );
  assert.equal(result.items[0]?.body, 'Strict Boss: 今やる。');
  assert.equal(result.items[0]?.generationStatus, 'success');
  assert.equal(result.items[1]?.sentAt, '2026-05-31T12:01:00.000Z');
});

test('listHistory applies free retention and leaves pro history unbounded', async () => {
  const service = new NotificationHistoryService(
    new InMemoryNotificationMessageRepository([
      createMessage({
        id: 'message-recent',
        createdAt: '2026-05-28T12:00:00.000Z',
      }),
      createMessage({
        id: 'message-expired',
        createdAt: '2026-05-20T12:00:00.000Z',
      }),
    ]),
  );

  const freeResult = await service.listHistory({
    actor,
    entitlement: freeEntitlement,
    now,
  });
  const proResult = await service.listHistory({
    actor,
    entitlement: proEntitlement,
    now,
  });

  assert.deepEqual(
    freeResult.items.map((item) => item.id),
    ['message-recent'],
  );
  assert.equal(freeResult.retentionStartedAt, '2026-05-25T12:00:00.000Z');
  assert.deepEqual(
    proResult.items.map((item) => item.id),
    ['message-recent', 'message-expired'],
  );
  assert.equal(proResult.retentionStartedAt, null);
});

test('listHistory returns the localized empty state message', async () => {
  const service = new NotificationHistoryService(new InMemoryNotificationMessageRepository());
  const result = await service.listHistory({
    actor,
    entitlement: freeEntitlement,
    now,
  });

  assert.deepEqual(result.items, []);
  assert.equal(result.emptyStateMessage, 'まだ通知履歴がありません');
});

test('hideMessage marks owned messages hidden and removes them from history', async () => {
  const repository = new InMemoryNotificationMessageRepository([
    createMessage({ id: 'message-1' }),
  ]);
  const service = new NotificationHistoryService(repository);

  const hidden = await service.hideMessage({
    actor,
    id: 'message-1',
    now: now.toISOString(),
  });
  const result = await service.listHistory({
    actor,
    entitlement: freeEntitlement,
    now,
  });

  assert.equal(hidden.hiddenAt, now.toISOString());
  assert.deepEqual(result.items, []);
});

test('hideMessage rejects missing and other-user messages', async () => {
  const service = new NotificationHistoryService(
    new InMemoryNotificationMessageRepository([
      createMessage({
        id: 'message-other-user',
        userId: 'user-2',
      }),
    ]),
  );

  await assert.rejects(
    service.hideMessage({
      actor,
      id: 'message-missing',
      now: now.toISOString(),
    }),
    (error) =>
      error instanceof NotificationHistoryServiceError &&
      error.code === 'NOTIFICATION_HISTORY_NOT_FOUND',
  );
  await assert.rejects(
    service.hideMessage({
      actor,
      id: 'message-other-user',
      now: now.toISOString(),
    }),
    (error) =>
      error instanceof NotificationHistoryServiceError &&
      error.code === 'NOTIFICATION_HISTORY_ACCESS_DENIED',
  );
});

function createMessage(overrides: Partial<NotificationMessage> = {}): NotificationMessage {
  return {
    id: 'message-1',
    userId: actor.userId,
    reminderId: 'reminder-1',
    characterId: 'character-1',
    body: 'Strict Boss: 企画書の時間です。',
    generationStatus: 'fallback',
    sentAt: null,
    completedAt: null,
    aiModel: null,
    tokenUsage: null,
    createdAt: '2026-06-01T09:00:00.000Z',
    ...overrides,
  };
}
