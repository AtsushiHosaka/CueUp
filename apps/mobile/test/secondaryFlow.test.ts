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
  const failed = createHistoryScreenModel({
    ...createSecondaryFlowState(now),
    historyItems: [
      {
        ...createSecondaryFlowState(now).historyItems[0]!,
        generationStatus: 'failed',
      },
    ],
  });
  const loadFailed = createHistoryScreenModel({
    ...createSecondaryFlowState(now),
    historyStatus: 'failed',
  });

  assert.equal(loading.isLoading, true);
  assert.equal(empty.emptyMessage, 'まだ通知履歴がありません');
  assert.equal(loadFailed.errorMessage, '通知履歴を読み込めませんでした。');
  assert.equal(ready.rows[0]?.canChat, true);
  assert.equal(ready.rows[1]?.statusLabel, 'Fallback');
  assert.equal(ready.rows[0]?.personaChip.archetypeLabel, 'Boss型');
  assert.equal(ready.rows[0]?.personaChip.toneLabel, '短く強め');
  assert.equal(ready.rows[0]?.personaChip.safetyLabel, '架空のピクセルペルソナ');
  assert.equal(ready.rows[0]?.detail, `${now} / 架空のピクセルペルソナ`);
  assert.equal(ready.rows[1]?.statusBadge.tone, 'warning');
  assert.equal(ready.rows[0]?.actionLabels.reuse, '再利用');
  assert.equal(ready.rows[0]?.actionLabels.delete, '削除');
  assert.equal(failed.rows[0]?.statusLabel, 'Failed');
  assert.equal(failed.rows[0]?.statusBadge.tone, 'danger');
});

test('chat model shows first greeting, remaining quota, and AI failure handling copy', () => {
  const empty = createChatScreenModel(createSecondaryFlowState(now), character);
  const failed = createChatScreenModel(
    {
      ...createSecondaryFlowState(now),
      chatStatus: 'failed',
      chatInput: 'help',
    },
    character,
  );
  const loading = createChatScreenModel(
    {
      ...createSecondaryFlowState(now),
      chatStatus: 'loading',
      chatInput: 'help',
    },
    character,
  );
  const quotaExhausted = createChatScreenModel(
    {
      ...createSecondaryFlowState(now),
      remainingFreeChats: 0,
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
  assert.equal(empty.personaChip.archetypeLabel, 'Boss型');
  assert.equal(empty.personaChip.safetyLabel, '架空のピクセルペルソナ');
  assert.equal(loading.isLoading, true);
  assert.equal(loading.canSend, false);
  assert.equal(failed.errorMessage, 'AI 応答を取得できませんでした。');
  assert.equal(quotaExhausted.remainingBadge.label, '残り無料 0 回');
  assert.equal(quotaExhausted.remainingBadge.tone, 'warning');
  assert.equal(replied.messages.length, 2);
  assert.equal(replied.messages[0]?.roleLabel, 'You');
  assert.equal(replied.messages[1]?.roleLabel, 'Boss型');
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
  const pro = createProScreenModel(createSecondaryFlowState(now));

  assert.equal(createProScreenModel(failedPurchase).errorMessage, '購入に失敗しました。');
  assert.deepEqual(pro.benefits, [
    'リマインダーとAI利用枠を拡張',
    'フォルダ/タグで整理',
    '通知履歴と同期を強化',
  ]);
  assert.equal(pro.addOnNote, 'Character Pack はStoreの追加要素として扱います。');
  assert.equal(pro.benefitRows[0]?.priority, 'core');
  assert.equal(pro.benefitRows.find((row) => row.iconKey === 'folders')?.label, 'Folders & Tags');
  assert.deepEqual(
    pro.comparisonRows.map((row) => row.label),
    ['アクティブリマインダー', 'Monthly chat', 'History', 'Folders & Tags', 'Smart Lists', 'Sync'],
  );
  assert.equal(
    createPackStoreScreenModel(failedRestore).errorMessage,
    '購入の復元に失敗しました。',
  );
  assert.equal(
    createPackStoreScreenModel({
      ...createSecondaryFlowState(now),
      commerceStatus: 'loading',
    }).isLoading,
    true,
  );
  assert.equal(
    createPackStoreScreenModel(createSecondaryFlowState(now)).rows[0]?.kindLabel,
    'Add-on',
  );
  assert.equal(
    createPackStoreScreenModel(purchased).rows.find((row) => row.id === 'pack-deep-work')
      ?.actionLabel,
    '利用可能',
  );
  assert.equal(
    createPackStoreScreenModel(purchased).rows.find((row) => row.id === 'pack-deep-work')
      ?.stateBadge.tone,
    'success',
  );
});

test('settings model links account, plan, notifications, data deletion, legal, and logout rows', () => {
  const model = createSettingsScreenModel({
    ...createSecondaryFlowState(now),
    settingsSelection: 'data',
  });

  assert.deepEqual(
    model.rows.map((row) => row.destination),
    ['account', 'plan', 'notifications', 'language', 'data', 'terms', 'privacy', 'logout'],
  );
  assert.equal(model.rows.find((row) => row.destination === 'data')?.destructive, true);
  assert.equal(model.rows.find((row) => row.destination === 'data')?.stateBadge?.tone, 'danger');
  assert.equal(model.selectedDetail, 'データ削除へ進みます。');
});
