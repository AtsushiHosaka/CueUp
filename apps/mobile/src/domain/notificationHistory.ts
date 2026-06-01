import type { GenerationStatus } from '@cueup/shared';

export type NotificationHistoryViewItem = {
  id: string;
  reminderId: string;
  characterId: string;
  body: string;
  generationStatus: GenerationStatus;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type NotificationHistoryViewState =
  | {
      status: 'empty';
      emptyMessage: string;
      items: [];
    }
  | {
      status: 'ready';
      emptyMessage: string;
      items: NotificationHistoryViewItem[];
    };

export function createNotificationHistoryViewState(
  items: NotificationHistoryViewItem[],
): NotificationHistoryViewState {
  if (items.length === 0) {
    return {
      status: 'empty',
      emptyMessage: 'まだ通知履歴がありません',
      items: [],
    };
  }

  return {
    status: 'ready',
    emptyMessage: 'まだ通知履歴がありません',
    items,
  };
}

export function canOpenCharacterChat(item: NotificationHistoryViewItem): boolean {
  return item.characterId.trim().length > 0;
}
