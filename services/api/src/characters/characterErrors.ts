export type CharacterErrorCode =
  | 'CHARACTER_ACCESS_DENIED'
  | 'CHARACTER_CUSTOM_LIMIT_EXCEEDED'
  | 'CHARACTER_ICON_UNAVAILABLE'
  | 'CHARACTER_NOT_FOUND'
  | 'CHARACTER_PACK_REQUIRED'
  | 'CHARACTER_SAFETY_REVIEW_REQUIRED'
  | 'CHARACTER_SELECTION_LIMIT_EXCEEDED'
  | 'CHARACTER_VALIDATION_ERROR';

export class CharacterServiceError extends Error {
  constructor(
    readonly code: CharacterErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function characterPackRequired(packId: string): CharacterServiceError {
  return new CharacterServiceError(
    'CHARACTER_PACK_REQUIRED',
    'Character Pack purchase is required',
    {
      packId,
      purchaseTarget: 'character_pack',
    },
  );
}

export function characterSelectionLimitExceeded(limit: number): CharacterServiceError {
  return new CharacterServiceError(
    'CHARACTER_SELECTION_LIMIT_EXCEEDED',
    `Free plan active character limit of ${limit} reached`,
    {
      limit,
      upgradeTarget: 'pro',
    },
  );
}

export function characterCustomLimitExceeded(limit: number): CharacterServiceError {
  return new CharacterServiceError(
    'CHARACTER_CUSTOM_LIMIT_EXCEEDED',
    `Custom character limit of ${limit} reached`,
    {
      limit,
      upgradeTarget: 'pro',
    },
  );
}

export function characterValidationError(message: string, field: string): CharacterServiceError {
  return new CharacterServiceError('CHARACTER_VALIDATION_ERROR', message, { field });
}

export function characterSafetyReviewRequired(
  reason: string,
  field: string,
): CharacterServiceError {
  return new CharacterServiceError(
    'CHARACTER_SAFETY_REVIEW_REQUIRED',
    'Character settings require review before saving',
    {
      reason,
      field,
    },
  );
}

export function characterIconUnavailable(reason: string): CharacterServiceError {
  return new CharacterServiceError(
    'CHARACTER_ICON_UNAVAILABLE',
    'Character icon could not be accepted',
    {
      reason,
    },
  );
}
