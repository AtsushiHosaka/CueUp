import assert from 'node:assert/strict';
import test from 'node:test';

import type { VerifiedBillingTransaction } from './billingVerifier.js';
import { InMemoryBillingRepository } from './billingRepository.js';
import { BillingService } from './billingService.js';

const now = new Date('2026-06-01T00:00:00.000Z');
const actor = { userId: 'alice', role: 'user' as const };
const user = {
  id: actor.userId,
  provider: 'email' as const,
  locale: 'en',
  timezone: 'UTC',
  plan: 'free' as const,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};
const products = [
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
];

test('verifyPurchase grants Pro only after server-side receipt verification', async () => {
  const service = new BillingService(
    new InMemoryBillingRepository(),
    verifier({
      kind: 'pro_subscription',
      platform: 'app_store',
      productId: 'cueup.pro.monthly',
      status: 'active',
      transactionId: 'txn-1',
      purchasedAt: now.toISOString(),
      expiresAt: '2026-07-01T00:00:00.000Z',
    }),
    () => 'quota-1',
    products,
  );

  const failed = new BillingService(
    new InMemoryBillingRepository(),
    {
      async verify() {
        throw new Error('store rejected');
      },
    },
    () => 'quota-2',
    products,
  );

  await assert.rejects(
    () =>
      failed.verifyPurchase({
        actor,
        input: {
          platform: 'app_store',
          productId: 'cueup.pro.monthly',
          receipt: 'client-assertion-only',
        },
        now,
        user,
      }),
    /Purchase could not be verified/,
  );

  const result = await service.verifyPurchase({
    actor,
    input: {
      platform: 'app_store',
      productId: 'cueup.pro.monthly',
      receipt: 'store-receipt',
    },
    now,
    user,
  });

  assert.equal(result.subscription?.status, 'active');
  assert.equal(result.entitlement.plan, 'pro');
  assert.equal(result.entitlement.limits.activeReminders, 1000);
});

test('getEntitlementSnapshot returns Free after subscription expiry', async () => {
  const service = new BillingService(
    new InMemoryBillingRepository({
      subscriptions: [
        {
          id: 'sub-1',
          userId: actor.userId,
          platform: 'app_store',
          productId: 'cueup.pro.monthly',
          status: 'active',
          expiresAt: '2026-05-31T23:59:59.000Z',
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    }),
    verifier(),
    () => 'quota-1',
    products,
  );

  const entitlement = await service.getEntitlementSnapshot({ actor, user, now });

  assert.equal(entitlement.plan, 'free');
  assert.equal(entitlement.activeSubscription, undefined);
});

test('verifyPurchase enables and refunds character packs', async () => {
  const repository = new InMemoryBillingRepository();
  const service = new BillingService(
    repository,
    verifier({
      kind: 'character_pack',
      packId: 'focus-pack',
      platform: 'app_store',
      productId: 'cueup.pack.focus',
      status: 'active',
      transactionId: 'pack-txn-1',
      purchasedAt: now.toISOString(),
    }),
    () => 'quota-1',
    products,
  );

  const active = await service.verifyPurchase({
    actor,
    input: {
      platform: 'app_store',
      productId: 'cueup.pack.focus',
      receipt: 'store-receipt',
    },
    now,
    user,
  });

  assert.deepEqual(active.entitlement.activeCharacterPackIds, ['focus-pack']);

  const refundService = new BillingService(
    repository,
    verifier({
      kind: 'character_pack',
      packId: 'focus-pack',
      platform: 'app_store',
      productId: 'cueup.pack.focus',
      status: 'refunded',
      transactionId: 'pack-txn-2',
      purchasedAt: now.toISOString(),
    }),
    () => 'quota-2',
    products,
  );
  const refunded = await refundService.verifyPurchase({
    actor,
    input: {
      platform: 'app_store',
      productId: 'cueup.pack.focus',
      receipt: 'refund-receipt',
    },
    now,
    user,
  });

  assert.equal(refunded.purchase?.status, 'refunded');
  assert.deepEqual(refunded.entitlement.activeCharacterPackIds, []);
});

test('consumeUsage increments quota and enforces Free limits', async () => {
  const service = new BillingService(
    new InMemoryBillingRepository({
      quotas: [
        {
          id: 'quota-1',
          userId: actor.userId,
          period: '2026-06',
          aiNotificationCount: 0,
          chatMessageCount: 4,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
    }),
    verifier(),
    () => 'unused',
    products,
  );

  const allowed = await service.consumeUsage({
    actor,
    kind: 'chat_message',
    now,
    user,
  });

  assert.equal(allowed.quota.chatMessageCount, 5);

  await assert.rejects(
    () =>
      service.consumeUsage({
        actor,
        kind: 'chat_message',
        now,
        user,
      }),
    /Monthly chat_message limit of 5 reached/,
  );
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
