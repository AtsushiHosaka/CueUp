import type { NotificationMessage, UsageQuota, UUID } from '@cueup/shared';

export interface NotificationMessageRepository {
  save(message: NotificationMessage): Promise<NotificationMessage>;
  listByUser(userId: UUID): Promise<NotificationMessage[]>;
}

export interface UsageQuotaRepository {
  findByUserAndPeriod(userId: UUID, period: string): Promise<UsageQuota | undefined>;
  save(quota: UsageQuota): Promise<UsageQuota>;
}

export class InMemoryNotificationMessageRepository implements NotificationMessageRepository {
  private readonly messages = new Map<UUID, NotificationMessage>();

  constructor(initialMessages: NotificationMessage[] = []) {
    for (const message of initialMessages) {
      this.messages.set(message.id, message);
    }
  }

  async save(message: NotificationMessage): Promise<NotificationMessage> {
    this.messages.set(message.id, message);
    return message;
  }

  async listByUser(userId: UUID): Promise<NotificationMessage[]> {
    return [...this.messages.values()].filter((message) => message.userId === userId);
  }
}

export class InMemoryUsageQuotaRepository implements UsageQuotaRepository {
  private readonly quotas = new Map<string, UsageQuota>();

  constructor(initialQuotas: UsageQuota[] = []) {
    for (const quota of initialQuotas) {
      this.quotas.set(quotaKey(quota.userId, quota.period), quota);
    }
  }

  async findByUserAndPeriod(userId: UUID, period: string): Promise<UsageQuota | undefined> {
    return this.quotas.get(quotaKey(userId, period));
  }

  async save(quota: UsageQuota): Promise<UsageQuota> {
    this.quotas.set(quotaKey(quota.userId, quota.period), quota);
    return quota;
  }
}

function quotaKey(userId: UUID, period: string): string {
  return `${userId}:${period}`;
}
