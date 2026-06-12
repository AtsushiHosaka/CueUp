import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPixelPersonaChipModel,
  getPixelAvatarTheme,
  getPixelAvatarVariant,
} from '../src/domain/pixelCharacters.js';
import { getUiText } from '../src/i18n/uiText.js';

test('pixel avatar variants map seeded characters to abstract icon styles', () => {
  assert.equal(
    getPixelAvatarVariant({ id: 'character-strict-boss', name: 'Strict Boss' }),
    'strict',
  );
  assert.equal(
    getPixelAvatarVariant({ id: 'character-gentle-friend', name: 'Gentle Friend' }),
    'gentle',
  );
  assert.equal(getPixelAvatarVariant({ id: 'character-coach', name: 'Momentum Coach' }), 'coach');
  assert.equal(getPixelAvatarVariant({ id: 'character-focus-sage', name: 'Focus Sage' }), 'focus');
  assert.equal(
    getPixelAvatarVariant({ id: 'character-breathe-pack', name: 'Breathe' }),
    'wellness',
  );
});

test('custom and unknown characters keep a pixel-safe fallback', () => {
  assert.equal(
    getPixelAvatarVariant({ id: 'custom-1', name: 'Deadline Navigator', type: 'custom' }),
    'custom',
  );

  const fallback = getPixelAvatarTheme({ id: 'character-unknown', name: 'Unknown' });

  assert.equal(fallback.pixels.length, 8);
  assert.equal(
    fallback.pixels.every((row) => row.length === 8),
    true,
  );
});

test('pixel persona chip models use fictional archetype and tone copy', () => {
  const copy = getUiText('ja');
  const chip = createPixelPersonaChipModel(
    { id: 'character-focus-pack', name: 'Focus Sage', type: 'pack' },
    copy,
  );

  assert.equal(chip.avatarVariant, 'focus');
  assert.equal(chip.archetypeLabel, 'Focus型');
  assert.equal(chip.toneLabel, '集中を保つ');
  assert.equal(chip.safetyLabel, '架空のピクセルペルソナ');
});
