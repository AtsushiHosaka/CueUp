import type {
  CharacterPackPurchase,
  IsoDateTime,
  Subscription,
  UsageQuota,
  User,
  UUID,
} from './models.js';
import { getPlanLimits, type PlanLimits } from './plans.js';

export type EntitlementSnapshot = {
  userId: UUID;
  plan: User['plan'];
  limits: PlanLimits;
  activeSubscription?: Subscription;
  activeCharacterPackIds: UUID[];
  usageQuota: UsageQuota;
};

export function isActiveSubscription(subscription: Subscription, now: Date = new Date()): boolean {
  if (subscription.status !== 'active') {
    return false;
  }

  if (subscription.expiresAt === undefined || subscription.expiresAt === null) {
    return true;
  }

  return new Date(subscription.expiresAt).getTime() > now.getTime();
}

export function createEntitlementSnapshot(params: {
  user: User;
  subscriptions: Subscription[];
  characterPackPurchases: CharacterPackPurchase[];
  usageQuota: UsageQuota;
  now?: Date;
}): EntitlementSnapshot {
  const activeSubscription = params.subscriptions.find((subscription) =>
    isActiveSubscription(subscription, params.now),
  );
  const plan = activeSubscription === undefined ? params.user.plan : 'pro';

  const snapshot = {
    userId: params.user.id,
    plan,
    limits: getPlanLimits(plan),
    activeCharacterPackIds: params.characterPackPurchases
      .filter((purchase) => purchase.status === 'active')
      .map((purchase) => purchase.packId),
    usageQuota: params.usageQuota,
  };

  if (activeSubscription === undefined) {
    return snapshot;
  }

  return {
    ...snapshot,
    activeSubscription,
  };
}

export function createEmptyUsageQuota(params: {
  id: UUID;
  userId: UUID;
  period: string;
  now: IsoDateTime;
}): UsageQuota {
  return {
    id: params.id,
    userId: params.userId,
    period: params.period,
    aiNotificationCount: 0,
    chatMessageCount: 0,
    createdAt: params.now,
    updatedAt: params.now,
  };
}
