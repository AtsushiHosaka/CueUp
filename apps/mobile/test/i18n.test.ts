import assert from 'node:assert/strict';
import test from 'node:test';

import { getUiText, supportedLocales, uiText } from '../src/i18n/uiText.js';

test('mobile ui text exposes matching locale key structure', () => {
  const jaKeys = flattenKeys(uiText.ja);

  for (const locale of supportedLocales) {
    assert.deepEqual(flattenKeys(uiText[locale]), jaKeys);
  }
});

test('getUiText falls back to Japanese for unsupported locales', () => {
  assert.equal(getUiText('en-US').settings.title, 'Settings');
  assert.equal(getUiText('fr-FR').settings.title, '設定');
});

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') {
    return [prefix];
  }

  return Object.entries(value)
    .flatMap(([key, child]) => flattenKeys(child, prefix.length === 0 ? key : `${prefix}.${key}`))
    .sort();
}
