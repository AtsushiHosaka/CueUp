import assert from 'node:assert/strict';
import test from 'node:test';

import { getRuntimeConfig, parseAiProvider, parsePort } from './config.js';

test('parsePort uses the default port when unset', () => {
  assert.equal(parsePort(undefined), 3000);
});

test('parsePort rejects invalid values', () => {
  assert.throws(() => parsePort('70000'), /Invalid PORT/);
  assert.throws(() => parsePort('not-a-number'), /Invalid PORT/);
});

test('parseAiProvider accepts supported providers', () => {
  assert.equal(parseAiProvider(undefined), 'disabled');
  assert.equal(parseAiProvider('openai'), 'openai');
  assert.equal(parseAiProvider('gemini'), 'gemini');
});

test('getRuntimeConfig never reads client-exposed secret values', () => {
  const config = getRuntimeConfig({
    NODE_ENV: 'test',
    PORT: '4100',
    AI_PROVIDER: 'disabled',
    OPENAI_API_KEY: 'not-returned',
  });

  assert.equal(config.port, 4100);
  assert.equal(config.nodeEnv, 'test');
  assert.ok(config.serverOnlyCredentialNames.includes('OPENAI_API_KEY'));
  assert.equal(JSON.stringify(config).includes('not-returned'), false);
});
