import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AccessDeniedError,
  RecordNotFoundError,
  assertCanAccessRecord,
  filterAccessibleRecords,
  redactForLog,
  softDeleteRecord,
  type Actor,
  type OwnedRecord,
} from './accessControl.js';

const now = '2026-06-01T00:00:00.000Z';
const alice: Actor = { userId: 'alice', role: 'user' };
const bob: Actor = { userId: 'bob', role: 'user' };
const admin: Actor = { userId: 'admin', role: 'admin' };

const reminder: OwnedRecord = {
  id: 'reminder-1',
  userId: 'alice',
  title: 'Finish proposal',
  scheduledAt: now,
  characterId: 'character-1',
  status: 'active',
  createdAt: now,
  updatedAt: now,
};

test('assertCanAccessRecord permits the owning user', () => {
  assert.equal(assertCanAccessRecord(alice, reminder, 'read'), reminder);
});

test('assertCanAccessRecord rejects another user', () => {
  assert.throws(() => assertCanAccessRecord(bob, reminder, 'read'), AccessDeniedError);
});

test('assertCanAccessRecord hides soft-deleted records', () => {
  assert.throws(
    () => assertCanAccessRecord(alice, { ...reminder, deletedAt: now }, 'read'),
    RecordNotFoundError,
  );
});

test('filterAccessibleRecords returns only visible records for the actor', () => {
  const records = [
    reminder,
    { ...reminder, id: 'reminder-2', userId: 'bob' },
    { ...reminder, id: 'reminder-3', deletedAt: now },
  ];

  assert.deepEqual(
    filterAccessibleRecords(alice, records).map((record) => record.id),
    ['reminder-1'],
  );
  assert.deepEqual(
    filterAccessibleRecords(admin, records).map((record) => record.id),
    ['reminder-1', 'reminder-2'],
  );
});

test('softDeleteRecord marks an owned reminder as deleted', () => {
  assert.deepEqual(softDeleteRecord(alice, reminder, now), {
    ...reminder,
    deletedAt: now,
    status: 'deleted',
  });
});

test('redactForLog removes sensitive user content but keeps operational fields', () => {
  assert.deepEqual(
    redactForLog({
      userId: 'alice',
      title: 'Doctor appointment',
      body: 'private notification text',
      nested: {
        status: 'active',
        tokenUsage: { input: 100 },
      },
    }),
    {
      userId: 'alice',
      title: '[REDACTED]',
      body: '[REDACTED]',
      nested: {
        status: 'active',
        tokenUsage: '[REDACTED]',
      },
    },
  );
});
