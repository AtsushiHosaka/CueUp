import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FREE_PLAN_LIMITS,
  createEmptyUsageQuota,
  createEntitlementSnapshot,
  type EntitlementSnapshot,
  type Folder,
  type Reminder,
  type Tag,
  type User,
} from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import { InMemoryReminderRepository } from '../reminders/reminderRepository.js';
import { OrganizerServiceError } from './organizerErrors.js';
import { InMemoryOrganizerRepository } from './organizerRepository.js';
import { OrganizerService } from './organizerService.js';

const now = '2026-06-01T09:00:00.000Z';
const actor: Actor = {
  userId: 'user-1',
  role: 'user',
};
const otherActor: Actor = {
  userId: 'user-2',
  role: 'user',
};
const user: User = {
  id: actor.userId,
  provider: 'apple',
  locale: 'ja',
  timezone: 'Asia/Tokyo',
  plan: 'free',
  createdAt: now,
  updatedAt: now,
};

function entitlement(overrides: Partial<EntitlementSnapshot['limits']> = {}) {
  return {
    ...createEntitlementSnapshot({
      user,
      subscriptions: [],
      characterPackPurchases: [],
      usageQuota: createEmptyUsageQuota({
        id: 'quota-1',
        userId: user.id,
        period: '2026-06',
        now,
      }),
    }),
    limits: {
      ...FREE_PLAN_LIMITS,
      ...overrides,
    },
  };
}

function createService(
  params: {
    folders?: Folder[];
    tags?: Tag[];
    reminders?: Reminder[];
    reminderTags?: Array<{ reminderId: string; tagId: string }>;
  } = {},
) {
  let nextId = 1;

  return new OrganizerService(
    new InMemoryOrganizerRepository({
      folders: params.folders,
      tags: params.tags,
      reminderTags: params.reminderTags,
    }),
    new InMemoryReminderRepository(params.reminders ?? []),
    () => `generated-${nextId++}`,
  );
}

test('createFolder validates names, enforces free limits, and sorts by sortOrder', async () => {
  const service = createService({
    folders: [
      folder({
        id: 'existing',
        name: 'Work',
        sortOrder: 10,
      }),
    ],
  });

  const created = await service.createFolder({
    actor,
    entitlement: entitlement({ folders: 2 }),
    input: {
      name: '  Home   admin  ',
      color: '#335C67',
      sortOrder: 1,
    },
    now,
  });
  const folders = await service.listFolders(actor);

  assert.equal(created.name, 'Home admin');
  assert.deepEqual(
    folders.map((item) => item.id),
    ['generated-1', 'existing'],
  );
  await assert.rejects(
    () =>
      service.createFolder({
        actor,
        entitlement: entitlement({ folders: 2 }),
        input: { name: 'Another' },
        now,
      }),
    (error) =>
      error instanceof OrganizerServiceError &&
      error.code === 'ORGANIZER_FOLDER_LIMIT_EXCEEDED' &&
      error.details.upgradeTarget === 'pro',
  );
  await assert.rejects(
    () =>
      service.createFolder({
        actor,
        entitlement: entitlement({ folders: 10 }),
        input: { name: 'work' },
        now,
      }),
    { code: 'ORGANIZER_DUPLICATE_NAME' },
  );
});

test('updateFolder is isolated by owner and deleteFolder clears reminder links', async () => {
  const reminderRepository = new InMemoryReminderRepository([
    reminder({
      id: 'reminder-1',
      folderId: 'folder-1',
    }),
  ]);
  const service = new OrganizerService(
    new InMemoryOrganizerRepository({
      folders: [
        folder({ id: 'folder-1' }),
        folder({ id: 'folder-other', userId: otherActor.userId }),
      ],
    }),
    reminderRepository,
    () => 'generated',
  );

  const updated = await service.updateFolder({
    actor,
    id: 'folder-1',
    input: {
      name: 'Deep work',
      color: null,
    },
    now,
  });
  const deleted = await service.deleteFolder({ actor, id: 'folder-1', now });
  const reminderAfterDelete = await reminderRepository.findById('reminder-1');

  assert.equal(updated.name, 'Deep work');
  assert.equal(deleted.id, 'folder-1');
  assert.equal(reminderAfterDelete?.folderId, null);
  await assert.rejects(
    () =>
      service.updateFolder({
        actor,
        id: 'folder-other',
        input: { name: 'Nope' },
        now,
      }),
    { code: 'ORGANIZER_ACCESS_DENIED' },
  );
});

