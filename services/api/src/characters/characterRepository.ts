import type { Character, UUID } from '@cueup/shared';

import { SEEDED_CHARACTERS } from './seedCharacters.js';

export interface CharacterRepository {
  findById(id: UUID): Promise<Character | undefined>;
  listAll(): Promise<Character[]>;
  listCustomByOwner(userId: UUID): Promise<Character[]>;
  save(character: Character): Promise<Character>;
}

export class InMemoryCharacterRepository implements CharacterRepository {
  private readonly characters = new Map<UUID, Character>();

  constructor(initialCharacters: Character[] = SEEDED_CHARACTERS) {
    for (const character of initialCharacters) {
      this.characters.set(character.id, character);
    }
  }

  async findById(id: UUID): Promise<Character | undefined> {
    return this.characters.get(id);
  }

  async listAll(): Promise<Character[]> {
    return [...this.characters.values()];
  }

  async listCustomByOwner(userId: UUID): Promise<Character[]> {
    return [...this.characters.values()].filter(
      (character) => character.type === 'custom' && character.ownerUserId === userId,
    );
  }

  async save(character: Character): Promise<Character> {
    this.characters.set(character.id, character);
    return character;
  }
}
