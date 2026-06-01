import type { Character, EntitlementSnapshot, IsoDateTime, UUID } from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import {
  characterCustomLimitExceeded,
  characterIconUnavailable,
  characterSafetyReviewRequired,
  CharacterServiceError,
  characterValidationError,
} from './characterErrors.js';
import type { CharacterRepository } from './characterRepository.js';
import { reviewCharacterSafety } from './characterSafety.js';

export type CreateCustomCharacterInput = {
  name?: unknown;
  relationship?: unknown;
  tone?: unknown;
  strictness?: unknown;
  warmth?: unknown;
  catchphrases?: unknown;
  prohibitedStyle?: unknown;
  iconUrl?: unknown;
};

export type UpdateCustomCharacterInput = Partial<CreateCustomCharacterInput>;

export type IconValidationResult =
  | {
      allowed: true;
      iconUrl: string | null;
    }
  | {
      allowed: false;
      reason: string;
    };

export interface CharacterIconValidator {
  validateIcon(iconUrl: string | null): Promise<IconValidationResult>;
}

export class StaticIconValidator implements CharacterIconValidator {
  async validateIcon(iconUrl: string | null): Promise<IconValidationResult> {
    if (iconUrl === null) {
      return {
        allowed: true,
        iconUrl: null,
      };
    }

    if (!/^https:\/\/[^\s]+$/i.test(iconUrl)) {
      return {
        allowed: false,
        reason: 'icon_url_must_be_https',
      };
    }

    return {
      allowed: true,
      iconUrl,
    };
  }
}

type NormalizedCharacterInput = {
  name: string;
  relationship: string;
  tone: string;
  strictness: number;
  warmth: number;
  catchphrases: string[];
  prohibitedStyle: string[];
  iconUrl: string | null;
};

export class CustomCharacterService {
  constructor(
    private readonly characters: CharacterRepository,
    private readonly idFactory: () => UUID,
    private readonly iconValidator: CharacterIconValidator = new StaticIconValidator(),
  ) {}

  async createCustomCharacter(params: {
    actor: Actor;
    entitlement: EntitlementSnapshot;
    input: unknown;
    now: IsoDateTime;
  }): Promise<Character> {
    const customCharacters = await this.characters.listCustomByOwner(params.actor.userId);

    if (customCharacters.length >= params.entitlement.limits.customCharacters) {
      throw characterCustomLimitExceeded(params.entitlement.limits.customCharacters);
    }

    const normalized = await this.normalizeAndReview(requireInputObject(params.input));
    const character = this.buildCharacter({
      actor: params.actor,
      id: this.idFactory(),
      input: normalized,
      now: params.now,
    });

    return this.characters.save(character);
  }

  async updateCustomCharacter(params: {
    actor: Actor;
    id: UUID;
    input: unknown;
    now: IsoDateTime;
  }): Promise<Character> {
    const input = requireInputObject(params.input) as UpdateCustomCharacterInput;
    const existing = await this.characters.findById(params.id);

    if (existing === undefined || existing.type !== 'custom') {
      throw new CharacterServiceError('CHARACTER_NOT_FOUND', 'Custom character was not found');
    }

    if (existing.ownerUserId !== params.actor.userId) {
      throw new CharacterServiceError(
        'CHARACTER_ACCESS_DENIED',
        'Custom character belongs to another user',
      );
    }

    const normalized = await this.normalizeAndReview({
      name: input.name ?? existing.name,
      relationship: input.relationship ?? existing.relationship,
      tone: input.tone ?? existing.tone,
      strictness: input.strictness ?? existing.strictness,
      warmth: input.warmth ?? existing.warmth,
      catchphrases: input.catchphrases ?? existing.catchphrases,
      prohibitedStyle: input.prohibitedStyle ?? existing.prohibitedStyle,
      iconUrl: Object.hasOwn(input, 'iconUrl') ? input.iconUrl : existing.iconUrl,
    });

    return this.characters.save({
      ...existing,
      name: normalized.name,
      description: buildDescription(normalized),
      relationship: normalized.relationship,
      tone: normalized.tone,
      personaPrompt: buildPersonaPrompt(normalized),
      strictness: normalized.strictness,
      warmth: normalized.warmth,
      catchphrases: normalized.catchphrases,
      prohibitedStyle: normalized.prohibitedStyle,
      iconUrl: normalized.iconUrl,
      safetyReviewStatus: 'approved',
      safetyReviewReason: null,
      updatedAt: params.now,
    });
  }