test('createTag enforces ownership, duplicate names, and free limits', async () => {
  const service = createService({
    tags: [tag({ id: 'tag-existing', name: '仕事' })],
  });

  const created = await service.createTag({
    actor,
    entitlement: entitlement({ tags: 2 }),
    input: {
      name: ' 家事 ',
      color: '#E09F3E',
    },
    now,
  });
  const tags = await service.listTags(actor);

  assert.equal(created.name, '家事');
  assert.deepEqual(
    tags.map((item) => item.name),
    ['仕事', '家事'],
  );
  await assert.rejects(
    () =>
      service.createTag({
        actor,
        entitlement: entitlement({ tags: 2 }),
        input: { name: 'Fitness' },
        now,
      }),
    { code: 'ORGANIZER_TAG_LIMIT_EXCEEDED' },
  );
  await assert.rejects(
    () =>
      service.createTag({
        actor,
        entitlement: entitlement({ tags: 10 }),
        input: { name: '  仕事 ' },
        now,
      }),
    { code: 'ORGANIZER_DUPLICATE_NAME' },
  );
});

test('setReminderTags validates reminder and tag ownership', async () => {
  const service = createService({
    reminders: [reminder({ id: 'reminder-1' })],
    tags: [
      tag({ id: 'tag-1' }),
      tag({ id: 'tag-2' }),
      tag({ id: 'tag-other', userId: otherActor.userId }),
    ],
  });

  const assigned = await service.setReminderTags({
    actor,
    reminderId: 'reminder-1',
    tagIds: ['tag-2', 'tag-1', 'tag-1'],
    now,
  });
  const reminderTags = await service.listReminderTags({ actor, reminderId: 'reminder-1' });

  assert.deepEqual(
    assigned.map((item) => item.id),
    ['tag-1', 'tag-2'],
  );
  assert.deepEqual(
    reminderTags.map((item) => item.id),
    ['tag-1', 'tag-2'],
  );
  await assert.rejects(
    () =>
      service.setReminderTags({
        actor,
        reminderId: 'reminder-1',
        tagIds: ['tag-other'],
        now,
      }),
    { code: 'ORGANIZER_ACCESS_DENIED' },
  );
});

test('deleteTag removes reminder assignments', async () => {
  const service = createService({
    reminders: [reminder({ id: 'reminder-1' })],
    tags: [tag({ id: 'tag-1' })],
    reminderTags: [{ reminderId: 'reminder-1', tagId: 'tag-1' }],
  });

  const deleted = await service.deleteTag({ actor, id: 'tag-1', now });
  const tags = await service.listReminderTags({ actor, reminderId: 'reminder-1' });

  assert.equal(deleted.id, 'tag-1');
  assert.deepEqual(tags, []);
});

test('listSmartList returns reminders by today overdue folder character and tag', async () => {
  const service = createService({
    folders: [folder({ id: 'folder-work' })],
    tags: [tag({ id: 'tag-work', name: '仕事' })],
    reminderTags: [{ reminderId: 'work-today', tagId: 'tag-work' }],
    reminders: [
      reminder({
        id: 'work-today',
        folderId: 'folder-work',
        characterId: 'character-boss',
        scheduledAt: '2026-06-01T12:00:00.000Z',
      }),
      reminder({
        id: 'overdue',
        scheduledAt: '2026-05-31T23:00:00.000Z',
      }),
      reminder({
        id: 'done',
        status: 'completed',
        scheduledAt: '2026-06-01T10:00:00.000Z',
      }),
    ],
  });

  assert.deepEqual(await smartListIds(service, { kind: 'today' }), ['work-today']);
  assert.deepEqual(await smartListIds(service, { kind: 'overdue' }), ['overdue']);
  assert.deepEqual(await smartListIds(service, { kind: 'folder', folderId: 'folder-work' }), [
    'work-today',
  ]);
  assert.deepEqual(
    await smartListIds(service, { kind: 'character', characterId: 'character-boss' }),
    ['work-today'],
  );
  assert.deepEqual(await smartListIds(service, { kind: 'tag', tagId: 'tag-work' }), ['work-today']);
  assert.deepEqual(await smartListIds(service, { kind: 'work' }), ['work-today']);
});

async function smartListIds(
  service: OrganizerService,
  params: Omit<Parameters<OrganizerService['listSmartList']>[0], 'actor' | 'now'>,
): Promise<string[]> {
  return (
    await service.listSmartList({
      actor,
      now: new Date(now),
      ...params,
    })
  ).map((item) => item.id);
}

function folder(overrides: Partial<Folder> = {}): Folder {
  return {
    id: 'folder-1',
    userId: actor.userId,
    name: 'Work',
    color: null,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function tag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 'tag-1',
    userId: actor.userId,
    name: '仕事',
    color: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'reminder-1',
    userId: actor.userId,
    title: 'Reminder',
    note: null,
    scheduledAt: '2026-06-01T12:00:00.000Z',
    recurrenceRule: null,
    characterId: 'character-1',
    folderId: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
