import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyUsageQuota,
  createEntitlementSnapshot,
  isActiveSubscription,
} from './entitlements.js';
import type { CharacterPackPurchase, Subscription, User } from './models.js';

const now = new Date('2026-06-01T00:00:00.000Z');
const user: User = {
  id: 'user-1',
  provider: 'apple',
  locale: 'en',
  timezone: 'Asia/Tokyo',
  plan: 'free',
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

test('isActiveSubscription rejects expired/refunded subscriptions and keeps canceled until expiry', () => {
  const expired: Subscription = {
    id: 'sub-1',
    userId: user.id,
    platform: 'app_store',
    productId: 'cueup.pro.monthly',
    status: 'active',
    expiresAt: '2026-05-31T23:59:59.000Z',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  assert.equal(isActiveSubscription(expired, now), false);
  assert.equal(
    isActiveSubscription(
      { ...expired, status: 'canceled', expiresAt: '2026-06-02T00:00:00.000Z' },
      now,
    ),
    true,
  );
  assert.equal(isActiveSubscription({ ...expired, status: 'refunded' }, now), false);
  assert.equal(
    isActiveSubscription({ ...expired, expiresAt: '2026-06-02T00:00:00.000Z' }, now),
    true,
  );
  assert.equal(
    isActiveSubscription({ ...expired, status: 'canceled', expiresAt: null }, now),
    false,
  );
});

test('createEntitlementSnapshot upgrades limits for an active subscription', () => {
  const usageQuota = createEmptyUsageQuota({
    id: 'quota-1',
    userId: user.id,
    period: '2026-06',
    now: now.toISOString(),
  });
  const subscription: Subscription = {
    id: 'sub-1',
    userId: user.id,
    platform: 'app_store',
    productId: 'cueup.pro.monthly',
    status: 'active',
    expiresAt: '2026-06-02T00:00:00.000Z',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const packPurchase: CharacterPackPurchase = {
    id: 'purchase-1',
    userId: user.id,
    packId: 'pack-1',
    platform: 'app_store',
    purchasedAt: now.toISOString(),
    status: 'active',
  };

  const snapshot = createEntitlementSnapshot({
    user,
    subscriptions: [subscription],
    characterPackPurchases: [
      packPurchase,
      { ...packPurchase, id: 'purchase-2', status: 'refunded' },
    ],
    usageQuota,
    now,
  });

  assert.equal(snapshot.plan, 'pro');
  assert.equal(snapshot.limits.activeReminders, 1000);
  assert.deepEqual(snapshot.activeCharacterPackIds, ['pack-1']);
  assert.equal(snapshot.usageQuota.aiNotificationCount, 0);
});
