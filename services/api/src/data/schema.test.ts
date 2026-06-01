import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync('migrations/0001_initial_schema.sql', 'utf8');
const snoozeSchema = readFileSync('migrations/0003_snooze_notification_jobs.sql', 'utf8');
const customCharacterSchema = readFileSync('migrations/0004_custom_character_safety.sql', 'utf8');

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

test('snooze migration stores reminder snooze state and notification jobs', () => {
  assert.match(snoozeSchema, /alter table reminders[\s\S]*snoozed_until timestamptz/i);
  assert.match(
    snoozeSchema,
    /alter table reminders[\s\S]*snooze_count integer not null default 0/i,
  );
  assert.match(snoozeSchema, /create table notification_jobs \(/i);
  assert.match(snoozeSchema, /create unique index notification_jobs_reminder_active_idx/i);
  assert.match(snoozeSchema, /alter table notification_jobs enable row level security/i);
});

test('custom character migration stores safety review metadata and owner isolation', () => {
  assert.match(customCharacterSchema, /add column relationship text/i);
  assert.match(customCharacterSchema, /add column tone text/i);
  assert.match(customCharacterSchema, /safety_review_status text not null default 'approved'/i);
  assert.match(customCharacterSchema, /create index characters_owner_custom_idx/i);
  assert.match(customCharacterSchema, /alter table characters enable row level security/i);
  assert.match(customCharacterSchema, /create policy characters_catalog_read on characters/i);
  assert.match(
    customCharacterSchema,
    /create policy characters_custom_owner_insert on characters/i,
  );
  assert.match(
    customCharacterSchema,
    /create policy characters_custom_owner_update on characters/i,
  );
});
