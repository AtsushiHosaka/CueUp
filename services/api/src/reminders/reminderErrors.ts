export type ReminderErrorCode =
  | 'REMINDER_ACCESS_DENIED'
  | 'REMINDER_FREE_LIMIT_EXCEEDED'
  | 'REMINDER_NOT_FOUND'
  | 'REMINDER_PERSISTENCE_UNAVAILABLE'
  | 'REMINDER_SNOOZE_LIMIT_EXCEEDED'
  | 'REMINDER_VALIDATION_ERROR';

export class ReminderServiceError extends Error {
  constructor(
    readonly code: ReminderErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function validationError(message: string, field: string): ReminderServiceError {
  return new ReminderServiceError('REMINDER_VALIDATION_ERROR', message, { field });
}

export function freeLimitExceeded(limit: number): ReminderServiceError {
  return new ReminderServiceError(
    'REMINDER_FREE_LIMIT_EXCEEDED',
    `Free plan active reminder limit of ${limit} reached`,
    {
      limit,
      upgradeTarget: 'pro',
    },
  );
}

export function persistenceUnavailable(): ReminderServiceError {
  return new ReminderServiceError(
    'REMINDER_PERSISTENCE_UNAVAILABLE',
    'Reminder storage is unavailable',
  );
}
