export type OrganizerErrorCode =
  | 'ORGANIZER_ACCESS_DENIED'
  | 'ORGANIZER_DUPLICATE_NAME'
  | 'ORGANIZER_FOLDER_LIMIT_EXCEEDED'
  | 'ORGANIZER_NOT_FOUND'
  | 'ORGANIZER_TAG_LIMIT_EXCEEDED'
  | 'ORGANIZER_VALIDATION_ERROR';

export class OrganizerServiceError extends Error {
  constructor(
    readonly code: OrganizerErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function organizerValidationError(message: string, field: string): OrganizerServiceError {
  return new OrganizerServiceError('ORGANIZER_VALIDATION_ERROR', message, { field });
}

export function organizerDuplicateName(
  kind: 'folder' | 'tag',
  name: string,
): OrganizerServiceError {
  return new OrganizerServiceError('ORGANIZER_DUPLICATE_NAME', `${kind} name already exists`, {
    kind,
    name,
  });
}

export function folderLimitExceeded(limit: number): OrganizerServiceError {
  return new OrganizerServiceError(
    'ORGANIZER_FOLDER_LIMIT_EXCEEDED',
    `Folder limit of ${limit} reached`,
    {
      limit,
      upgradeTarget: 'pro',
    },
  );
}

export function tagLimitExceeded(limit: number): OrganizerServiceError {
  return new OrganizerServiceError(
    'ORGANIZER_TAG_LIMIT_EXCEEDED',
    `Tag limit of ${limit} reached`,
    {
      limit,
      upgradeTarget: 'pro',
    },
  );
}
