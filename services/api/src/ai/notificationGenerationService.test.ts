import assert from 'node:assert/strict';
import test from 'node:test';

import type { Character, Reminder, User } from '@cueup/shared';

import { StaticAiTextProvider } from './aiProvider.js';
import { NotificationGenerationService } from './notificationGenerationService.js';
import { buildNotificationPrompt } from './promptBuilder.js';
import {
  InMemoryNotificationMessageRepository,
  InMemoryUsageQuotaRepository,
} from '../notifications/notificationRepository.js';

const now = new Date('2026-06-01T09:00:00.000Z');
const user: User = {
  id: 'user-1',
  provider: 'apple',
  locale: 'ja',
  timezone: 'Asia/Tokyo',
  plan: 'free',
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};
const reminder: Reminder = {
  id: 'reminder-1',
  userId: user.id,
  title: '企画書を仕上げる',
  note: '締切は今日の夕方',
  scheduledAt: '2026-06-01T10:00:00.000Z',
  characterId: 'character-1',
  status: 'active',
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};
const character: Character = {
  id: 'character-1',
  type: 'built_in',
  name: 'Strict Boss',
  personaPrompt: '厳しめだが行動を促す上司の口調',
  strictness: 9,
  warmth: 3,
  catchphrases: ['今やる'],
  prohibitedStyle: ['人格否定'],
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

function createService(provider: StaticAiTextProvider) {
  let id = 1;

  return new NotificationGenerationService(
    provider,
    new InMemoryNotificationMessageRepository(),
    new InMemoryUsageQuotaRepository(),
    () => `generated-${id++}`,
  );
}

test('buildNotificationPrompt reflects reminder and character voice controls', () => {
  const prompt = buildNotificationPrompt({
    reminder,
    character,
    user,
    category: 'work',
  });

  assert.match(prompt, /企画書を仕上げる/);
  assert.match(prompt, /Strict Boss/);
  assert.match(prompt, /厳しめだが行動を促す上司の口調/);
  assert.match(prompt, /Strictness: 9\/10/);
  assert.match(prompt, /Do not use: 人格否定/);
});

test('generate stores success messages and increments usage quota only on AI success', async () => {
  const service = createService(
    new StaticAiTextProvider({
      text: 'Strict Boss: 企画書、今やる。締切前に動け。',
      model: 'test-model',
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 16,
      },
    }),
  );

  const result = await service.generate({
    user,
    reminder,
    character,
    category: 'work',
    now,
  });

  assert.equal(result.message.generationStatus, 'success');
  assert.equal(result.message.body, 'Strict Boss: 企画書、今やる。締切前に動け。');
  assert.equal(result.message.aiModel, 'test-model');
  assert.equal(result.quota.aiNotificationCount, 1);
});

test('generate returns fallback and does not increment quota after provider failures', async () => {
  const service = createService(new StaticAiTextProvider(new Error('provider unavailable')));

  const result = await service.generate({
    user,
    reminder,
    character,
    now,
  });

  assert.equal(result.message.generationStatus, 'fallback');
  assert.equal(
    result.message.body,
    'Strict Boss: 企画書を仕上げる の時間です。今すぐ取りかかりましょう。',
  );
  assert.equal(result.quota.aiNotificationCount, 0);
});

test('generate blocks unsafe provider output and sends a fallback instead', async () => {
  const service = createService(
    new StaticAiTextProvider({
      text: 'kill the task',
      model: 'unsafe-model',
    }),
  );

  const result = await service.generate({
    user,
    reminder,
    character,
    now,
  });

  assert.equal(result.message.generationStatus, 'fallback');
  assert.equal(result.message.aiModel, null);
  assert.equal(result.safetyFallbackReason, 'blocked_content');
  assert.equal(result.quota.aiNotificationCount, 0);
});
