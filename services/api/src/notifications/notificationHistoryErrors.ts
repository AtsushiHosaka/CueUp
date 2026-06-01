export type NotificationHistoryErrorCode =
  | 'NOTIFICATION_HISTORY_ACCESS_DENIED'
  | 'NOTIFICATION_HISTORY_NOT_FOUND';

export class NotificationHistoryServiceError extends Error {
  constructor(
    readonly code: NotificationHistoryErrorCode,
    message: string,
  ) {
    super(message);
  }
}
