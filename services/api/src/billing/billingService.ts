import {
  createEmptyUsageQuota,
  createEntitlementSnapshot,
  type BillingPlatform,
  type CharacterPackPurchase,
  type EntitlementSnapshot,
  type IsoDateTime,
  type Subscription,
  type UsageQuota,
  type User,
  type UUID,
} from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import {
  billingValidationError,
  productNotConfigured,
  receiptVerificationFailed,
  usageLimitExceeded,
} from './billingErrors.js';
import type { BillingRepository } from './billingRepository.js';
import type {
  BillingProductConfig,
  BillingReceiptVerifier,
  ReceiptVerificationInput,
  VerifiedBillingTransaction,
} from './billingVerifier.js';

export type BillingIdFactory = () => UUID;
export type UsageKind = 'ai_notification' | 'chat_message';

export type VerifyPurchaseInput = {
  platform?: unknown;
  productId?: unknown;
  receipt?: unknown;
  transactionId?: unknown;
};

export type RestorePurchasesInput = {
  purchases?: unknown;
};

export type VerifyPurchaseResult = {
  entitlement: EntitlementSnapshot;
  purchase?: CharacterPackPurchase;
  subscription?: Subscription;
};

export class BillingService {
  constructor(
    private readonly repository: BillingRepository,
    private readonly verifier: BillingReceiptVerifier,
    private readonly idFactory: BillingIdFactory,
    private readonly products: BillingProductConfig[],
  ) {}

  listProducts(): BillingProductConfig[] {
    return [...this.products];
  }

  async getEntitlementSnapshot(params: {
    actor: Actor;
    user: User;
    now: Date;
  }): Promise<EntitlementSnapshot> {
    const period = params.now.toISOString().slice(0, 7);
    const usageQuota = await this.findOrCreateUsageQuota(params.actor.userId, period, params.now);
    const subscriptions = await this.repository.listSubscriptionsByUser(params.actor.userId);
    const purchases = await this.repository.listCharacterPackPurchasesByUser(params.actor.userId);

    return createEntitlementSnapshot({
      user: {
        ...params.user,
        plan: 'free',
      },
      subscriptions: subscriptions.map((subscription) =>
        normalizeSubscriptionStatus(subscription, params.now.toISOString()),
      ),
      characterPackPurchases: purchases,
      usageQuota,
      now: params.now,
    });
  }

  async verifyPurchase(params: {
    actor: Actor;
    input: VerifyPurchaseInput;
    now: Date;
    user: User;
  }): Promise<VerifyPurchaseResult> {
    const input = parseVerifyPurchaseInput(params.input);
    const product = this.requireProduct(input.platform, input.productId);
    const verified = await this.verifyWithProvider(input);

    if (verified.platform !== input.platform || verified.productId !== input.productId) {
      throw receiptVerificationFailed('product_mismatch');
    }

    if (verified.kind !== product.kind) {
      throw receiptVerificationFailed('product_kind_mismatch');
    }

    if (verified.kind === 'pro_subscription') {
      const subscription = await this.repository.saveSubscription({
        id: `sub-${verified.platform}-${verified.transactionId}`,
        userId: params.actor.userId,
        platform: verified.platform,
        productId: verified.productId,
        status: verified.status,
        expiresAt: verified.expiresAt ?? null,
        createdAt: verified.purchasedAt,
        updatedAt: params.now.toISOString(),
      });

      return {
        subscription,
        entitlement: await this.getEntitlementSnapshot(params),
      };
    }

    if (product.packId === undefined || verified.packId !== product.packId) {
      throw receiptVerificationFailed('pack_mismatch');
    }

    const purchase = await this.repository.saveCharacterPackPurchase({
      id: `pack-${verified.platform}-${verified.transactionId}`,
      userId: params.actor.userId,
      packId: verified.packId,
      platform: verified.platform,
      purchasedAt: verified.purchasedAt,
      status: verified.status,
    });

    return {
      purchase,
      entitlement: await this.getEntitlementSnapshot(params),
    };
  }

