export type ChatErrorCode =
  | 'CHAT_ACCESS_DENIED'
  | 'CHAT_CHARACTER_UNAVAILABLE'
  | 'CHAT_FREE_LIMIT_EXCEEDED'
  | 'CHAT_NOT_FOUND'
  | 'CHAT_PROVIDER_UNAVAILABLE'
  | 'CHAT_VALIDATION_ERROR';

export class ChatServiceError extends Error {
  constructor(
    readonly code: ChatErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function chatValidationError(message: string, field: string): ChatServiceError {
  return new ChatServiceError('CHAT_VALIDATION_ERROR', message, { field });
}

export function chatLimitExceeded(limit: number): ChatServiceError {
  return new ChatServiceError(
    'CHAT_FREE_LIMIT_EXCEEDED',
    `Monthly chat limit of ${limit} messages has been reached`,
    {
      limit,
      upgradeTarget: 'pro',
    },
  );
}