  private async normalizeAndReview(
    input: CreateCustomCharacterInput,
  ): Promise<NormalizedCharacterInput> {
    const normalized = {
      name: requiredString(input.name, 'name', 40),
      relationship: requiredString(input.relationship, 'relationship', 40),
      tone: requiredString(input.tone, 'tone', 80),
      strictness: numberInRange(input.strictness, 'strictness', 0, 10),
      warmth: numberInRange(input.warmth, 'warmth', 0, 10),
      catchphrases: optionalStringList(input.catchphrases, 'catchphrases', 5, 40),
      prohibitedStyle: optionalStringList(input.prohibitedStyle, 'prohibitedStyle', 10, 80),
      iconUrl: optionalIconUrl(input.iconUrl),
    };

    const safetyIssue = reviewCharacterSafety({
      name: normalized.name,
      relationship: normalized.relationship,
      tone: normalized.tone,
      catchphrases: normalized.catchphrases,
      prohibitedStyle: normalized.prohibitedStyle,
    });

    if (safetyIssue !== undefined) {
      throw characterSafetyReviewRequired(safetyIssue.reason, safetyIssue.field);
    }

    const icon = await this.iconValidator.validateIcon(normalized.iconUrl);

    if (!icon.allowed) {
      throw characterIconUnavailable(icon.reason);
    }

    return {
      ...normalized,
      iconUrl: icon.iconUrl,
    };
  }

  private buildCharacter(params: {
    actor: Actor;
    id: UUID;
    input: NormalizedCharacterInput;
    now: IsoDateTime;
  }): Character {
    return {
      id: params.id,
      ownerUserId: params.actor.userId,
      type: 'custom',
      name: params.input.name,
      description: buildDescription(params.input),
      relationship: params.input.relationship,
      tone: params.input.tone,
      personaPrompt: buildPersonaPrompt(params.input),
      strictness: params.input.strictness,
      warmth: params.input.warmth,
      catchphrases: params.input.catchphrases,
      prohibitedStyle: params.input.prohibitedStyle,
      iconUrl: params.input.iconUrl,
      packId: null,
      safetyReviewStatus: 'approved',
      safetyReviewReason: null,
      createdAt: params.now,
      updatedAt: params.now,
    };
  }
}

function requireInputObject(input: unknown): CreateCustomCharacterInput {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw characterValidationError('Request body must be a JSON object', 'body');
  }

  return input as CreateCustomCharacterInput;
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw characterValidationError(`${field} is required`, field);
  }

  const normalized = value.trim().replace(/\s+/g, ' ');

  if (normalized.length === 0) {
    throw characterValidationError(`${field} is required`, field);
  }

  if (normalized.length > maxLength) {
    throw characterValidationError(`${field} must be ${maxLength} characters or fewer`, field);
  }

  return normalized;
}

function numberInRange(value: unknown, field: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw characterValidationError(`${field} must be an integer`, field);
  }

  if (value < minimum || value > maximum) {
    throw characterValidationError(`${field} must be between ${minimum} and ${maximum}`, field);
  }

  return value;
}

function optionalStringList(
  value: unknown,
  field: string,
  maxItems: number,
  maxLength: number,
): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw characterValidationError(`${field} must be a string array`, field);
  }

  if (value.length > maxItems) {
    throw characterValidationError(`${field} must include ${maxItems} items or fewer`, field);
  }

  return value.map((item) => requiredString(item, field, maxLength));
}

function optionalIconUrl(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw characterValidationError('iconUrl must be a string', 'iconUrl');
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > 2048) {
    throw characterValidationError('iconUrl must be 2048 characters or fewer', 'iconUrl');
  }

  return normalized;
}

function buildDescription(input: NormalizedCharacterInput): string {
  return `${input.relationship} / ${input.tone}`;
}

function buildPersonaPrompt(input: NormalizedCharacterInput): string {
  const catchphrases = input.catchphrases.length > 0 ? input.catchphrases.join(', ') : 'none';
  const prohibitedStyle =
    input.prohibitedStyle.length > 0 ? input.prohibitedStyle.join(', ') : 'none';

  return [
    `Original fictional character: ${input.name}`,
    `Relationship to user: ${input.relationship}`,
    `Tone: ${input.tone}`,
    `Strictness: ${input.strictness}/10`,
    `Warmth: ${input.warmth}/10`,
    `Catchphrases: ${catchphrases}`,
    `Do not use: ${prohibitedStyle}`,
    'Avoid real people, portraits, trademarks, and direct quotations.',
  ].join('\n');
}
