import assert from 'node:assert/strict';
import test from 'node:test';

import { FREE_PLAN_LIMITS, type Character, type Reminder } from '@cueup/shared';

import {
  createCharacterCreateModel,
  createCharacterSelectRows,
  createDemoMainFlowState,
  createHomeScreenModel,
  createInitialMainFlowState,
  createOnboardingScreenModel,
  createReminderFormModel,
  mapApiErrorToFlowError,
  validateReminderDraft,
} from '../src/domain/mainFlow.js';

const now = new Date('2026-06-01T00:00:00.000Z');

test('onboarding model exposes notification denial recovery', () => {
  const unknown = createOnboardingScreenModel({ notificationPermission: 'unknown' });
  const denied = createOnboardingScreenModel({ notificationPermission: 'denied' });

  assert.equal(unknown.primaryActionLabel, '通知を許可');
  assert.equal(denied.permissionNotice?.actionLabel, 'OS 設定を開く');
});

test('home model shows the first Cue empty state and notification banner', () => {
  const state = {
    ...createInitialMainFlowState(now),
    route: 'home' as const,
    authenticated: true,
    notificationPermission: 'denied' as const,
  };
  const model = createHomeScreenModel(state, now);

  assert.equal(model.notificationBanner?.actionLabel, '設定を開く');
  assert.equal(model.emptyState?.title, '最初の Cue を作成しましょう');
  assert.deepEqual(model.rows, []);
});

test('home model surfaces loading skeletons and filtered reminder rows', () => {
  const loading = {
    ...createDemoMainFlowState(now),
    reminderListStatus: 'loading' as const,
  };
  const all = {
    ...createDemoMainFlowState(now),
    reminderFilter: 'all' as const,
  };
  const completed = {
    ...all,
    reminders: [
      ...all.reminders,
      {
        ...all.reminders[0]!,
        id: 'reminder-completed',
        title: '完了したCue',
        status: 'completed' as const,
      },
    ],
  };
  const completedRow = createHomeScreenModel(completed, now).rows.find(
    (row) => row.id === 'reminder-completed',
  );

  assert.equal(createHomeScreenModel(loading, now).skeletonRows, 3);
  assert.deepEqual(
    createHomeScreenModel(all, now).rows.map((row) => row.title),
    ['提案書の1ページ目を書く', '肩を回して水を飲む'],
  );
  assert.deepEqual(
    createHomeScreenModel(all, now).rows.map((row) => row.personaChip.archetypeLabel),
    ['Boss型', 'Friend型'],
  );
  assert.equal(createHomeScreenModel(all, now).rows[0]?.note, '見出しだけでも進める');
  assert.equal(createHomeScreenModel(all, now).rows[0]?.stateBadge.label, '進行中');
  assert.equal(createHomeScreenModel(all, now).rows[1]?.stateBadge.label, 'スヌーズ');
  assert.equal(createHomeScreenModel(all, now).rows[0]?.actionLabels.snooze, '10分後');
  assert.equal(completedRow?.stateBadge.label, '完了');
  assert.equal(completedRow?.actionLabels.edit, undefined);
});

test('reminder form model handles missing required fields and free limits', () => {
  const emptyTitle = {
    ...createInitialMainFlowState(now),
    route: 'reminderForm' as const,
    authenticated: true,
    reminderDraft: {
      ...createInitialMainFlowState(now).reminderDraft,
      title: ' ',
    },
  };
  const limitedReminders = Array.from({ length: FREE_PLAN_LIMITS.activeReminders }, (_, index) =>
    reminder(`reminder-${index}`),
  );
  const atLimit = {
    ...createInitialMainFlowState(now),
    route: 'reminderForm' as const,
    authenticated: true,
    reminders: limitedReminders,
  };

  assert.equal(createReminderFormModel(emptyTitle).validationError?.kind, 'missing_required');
  assert.equal(validateReminderDraft(atLimit)?.targetRoute, 'proUpsell');
  const formModel = createReminderFormModel(atLimit);
  assert.equal(formModel.selectedCharacterName, 'Strict Boss');
  assert.equal(formModel.selectedPersonaChip.archetypeLabel, 'Boss型');
  assert.equal(formModel.selectedPersonaChip.toneLabel, '短く強め');
  assert.equal(formModel.selectedPersonaChip.safetyLabel, '架空のピクセルペルソナ');
});

test('character selection and creation models expose upgrade and preview states', () => {
  const state = {
    ...createDemoMainFlowState(now),
    route: 'characterCreate' as const,
    characterPreviewStatus: 'generating' as const,
    customCharacterDraft: {
      ...createDemoMainFlowState(now).customCharacterDraft,
      name: 'Deadline Navigator',
      relationship: 'accountability partner',
      tone: 'direct but kind',
    },
  };
  const otherUserCharacter: Character = {
    id: 'custom-other',
    ownerUserId: 'user-2',
    type: 'custom',
    name: 'Other Mentor',
    relationship: 'mentor',
    tone: 'calm',
    personaPrompt: 'Original fictional persona.',
    strictness: 4,
    warmth: 7,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const rows = createCharacterSelectRows({
    ...state,
    characters: [...state.characters, otherUserCharacter],
  });
  const selectedRow = rows.find((row) => row.id === 'character-boss');
  const lockedRow = rows.find((row) => row.id === 'character-focus-pack');
  const ownerOnlyRow = rows.find((row) => row.id === 'custom-other');

  assert.equal(selectedRow?.availabilityLabel, '選択中');
  assert.equal(selectedRow?.stateBadge.label, '選択中');
  assert.equal(selectedRow?.personaChip.safetyLabel, '架空のピクセルペルソナ');
  assert.equal(lockedRow?.actionLabel, 'Pro で追加');
  assert.equal(lockedRow?.availabilityLabel, 'Proで追加');
  assert.equal(lockedRow?.stateBadge.tone, 'locked');
  assert.equal(lockedRow?.personaChip.archetypeLabel, 'Focus型');
  assert.equal(lockedRow?.personaChip.toneLabel, '集中を保つ');
  assert.equal(ownerOnlyRow?.availabilityLabel, 'このユーザーのみ');
  assert.equal(ownerOnlyRow?.stateBadge.tone, 'warning');
  assert.equal(ownerOnlyRow?.actionLabel, '利用不可');
  assert.match(selectedRow?.safetyLabel ?? '', /実在の有名人/);
  assert.equal(createCharacterCreateModel(state).previewText, 'プレビュー生成中');
  assert.match(createCharacterCreateModel(state).safetyHelper, /架空ペルソナ/);
  assert.match(createCharacterCreateModel(state).safetyHelper, /歌詞/);
  assert.equal(
    createCharacterCreateModel({ ...state, characterPreviewStatus: 'ready' }).canSubmit,
    true,
  );
});

test('api error mapping routes plan limit errors to Pro guidance', () => {
  const error = mapApiErrorToFlowError('plan_limit_exceeded');

  assert.equal(error.kind, 'free_limit');
  assert.equal(error.targetRoute, 'proUpsell');
});

function reminder(id: string): Reminder {
  return {
    id,
    userId: 'user-1',
    title: 'Active reminder',
    note: null,
    scheduledAt: '2026-06-02T09:00:00.000Z',
    recurrenceRule: null,
    characterId: 'character-boss',
    status: 'active',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
