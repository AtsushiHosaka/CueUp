import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRuntimeConfig,
  parseAiProvider,
  parseBillingProducts,
  parseBooleanFlag,
  parsePort,
} from './config.js';

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

test('parseBillingProducts supports configurable product IDs and prices', () => {
  const products = parseBillingProducts(
    JSON.stringify([
      {
        id: 'pro-ios',
        displayName: 'CueUp Pro',
        kind: 'pro_subscription',
        platform: 'app_store',
        priceLabel: '$4.99/mo',
        productId: 'com.example.pro.monthly',
      },
      {
        id: 'pack-ios',
        displayName: 'Focus Pack',
        kind: 'character_pack',
        packId: 'focus-pack',
        platform: 'app_store',
        priceLabel: '$1.99',
        productId: 'com.example.pack.focus',
      },
    ]),
  );

  assert.equal(products[0]?.productId, 'com.example.pro.monthly');
  assert.equal(products[0]?.priceLabel, '$4.99/mo');
  assert.equal(products[1]?.packId, 'focus-pack');
});

test('parseBillingProducts rejects invalid catalog entries', () => {
  assert.throws(
    () =>
      parseBillingProducts(
        JSON.stringify([
          {
            id: 'pack-ios',
            displayName: 'Focus Pack',
            kind: 'character_pack',
            platform: 'app_store',
            productId: 'com.example.pack.focus',
          },
        ]),
      ),
    /packId is required/,
  );
});

test('parseBooleanFlag accepts explicit true false values', () => {
  assert.equal(parseBooleanFlag(undefined), false);
  assert.equal(parseBooleanFlag('true'), true);
  assert.equal(parseBooleanFlag('1'), true);
  assert.equal(parseBooleanFlag('false'), false);
  assert.throws(() => parseBooleanFlag('yes'), /Invalid boolean flag/);
});

test('getRuntimeConfig never reads client-exposed secret values', () => {
  const config = getRuntimeConfig({
    NODE_ENV: 'test',
    PORT: '4100',
    AI_PROVIDER: 'disabled',
    BILLING_VERIFICATION_ENABLED: 'true',
    OPENAI_API_KEY: 'not-returned',
  });

  assert.equal(config.port, 4100);
  assert.equal(config.nodeEnv, 'test');
  assert.equal(config.billingVerificationEnabled, true);
  assert.equal(config.billingProducts.length > 0, true);
  assert.ok(config.serverOnlyCredentialNames.includes('OPENAI_API_KEY'));
  assert.equal(JSON.stringify(config).includes('not-returned'), false);
});
