import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync('migrations/0001_initial_schema.sql', 'utf8');

const requiredTables = [
  'users',
  'reminders',
  'characters',
  'notification_messages',
  'folders',
  'tags',
  'reminder_tags',
  'subscriptions',
  'character_pack_purchases',
  'usage_quotas',
  'chat_messages',
];

test('initial migration declares all spec data tables', () => {
  for (const table of requiredTables) {
    assert.match(schema, new RegExp(`create table ${table} \\(`, 'i'));
  }
});

test('user-scoped tables include user ownership and row-level policies', () => {
  for (const table of [
    'reminders',
    'notification_messages',
    'folders',
    'tags',
    'subscriptions',
    'character_pack_purchases',
    'usage_quotas',
    'chat_messages',
  ]) {
    assert.match(
      schema,
      new RegExp(`create table ${table} \\([\\s\\S]*user_id uuid not null`, 'i'),
    );
    assert.match(schema, new RegExp(`alter table ${table} enable row level security`, 'i'));
  }
});

test('soft deletion columns exist for user and reminder records', () => {
  assert.match(schema, /create table users \([\s\S]*deleted_at timestamptz/i);
  assert.match(schema, /create table reminders \([\s\S]*deleted_at timestamptz/i);
  assert.match(schema, /create index reminders_user_active_idx/i);
});