  async restorePurchases(params: {
    actor: Actor;
    input: RestorePurchasesInput;
    now: Date;
    user: User;
  }): Promise<{ entitlement: EntitlementSnapshot; results: VerifyPurchaseResult[] }> {
    if (!Array.isArray(params.input.purchases)) {
      throw billingValidationError('purchases must be an array', 'purchases');
    }

    const results: VerifyPurchaseResult[] = [];

    for (const purchase of params.input.purchases) {
      if (!isRecord(purchase)) {
        throw billingValidationError('Each purchase must be an object', 'purchases');
      }

      results.push(
        await this.verifyPurchase({
          actor: params.actor,
          input: purchase,
          now: params.now,
          user: params.user,
        }),
      );
    }

    return {
      entitlement: await this.getEntitlementSnapshot(params),
      results,
    };
  }

  async consumeUsage(params: {
    actor: Actor;
    kind: UsageKind;
    now: Date;
    user: User;
  }): Promise<{ entitlement: EntitlementSnapshot; quota: UsageQuota }> {
    const entitlement = await this.getEntitlementSnapshot(params);
    const period = params.now.toISOString().slice(0, 7);
    const limit =
      params.kind === 'ai_notification'
        ? entitlement.limits.monthlyAiNotifications
        : entitlement.limits.monthlyChats;
    const quota = await this.repository.incrementUsageQuota({
      createQuota: () =>
        createEmptyUsageQuota({
          id: this.idFactory(),
          userId: params.actor.userId,
          period,
          now: params.now.toISOString(),
        }),
      kind: params.kind,
      limit,
      now: params.now.toISOString(),
      period,
      userId: params.actor.userId,
    });

    if (quota === undefined) {
      throw usageLimitExceeded(params.kind, limit);
    }

    return {
      quota,
      entitlement: {
        ...entitlement,
        usageQuota: quota,
      },
    };
  }

  private requireProduct(platform: BillingPlatform, productId: string): BillingProductConfig {
    const product = this.products.find(
      (candidate) => candidate.platform === platform && candidate.productId === productId,
    );

    if (product === undefined) {
      throw productNotConfigured(platform, productId);
    }

    return product;
  }

  private async findOrCreateUsageQuota(
    userId: UUID,
    period: string,
    now: Date,
  ): Promise<UsageQuota> {
    return (
      (await this.repository.findUsageQuotaByUserAndPeriod(userId, period)) ??
      (await this.repository.saveUsageQuota(
        createEmptyUsageQuota({
          id: this.idFactory(),
          userId,
          period,
          now: now.toISOString(),
        }),
      ))
    );
  }

  private async verifyWithProvider(
    input: ReceiptVerificationInput,
  ): Promise<VerifiedBillingTransaction> {
    try {
      return await this.verifier.verify(input);
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }

      throw receiptVerificationFailed('provider_rejected');
    }
  }
}

function parseVerifyPurchaseInput(input: VerifyPurchaseInput): ReceiptVerificationInput {
  if (!isBillingPlatform(input.platform)) {
    throw billingValidationError('platform must be app_store or google_play', 'platform');
  }

  if (typeof input.productId !== 'string' || input.productId.trim().length === 0) {
    throw billingValidationError('productId is required', 'productId');
  }

  if (typeof input.receipt !== 'string' || input.receipt.trim().length === 0) {
    throw billingValidationError('receipt is required', 'receipt');
  }

  return {
    platform: input.platform,
    productId: input.productId.trim(),
    receipt: input.receipt.trim(),
    ...(typeof input.transactionId === 'string' && input.transactionId.trim().length > 0
      ? { transactionId: input.transactionId.trim() }
      : {}),
  };
}

function normalizeSubscriptionStatus(subscription: Subscription, now: IsoDateTime): Subscription {
  if (
    (subscription.status === 'active' || subscription.status === 'canceled') &&
    subscription.expiresAt !== undefined &&
    subscription.expiresAt !== null &&
    new Date(subscription.expiresAt).getTime() <= new Date(now).getTime()
  ) {
    return {
      ...subscription,
      status: 'expired',
      updatedAt: now,
    };
  }

  return subscription;
}

function isBillingPlatform(value: unknown): value is BillingPlatform {
  return value === 'app_store' || value === 'google_play';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
