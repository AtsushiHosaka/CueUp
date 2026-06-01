import assert from 'node:assert/strict';
import test from 'node:test';

import { FREE_PLAN_LIMITS, type Reminder } from '@cueup/shared';

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

  assert.equal(createHomeScreenModel(loading, now).skeletonRows, 3);
  assert.deepEqual(
    createHomeScreenModel(all, now).rows.map((row) => row.title),
    ['提案書の1ページ目を書く', '肩を回して水を飲む'],
  );
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

  assert.equal(
    createCharacterSelectRows(state).find((row) => row.id === 'character-focus-pack')?.actionLabel,
    'Pro で追加',
  );
  assert.equal(createCharacterCreateModel(state).previewText, 'プレビュー生成中');
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
