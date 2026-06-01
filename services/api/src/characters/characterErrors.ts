export type CharacterErrorCode =
  | 'CHARACTER_ACCESS_DENIED'
  | 'CHARACTER_NOT_FOUND'
  | 'CHARACTER_PACK_REQUIRED'
  | 'CHARACTER_SELECTION_LIMIT_EXCEEDED';

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
