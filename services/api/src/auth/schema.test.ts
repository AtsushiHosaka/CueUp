import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync('migrations/0002_auth_identity.sql', 'utf8');

test('auth identity migration persists provider account IDs', () => {
  assert.match(migration, /alter table users add column provider_account_id text/i);
  assert.match(migration, /alter table users alter column provider_account_id set not null/i);
  assert.match(migration, /create unique index users_provider_account_uidx/i);
});

test('auth identity migration prevents active duplicate emails', () => {
  assert.match(migration, /create unique index users_email_active_uidx/i);
  assert.match(migration, /where email is not null and deleted_at is null/i);
});
