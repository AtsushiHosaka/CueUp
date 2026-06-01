import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canSubmitCustomCharacterDraft,
  createCustomCharacterDraft,
  markCustomCharacterIconFailed,
  sanitizeCustomCharacterText,
} from '../src/domain/customCharacters.js';

test('createCustomCharacterDraft starts with neutral controls', () => {
  const draft = createCustomCharacterDraft();

  assert.equal(draft.strictness, 5);
  assert.equal(draft.warmth, 5);
  assert.equal(draft.icon.status, 'empty');
});

test('canSubmitCustomCharacterDraft requires core persona fields and a valid icon state', () => {
  const draft = {
    ...createCustomCharacterDraft(),
    name: ' Deadline Navigator ',
    relationship: ' accountability partner ',
    tone: ' direct but kind ',
  };

  assert.equal(canSubmitCustomCharacterDraft(draft), true);

  assert.equal(
    canSubmitCustomCharacterDraft({
      ...draft,
      icon: markCustomCharacterIconFailed('アイコンを設定できませんでした'),
    }),
    false,
  );
});

test('sanitizeCustomCharacterText trims and collapses whitespace', () => {
  assert.equal(sanitizeCustomCharacterText('  direct   but kind  '), 'direct but kind');
});
