import assert from 'node:assert/strict';
import test from 'node:test';

import { getPixelAvatarTheme, getPixelAvatarVariant } from '../src/domain/pixelCharacters.js';

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
