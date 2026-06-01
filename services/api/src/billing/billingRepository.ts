import type { CharacterPackPurchase, Subscription, UsageQuota, UUID } from '@cueup/shared';

export type BillingUsageKind = 'ai_notification' | 'chat_message';

export interface BillingRepository {
  listSubscriptionsByUser(userId: UUID): Promise<Subscription[]>;
  saveSubscription(subscription: Subscription): Promise<Subscription>;
  listCharacterPackPurchasesByUser(userId: UUID): Promise<CharacterPackPurchase[]>;
  saveCharacterPackPurchase(purchase: CharacterPackPurchase): Promise<CharacterPackPurchase>;
  findUsageQuotaByUserAndPeriod(userId: UUID, period: string): Promise<UsageQuota | undefined>;
  incrementUsageQuota(params: {
    createQuota: () => UsageQuota;
    kind: BillingUsageKind;
    limit: number;
    now: string;
    period: string;
    userId: UUID;
  }): Promise<UsageQuota | undefined>;
  saveUsageQuota(quota: UsageQuota): Promise<UsageQuota>;
}

export class InMemoryBillingRepository implements BillingRepository {
  private readonly subscriptions = new Map<UUID, Subscription>();
  private readonly purchases = new Map<string, CharacterPackPurchase>();
  private readonly quotas = new Map<string, UsageQuota>();

  constructor(initial?: {
    subscriptions?: Subscription[];
    purchases?: CharacterPackPurchase[];
    quotas?: UsageQuota[];
  }) {
    for (const subscription of initial?.subscriptions ?? []) {
      this.subscriptions.set(subscription.id, subscription);
    }

    for (const purchase of initial?.purchases ?? []) {
      this.purchases.set(
        purchaseKey(purchase.userId, purchase.packId, purchase.platform),
        purchase,
      );
    }

    for (const quota of initial?.quotas ?? []) {
      this.quotas.set(quotaKey(quota.userId, quota.period), quota);
    }
  }

  async listSubscriptionsByUser(userId: UUID): Promise<Subscription[]> {
    return [...this.subscriptions.values()].filter(
      (subscription) => subscription.userId === userId,
    );
  }

  async saveSubscription(subscription: Subscription): Promise<Subscription> {
    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  async listCharacterPackPurchasesByUser(userId: UUID): Promise<CharacterPackPurchase[]> {
    return [...this.purchases.values()].filter((purchase) => purchase.userId === userId);
  }

  async saveCharacterPackPurchase(purchase: CharacterPackPurchase): Promise<CharacterPackPurchase> {
    this.purchases.set(purchaseKey(purchase.userId, purchase.packId, purchase.platform), purchase);
    return purchase;
  }

  async findUsageQuotaByUserAndPeriod(
    userId: UUID,
    period: string,
  ): Promise<UsageQuota | undefined> {
    return this.quotas.get(quotaKey(userId, period));
  }

  async incrementUsageQuota(params: {
    createQuota: () => UsageQuota;
    kind: BillingUsageKind;
    limit: number;
    now: string;
    period: string;
    userId: UUID;
  }): Promise<UsageQuota | undefined> {
    const key = quotaKey(params.userId, params.period);
    const existingQuota = this.quotas.get(key) ?? params.createQuota();
    const current =
      params.kind === 'ai_notification'
        ? existingQuota.aiNotificationCount
        : existingQuota.chatMessageCount;

    if (current >= params.limit) {
      this.quotas.set(key, existingQuota);
      return undefined;
    }

    const quota = {
      ...existingQuota,
      aiNotificationCount:
        params.kind === 'ai_notification'
          ? existingQuota.aiNotificationCount + 1
          : existingQuota.aiNotificationCount,
      chatMessageCount:
        params.kind === 'chat_message'
          ? existingQuota.chatMessageCount + 1
          : existingQuota.chatMessageCount,
      updatedAt: params.now,
    };

    this.quotas.set(key, quota);
    return quota;
  }

  async saveUsageQuota(quota: UsageQuota): Promise<UsageQuota> {
    this.quotas.set(quotaKey(quota.userId, quota.period), quota);
    return quota;
  }
}

function purchaseKey(userId: UUID, packId: UUID, platform: string): string {
  return `${userId}:${packId}:${platform}`;
}

function quotaKey(userId: UUID, period: string): string {
  return `${userId}:${period}`;
}
