import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canOpenCharacterChat,
  createNotificationHistoryViewState,
  type NotificationHistoryViewItem,
} from '../src/domain/notificationHistory.js';

test('createNotificationHistoryViewState returns empty copy for no history', () => {
  const state = createNotificationHistoryViewState([]);

  assert.equal(state.status, 'empty');
  assert.equal(state.emptyMessage, 'まだ通知履歴がありません');
  assert.deepEqual(state.items, []);
});

test('createNotificationHistoryViewState keeps generation status and sentAt for display', () => {
  const item: NotificationHistoryViewItem = {
    id: 'message-1',
    reminderId: 'reminder-1',
    characterId: 'character-1',
    body: 'Strict Boss: 今やる。',
    generationStatus: 'success',
    sentAt: '2026-06-01T12:01:00.000Z',
    completedAt: null,
    createdAt: '2026-06-01T12:00:00.000Z',
  };

  const state = createNotificationHistoryViewState([item]);

  assert.equal(state.status, 'ready');
  assert.equal(state.items[0]?.generationStatus, 'success');
  assert.equal(state.items[0]?.sentAt, '2026-06-01T12:01:00.000Z');
  assert.equal(canOpenCharacterChat(state.items[0]!), true);
});
