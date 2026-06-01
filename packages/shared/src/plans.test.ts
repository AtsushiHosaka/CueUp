import assert from 'node:assert/strict';
import test from 'node:test';

import { FREE_PLAN_LIMITS, getPlanLimits } from './plans.js';

test('free plan follows the spec foundation limits', () => {
  assert.equal(FREE_PLAN_LIMITS.activeReminders, 20);
  assert.equal(FREE_PLAN_LIMITS.activeCharacters, 3);
  assert.equal(FREE_PLAN_LIMITS.customCharacters, 1);
  assert.equal(FREE_PLAN_LIMITS.monthlyAiNotifications, 100);
  assert.equal(FREE_PLAN_LIMITS.notificationHistoryDays, 7);
});

test('getPlanLimits falls back to free for free plan', () => {
  assert.deepEqual(getPlanLimits('free'), FREE_PLAN_LIMITS);
});
