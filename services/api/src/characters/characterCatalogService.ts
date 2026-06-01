import type { Character, EntitlementSnapshot, Reminder, UUID } from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import type { ReminderRepository } from '../reminders/reminderRepository.js';
import {
  characterPackRequired,
  characterSelectionLimitExceeded,
  CharacterServiceError,
} from './characterErrors.js';
import type { CharacterRepository } from './characterRepository.js';

export type CharacterAvailability = 'available' | 'pack_required' | 'owner_only';

export type CharacterCatalogItem = {
  character: Character;
  availability: CharacterAvailability;
  purchaseTargetPackId?: UUID;
};

export class CharacterCatalogService {
  constructor(
    private readonly characters: CharacterRepository,
    private readonly reminders: ReminderRepository,
  ) {}

  async listCatalog(
    actor: Actor,
    entitlement: EntitlementSnapshot,
  ): Promise<CharacterCatalogItem[]> {
    const characters = await this.characters.listAll();

    return characters
      .filter((character) => character.type !== 'custom' || character.ownerUserId === actor.userId)
      .map((character) => this.toCatalogItem(character, actor, entitlement));
  }

  async getCharacter(
    actor: Actor,
    id: UUID,
    entitlement: EntitlementSnapshot,
  ): Promise<CharacterCatalogItem> {
    const character = await this.characters.findById(id);

    if (character === undefined) {
      throw new CharacterServiceError('CHARACTER_NOT_FOUND', 'Character was not found');
    }

    const item = this.toCatalogItem(character, actor, entitlement);

    if (item.availability === 'owner_only') {
      throw new CharacterServiceError(
        'CHARACTER_ACCESS_DENIED',
        'Character belongs to another user',
      );
    }

    return item;
  }

  async assertCanSelectCharacter(params: {
    actor: Actor;
    characterId: UUID;
    entitlement: EntitlementSnapshot;
    currentReminderId?: UUID;
  }): Promise<Character> {
    const item = await this.getCharacter(params.actor, params.characterId, params.entitlement);

    if (item.availability === 'pack_required') {
      throw characterPackRequired(item.purchaseTargetPackId ?? 'unknown');
    }

    const activeCharacterIds = await this.getActiveCharacterIds(
      params.actor.userId,
      params.currentReminderId,
    );

    if (
      !activeCharacterIds.has(params.characterId) &&
      activeCharacterIds.size >= params.entitlement.limits.activeCharacters
    ) {
      throw characterSelectionLimitExceeded(params.entitlement.limits.activeCharacters);
    }

    return item.character;
  }

  private toCatalogItem(
    character: Character,
    actor: Actor,
    entitlement: EntitlementSnapshot,
  ): CharacterCatalogItem {
    if (character.type === 'custom' && character.ownerUserId !== actor.userId) {
      return {
        character,
        availability: 'owner_only',
      };
    }

    if (
      character.type === 'pack' &&
      character.packId !== undefined &&
      character.packId !== null &&
      !entitlement.activeCharacterPackIds.includes(character.packId)
    ) {
      return {
        character,
        availability: 'pack_required',
        purchaseTargetPackId: character.packId,
      };
    }

    return {
      character,
      availability: 'available',
    };
  }

  private async getActiveCharacterIds(
    userId: UUID,
    currentReminderId: UUID | undefined,
  ): Promise<Set<UUID>> {
    const reminders = await this.reminders.listByUser(userId);

    return new Set(
      reminders
        .filter((reminder) => reminder.id !== currentReminderId)
        .filter(
          (reminder): reminder is Reminder =>
            reminder.status === 'active' && reminder.deletedAt == null,
        )
        .map((reminder) => reminder.characterId),
    );
  }
}
