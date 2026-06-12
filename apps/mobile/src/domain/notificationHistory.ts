import type { GenerationStatus } from '@cueup/shared';

import { getUiText, type UiText } from '../i18n/uiText';

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
  copy: UiText = getUiText('ja'),
): NotificationHistoryViewState {
  if (items.length === 0) {
    return {
      status: 'empty',
      emptyMessage: copy.history.empty,
      items: [],
    };
  }

  return {
    status: 'ready',
    emptyMessage: copy.history.empty,
    items,
  };
}

export function canOpenCharacterChat(item: NotificationHistoryViewItem): boolean {
  return item.characterId.trim().length > 0;
}
