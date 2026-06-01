import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FREE_PLAN_LIMITS,
  createEmptyUsageQuota,
  createEntitlementSnapshot,
  type Character,
  type User,
} from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import { CharacterServiceError } from './characterErrors.js';
import { CharacterCatalogService } from './characterCatalogService.js';
import { InMemoryCharacterRepository } from './characterRepository.js';
import { CustomCharacterService, type CharacterIconValidator } from './customCharacterService.js';
import { SEEDED_CHARACTERS } from './seedCharacters.js';
import { InMemoryReminderRepository } from '../reminders/reminderRepository.js';

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

const validInput = {
  name: 'Deadline Navigator',
  relationship: 'accountability partner',
  tone: 'direct but kind',
  strictness: 7,
  warmth: 6,
  catchphrases: ['Next small step'],
  prohibitedStyle: ['personal insults'],
  iconUrl: 'https://example.com/icon.png',
};

function entitlement(customCharacters = 1) {
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
      customCharacters,
    },
  };
}

function customCharacter(id: string, ownerUserId = actor.userId): Character {
  return {
    id,
    ownerUserId,
    type: 'custom',
    name: 'Existing Custom',
    relationship: 'coach',
    tone: 'brief',
    personaPrompt: 'Existing custom persona',
    strictness: 5,
    warmth: 5,
    createdAt: now,
    updatedAt: now,
  };
}

test('createCustomCharacter saves owner-scoped custom persona for catalog and preview use', async () => {
  const repository = new InMemoryCharacterRepository(SEEDED_CHARACTERS);
  const service = new CustomCharacterService(repository, () => 'custom-1');
  const character = await service.createCustomCharacter({
    actor,
    entitlement: entitlement(),
    input: validInput,
    now,
  });
  const catalog = new CharacterCatalogService(repository, new InMemoryReminderRepository());
  const catalogItem = await catalog.getCharacter(actor, 'custom-1', entitlement());

  assert.equal(character.id, 'custom-1');
  assert.equal(character.ownerUserId, actor.userId);
  assert.equal(character.type, 'custom');
  assert.equal(character.personaPrompt.includes('Deadline Navigator'), true);
  assert.equal(character.personaPrompt.includes('accountability partner'), true);
  assert.equal(character.personaPrompt.includes('Avoid real people'), true);
  assert.equal(catalogItem.availability, 'available');
});

test('createCustomCharacter enforces the free custom character limit', async () => {
  const service = new CustomCharacterService(
    new InMemoryCharacterRepository([...SEEDED_CHARACTERS, customCharacter('custom-existing')]),
    () => 'custom-2',
  );

  await assert.rejects(
    () =>
      service.createCustomCharacter({
        actor,
        entitlement: entitlement(1),
        input: validInput,
        now,
      }),
    (error) =>
      error instanceof CharacterServiceError &&
      error.code === 'CHARACTER_CUSTOM_LIMIT_EXCEEDED' &&
      error.details.upgradeTarget === 'pro',
  );
});

test('createCustomCharacter allows multiple custom characters for higher plan limits', async () => {
  const service = new CustomCharacterService(
    new InMemoryCharacterRepository([...SEEDED_CHARACTERS, customCharacter('custom-existing')]),
    () => 'custom-2',
  );

  const character = await service.createCustomCharacter({
    actor,
    entitlement: entitlement(100),
    input: validInput,
    now,
  });

  assert.equal(character.id, 'custom-2');
});

test('createCustomCharacter handles missing input and unsafe settings', async () => {
  const service = new CustomCharacterService(new InMemoryCharacterRepository(), () => 'custom-1');

  await assert.rejects(
    () =>
      service.createCustomCharacter({
        actor,
        entitlement: entitlement(),
        input: { ...validInput, name: ' ' },
        now,
      }),
    (error) =>
      error instanceof CharacterServiceError &&
      error.code === 'CHARACTER_VALIDATION_ERROR' &&
      error.details.field === 'name',
  );

  await assert.rejects(
    () =>
      service.createCustomCharacter({
        actor,
        entitlement: entitlement(),
        input: { ...validInput, tone: 'Taylor Swift style with direct quote lyrics' },
        now,
      }),
    (error) =>
      error instanceof CharacterServiceError &&
      error.code === 'CHARACTER_SAFETY_REVIEW_REQUIRED' &&
      error.details.reason === 'real_person_reference',
  );
});

test('createCustomCharacter rejects portrait, trademark, and direct quote references', async () => {
  const service = new CustomCharacterService(new InMemoryCharacterRepository(), () => 'custom-1');

  for (const [tone, reason] of [
    ['use my uploaded portrait as the icon', 'portrait_or_photo_reference'],
    ['speak like a Disney trademark character', 'trademark_reference'],
    ['include a direct quote every time', 'direct_quote_reference'],
  ] as const) {
    await assert.rejects(
      () =>
        service.createCustomCharacter({
          actor,
          entitlement: entitlement(),
          input: { ...validInput, tone },
          now,
        }),
      (error) =>
        error instanceof CharacterServiceError &&
        error.code === 'CHARACTER_SAFETY_REVIEW_REQUIRED' &&
        error.details.reason === reason,
    );
  }
});

test('createCustomCharacter surfaces icon setting failures', async () => {
  const iconValidator: CharacterIconValidator = {
    async validateIcon() {
      return {
        allowed: false,
        reason: 'upload_failed',
      };
    },
  };
  const service = new CustomCharacterService(
    new InMemoryCharacterRepository(),
    () => 'custom-1',
    iconValidator,
  );

  await assert.rejects(
    () =>
      service.createCustomCharacter({
        actor,
        entitlement: entitlement(),
        input: validInput,
        now,
      }),
    (error) =>
      error instanceof CharacterServiceError &&
      error.code === 'CHARACTER_ICON_UNAVAILABLE' &&
      error.details.reason === 'upload_failed',
  );
});

test('updateCustomCharacter is limited to the owner and regenerates persona prompt', async () => {
  const repository = new InMemoryCharacterRepository([
    ...SEEDED_CHARACTERS,
    customCharacter('custom-owned'),
  ]);
  const service = new CustomCharacterService(repository, () => 'unused');

  await assert.rejects(
    () =>
      service.updateCustomCharacter({
        actor: { userId: 'other-user', role: 'user' },
        id: 'custom-owned',
        input: { tone: 'gentle' },
        now,
      }),
    (error) => error instanceof CharacterServiceError && error.code === 'CHARACTER_ACCESS_DENIED',
  );

  const updated = await service.updateCustomCharacter({
    actor,
    id: 'custom-owned',
    input: { tone: 'gentle and concise', warmth: 8 },
    now: '2026-06-01T01:00:00.000Z',
  });

  assert.equal(updated.tone, 'gentle and concise');
  assert.equal(updated.warmth, 8);
  assert.equal(updated.personaPrompt.includes('gentle and concise'), true);
  assert.equal(updated.updatedAt, '2026-06-01T01:00:00.000Z');
});
