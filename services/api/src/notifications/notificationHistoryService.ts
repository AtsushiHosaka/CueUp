import type {
  EntitlementSnapshot,
  GenerationStatus,
  IsoDateTime,
  NotificationMessage,
  UUID,
} from '@cueup/shared';

import {
  AccessDeniedError,
  RecordNotFoundError,
  assertCanAccessRecord,
  filterAccessibleRecords,
  type Actor,
} from '../data/accessControl.js';
import {
  NotificationHistoryServiceError,
  type NotificationHistoryErrorCode,
} from './notificationHistoryErrors.js';
import type { NotificationMessageRepository } from './notificationRepository.js';

export type NotificationHistoryItem = {
  id: UUID;
  reminderId: UUID;
  characterId: UUID;
  body: string;
  generationStatus: GenerationStatus;
  sentAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
};

export type NotificationHistoryResult = {
  items: NotificationHistoryItem[];
  emptyStateMessage: string;
  retentionStartedAt: IsoDateTime | null;
};

export class NotificationHistoryService {
  constructor(private readonly repository: NotificationMessageRepository) {}

  async listHistory(params: {
    actor: Actor;
    entitlement: EntitlementSnapshot;
    now: Date;
  }): Promise<NotificationHistoryResult> {
    const messages = await this.repository.listByUser(params.actor.userId);
    const retentionStartedAt = getRetentionStartedAt(params.entitlement, params.now);
    const items = filterAccessibleRecords(params.actor, messages)
      .filter((message) => message.hiddenAt === undefined || message.hiddenAt === null)
      .filter((message) =>
        retentionStartedAt === null ? true : message.createdAt >= retentionStartedAt,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toHistoryItem);

    return {
      items,
      emptyStateMessage: 'まだ通知履歴がありません',
      retentionStartedAt,
    };
  }

  async hideMessage(params: {
    actor: Actor;
    id: UUID;
    now: IsoDateTime;
  }): Promise<NotificationMessage> {
    const existing = await this.repository.findById(params.id);
    const message = this.requireVisibleMessage(params.actor, existing, 'hide');

    return this.repository.save({
      ...message,
      hiddenAt: params.now,
    });
  }

  private requireVisibleMessage(
    actor: Actor,
    message: NotificationMessage | undefined,
    action: string,
  ): NotificationMessage {
    try {
      const accessibleMessage = assertCanAccessRecord(actor, message, action);

      if (accessibleMessage.hiddenAt !== undefined && accessibleMessage.hiddenAt !== null) {
        throw new RecordNotFoundError();
      }

      return accessibleMessage;
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        throw historyError(
          'NOTIFICATION_HISTORY_ACCESS_DENIED',
          'Actor is not allowed to access this notification history item',
        );
      }

      if (error instanceof RecordNotFoundError) {
        throw historyError(
          'NOTIFICATION_HISTORY_NOT_FOUND',
          'Notification history item was not found',
        );
      }

      throw error;
    }
  }
}

function toHistoryItem(message: NotificationMessage): NotificationHistoryItem {
  return {
    id: message.id,
    reminderId: message.reminderId,
    characterId: message.characterId,
    body: message.body,
    generationStatus: message.generationStatus,
    sentAt: message.sentAt ?? null,
    completedAt: message.completedAt ?? null,
    createdAt: message.createdAt,
  };
}

function getRetentionStartedAt(entitlement: EntitlementSnapshot, now: Date): IsoDateTime | null {
  const days = entitlement.limits.notificationHistoryDays;

  if (days === null) {
    return null;
  }

  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function historyError(
  code: NotificationHistoryErrorCode,
  message: string,
): NotificationHistoryServiceError {
  return new NotificationHistoryServiceError(code, message);
}
