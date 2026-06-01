import assert from 'node:assert/strict';
import test from 'node:test';

import type { Character } from '@cueup/shared';

import {
  appendChatExchange,
  createChatScreenModel,
  createHistoryScreenModel,
  createPackStoreScreenModel,
  createProScreenModel,
  createSecondaryFlowState,
  createSettingsScreenModel,
  mapCommerceFailure,
  markPackPurchased,
} from '../src/domain/secondaryFlow.js';

const now = '2026-06-01T00:00:00.000Z';
const character: Character = {
  id: 'character-boss',
  type: 'built_in',
  name: 'Strict Boss',
  personaPrompt: 'Direct accountability character.',
  strictness: 9,
  warmth: 3,
  createdAt: now,
  updatedAt: now,
};

test('history model supports loading, empty, reuse, delete, and chat affordances', () => {
  const loading = createHistoryScreenModel({
    ...createSecondaryFlowState(now),
    historyStatus: 'loading',
  });
  const empty = createHistoryScreenModel({
    ...createSecondaryFlowState(now),
    historyItems: [],
  });
  const ready = createHistoryScreenModel(createSecondaryFlowState(now));

  assert.equal(loading.isLoading, true);
  assert.equal(empty.emptyMessage, 'まだ通知履歴がありません');
  assert.equal(ready.rows[0]?.canChat, true);
  assert.equal(ready.rows[1]?.statusLabel, 'Fallback');
});

test('chat model shows first greeting, remaining quota, and response failure', () => {
  const empty = createChatScreenModel(createSecondaryFlowState(now), character);
  const failed = createChatScreenModel(
    {
      ...createSecondaryFlowState(now),
      chatStatus: 'failed',
      chatInput: 'help',
    },
    character,
  );
  const replied = createChatScreenModel(
    appendChatExchange(createSecondaryFlowState(now), {
      characterId: character.id,
      userId: 'user-1',
      body: 'proposal stuck',
      now,
    }),
    character,
  );

  assert.equal(
    empty.emptyGreeting,
    'Strict Boss: まず今つまずいていることを一言で送ってください。',
  );
  assert.equal(failed.errorMessage, '応答を取得できませんでした。');
  assert.equal(replied.messages.length, 2);
  assert.equal(replied.remainingLabel, '残り無料 4 回');
});

test('pro and pack models expose purchase, restore, and purchased states', () => {
  const failedPurchase = {
    ...createSecondaryFlowState(now),
    commerceStatus: mapCommerceFailure('purchase'),
  };
  const failedRestore = {
    ...createSecondaryFlowState(now),
    commerceStatus: mapCommerceFailure('restore'),
  };
  const purchased = markPackPurchased(createSecondaryFlowState(now), 'pack-deep-work');

  assert.equal(createProScreenModel(failedPurchase).errorMessage, '購入に失敗しました。');
  assert.equal(
    createPackStoreScreenModel(failedRestore).errorMessage,
    '購入の復元に失敗しました。',
  );
  assert.equal(
    createPackStoreScreenModel(purchased).rows.find((row) => row.id === 'pack-deep-work')
      ?.actionLabel,
    '利用可能',
  );
});

test('settings model links account, plan, notifications, data deletion, legal, and logout rows', () => {
  const model = createSettingsScreenModel({
    ...createSecondaryFlowState(now),
    settingsSelection: 'data',
  });

  assert.deepEqual(
    model.rows.map((row) => row.destination),
    ['account', 'plan', 'notifications', 'data', 'terms', 'privacy', 'logout'],
  );
  assert.equal(model.rows.find((row) => row.destination === 'data')?.destructive, true);
  assert.equal(model.selectedDetail, 'データ削除へ進みます。');
});
