export type AuthErrorCode =
  | 'AUTH_ACCOUNT_DELETED'
  | 'AUTH_ACCOUNT_DUPLICATE'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_REQUIRED'
  | 'AUTH_TOKEN_EXPIRED';

export class AuthServiceError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
  }
}
