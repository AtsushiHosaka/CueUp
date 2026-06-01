import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyUsageQuota,
  createEntitlementSnapshot,
  type Character,
  type Reminder,
  type User,
} from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import { InMemoryReminderRepository } from '../reminders/reminderRepository.js';
import { CharacterServiceError } from './characterErrors.js';
import { CharacterCatalogService } from './characterCatalogService.js';
import { InMemoryCharacterRepository } from './characterRepository.js';
import { SEEDED_CHARACTERS } from './seedCharacters.js';

const now = '2026-06-01T00:00:00.000Z';
const actor: Actor = {
  userId: 'user-1',
  role: 'user',
};
const user: User = {
  id: actor.userId,
  provider: 'apple',
  locale: 'en',
  timezone: 'Asia/Tokyo',
  plan: 'free',
  createdAt: now,
  updatedAt: now,
};

function entitlement(activeCharacterPackIds: string[] = [], activeCharacters = 3) {
  return {
    ...createEntitlementSnapshot({
      user,
      subscriptions: [],
      characterPackPurchases: activeCharacterPackIds.map((packId, index) => ({
        id: `purchase-${index}`,
        userId: user.id,
        packId,
        platform: 'app_store',
        purchasedAt: now,
        status: 'active',
      })),
      usageQuota: createEmptyUsageQuota({
        id: 'quota-1',
        userId: user.id,
        period: '2026-06',
        now,
      }),
    }),
    limits: {
      activeReminders: 20,
      activeCharacters,
      customCharacters: 1,
      folders: 5,
      monthlyAiNotifications: 100,
      monthlyChats: 5,
      notificationHistoryDays: 7,
      tags: 10,
    },
  };
}

function reminder(id: string, characterId: string): Reminder {
  return {
    id,
    userId: actor.userId,
    title: id,
    scheduledAt: '2026-06-01T01:00:00.000Z',
    characterId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function service(params: { characters?: Character[]; reminders?: Reminder[] } = {}) {
  return new CharacterCatalogService(
    new InMemoryCharacterRepository(params.characters ?? SEEDED_CHARACTERS),
    new InMemoryReminderRepository(params.reminders ?? []),
  );
}

test('listCatalog includes built-in characters and marks unpurchased pack characters', async () => {
  const catalog = await service().listCatalog(actor, entitlement());
  const strictBoss = catalog.find((item) => item.character.id === 'character-strict-boss');
  const focusSage = catalog.find((item) => item.character.id === 'character-focus-sage');

  assert.equal(strictBoss?.availability, 'available');
  assert.equal(focusSage?.availability, 'pack_required');
  assert.equal(focusSage?.purchaseTargetPackId, 'pack-deep-work');
});

test('getCharacter returns pack characters as available when purchased', async () => {
  const item = await service().getCharacter(
    actor,
    'character-focus-sage',
    entitlement(['pack-deep-work']),
  );

  assert.equal(item.availability, 'available');
});

test('assertCanSelectCharacter rejects unpurchased pack characters', async () => {
  await assert.rejects(
    () =>
      service().assertCanSelectCharacter({
        actor,
        characterId: 'character-focus-sage',
        entitlement: entitlement(),
      }),
    (error) => error instanceof CharacterServiceError && error.code === 'CHARACTER_PACK_REQUIRED',
  );
});

test('assertCanSelectCharacter uses unique active reminder character count for free limit', async () => {
  const catalog = service({
    reminders: [
      reminder('r1', 'character-strict-boss'),
      reminder('r2', 'character-gentle-friend'),
      reminder('r3', 'character-coach'),
      reminder('r4', 'character-coach'),
    ],
  });

  await assert.rejects(
    () =>
      catalog.assertCanSelectCharacter({
        actor,
        characterId: 'character-focus-sage',
        entitlement: entitlement(['pack-deep-work'], 3),
      }),
    (error) =>
      error instanceof CharacterServiceError &&
      error.code === 'CHARACTER_SELECTION_LIMIT_EXCEEDED' &&
      error.details.upgradeTarget === 'pro',
  );
});

test('assertCanSelectCharacter allows changing an existing reminder within the active character limit', async () => {
  const catalog = service({
    reminders: [
      reminder('r1', 'character-strict-boss'),
      reminder('r2', 'character-gentle-friend'),
      reminder('r3', 'character-coach'),
    ],
  });

  const character = await catalog.assertCanSelectCharacter({
    actor,
    currentReminderId: 'r3',
    characterId: 'character-focus-sage',
    entitlement: entitlement(['pack-deep-work'], 3),
  });

  assert.equal(character.id, 'character-focus-sage');
});

test('listCatalog hides custom characters owned by another user', async () => {
  const custom: Character = {
    id: 'custom-other',
    ownerUserId: 'other-user',
    type: 'custom',
    name: 'Other Custom',
    personaPrompt: 'private',
    strictness: 5,
    warmth: 5,
    createdAt: now,
    updatedAt: now,
  };

  const catalog = await service({ characters: [...SEEDED_CHARACTERS, custom] }).listCatalog(
    actor,
    entitlement(),
  );

  assert.equal(
    catalog.some((item) => item.character.id === custom.id),
    false,
  );
});
