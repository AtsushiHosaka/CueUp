import assert from 'node:assert/strict';
import test from 'node:test';

import type { DeviceToken, NotificationMessage } from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import { StaticPushProvider } from './pushProvider.js';
import { PushNotificationService } from './pushNotificationService.js';
import { InMemoryDeviceTokenRepository, InMemoryPushDeliveryRepository } from './pushRepository.js';

const now = new Date('2026-06-01T09:00:00.000Z');
const actor: Actor = {
  userId: 'user-1',
  role: 'user',
};
const message: NotificationMessage = {
  id: 'message-1',
  userId: actor.userId,
  reminderId: 'reminder-1',
  characterId: 'character-1',
  body: 'Fallback body works too',
  generationStatus: 'fallback',
  createdAt: now.toISOString(),
};

function service(params: { provider: StaticPushProvider; tokens?: DeviceToken[] }) {
  let id = 1;
  const deliveries = new InMemoryPushDeliveryRepository();
  const deviceTokens = new InMemoryDeviceTokenRepository(params.tokens);

  return {
    deliveries,
    deviceTokens,
    service: new PushNotificationService(
      params.provider,
      deviceTokens,
      deliveries,
      () => `id-${id++}`,
    ),
  };
}

test('registerDeviceToken links iOS and Android tokens to a user', async () => {
  const setup = service({
    provider: new StaticPushProvider({ status: 'sent', providerMessageId: 'provider-1' }),
  });

  const ios = await setup.service.registerDeviceToken({
    actor,
    platform: 'ios',
    token: 'apns-token',
    now: now.toISOString(),
  });
  const android = await setup.service.registerDeviceToken({
    actor,
    platform: 'android',
    token: 'fcm-token',
    now: now.toISOString(),
  });

  assert.equal(ios.userId, actor.userId);
  assert.equal(ios.status, 'active');
  assert.equal(android.platform, 'android');
});

test('sendToActiveDevices records successful push delivery for fallback messages', async () => {
  const setup = service({
    provider: new StaticPushProvider({ status: 'sent', providerMessageId: 'provider-1' }),
    tokens: [
      {
        id: 'token-1',
        userId: actor.userId,
        platform: 'ios',
        token: 'apns-token',
        status: 'active',
        lastRegisteredAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
  });

  const deliveries = await setup.service.sendToActiveDevices({
    actor,
    notificationMessage: message,
    character: { name: 'Strict Boss', iconUrl: 'https://example.com/icon.png' },
    now,
  });

  assert.equal(deliveries[0]?.status, 'sent');
  assert.equal(deliveries[0]?.providerMessageId, 'provider-1');
});

test('sendToActiveDevices records permission denied without invalidating token', async () => {
  const setup = service({
    provider: new StaticPushProvider({
      status: 'permission_denied',
      reason: 'notifications disabled',
    }),
    tokens: [
      {
        id: 'token-1',
        userId: actor.userId,
        platform: 'android',
        token: 'fcm-token',
        status: 'active',
        lastRegisteredAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
  });

  const deliveries = await setup.service.sendToActiveDevices({
    actor,
    notificationMessage: message,
    character: { name: 'Gentle Friend' },
    now,
  });

  assert.equal(deliveries[0]?.status, 'permission_denied');
  assert.equal((await setup.deviceTokens.listActiveByUser(actor.userId)).length, 1);
});

test('sendToActiveDevices invalidates provider-rejected tokens and skips them later', async () => {
  const setup = service({
    provider: new StaticPushProvider({ status: 'invalid_token', reason: 'unregistered' }),
    tokens: [
      {
        id: 'token-1',
        userId: actor.userId,
        platform: 'ios',
        token: 'stale-token',
        status: 'active',
        lastRegisteredAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
  });

  const deliveries = await setup.service.sendToActiveDevices({
    actor,
    notificationMessage: message,
    character: { name: 'Strict Boss' },
    now,
  });

  assert.equal(deliveries[0]?.status, 'failed');
  assert.equal((await setup.deviceTokens.listActiveByUser(actor.userId)).length, 0);
});

test('sendToActiveDevices records retry metadata for transient provider failures', async () => {
  const retryAfter = new Date('2026-06-01T09:05:00.000Z');
  const setup = service({
    provider: new StaticPushProvider({ status: 'failed', reason: 'apns unavailable', retryAfter }),
    tokens: [
      {
        id: 'token-1',
        userId: actor.userId,
        platform: 'ios',
        token: 'apns-token',
        status: 'active',
        lastRegisteredAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
  });

  const deliveries = await setup.service.sendToActiveDevices({
    actor,
    notificationMessage: message,
    character: { name: 'Strict Boss' },
    now,
  });

  assert.equal(deliveries[0]?.status, 'failed');
  assert.equal(deliveries[0]?.retryAfter, retryAfter.toISOString());
});
