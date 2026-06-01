import assert from 'node:assert/strict';
import test from 'node:test';

import { createReminderDraft, sanitizeReminderTitle } from '../src/domain/reminders.js';

test('createReminderDraft schedules one hour from now', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');
  const draft = createReminderDraft(now);

  assert.equal(draft.scheduledAt, '2026-06-01T13:00:00.000Z');
  assert.equal(draft.title, 'Take the first step');
});

test('sanitizeReminderTitle trims and collapses whitespace', () => {
  assert.equal(sanitizeReminderTitle('  finish   proposal  '), 'finish proposal');
});
