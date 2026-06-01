import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync('migrations/0003_push_notifications.sql', 'utf8');

test('push migration stores device tokens for iOS and Android', () => {
  assert.match(migration, /create table device_tokens/i);
  assert.match(migration, /platform text not null check \(platform in \('ios', 'android'\)\)/i);
  assert.match(migration, /unique \(platform, token\)/i);
});

test('push migration stores delivery state and retry metadata', () => {
  assert.match(migration, /create table push_deliveries/i);
  assert.match(
    migration,
    /status text not null check \(status in \('sent', 'failed', 'permission_denied'\)\)/i,
  );
  assert.match(migration, /retry_after timestamptz/i);
});

test('push migration enables user scoped row level security', () => {
  assert.match(migration, /alter table device_tokens enable row level security/i);
  assert.match(migration, /alter table push_deliveries enable row level security/i);
});
