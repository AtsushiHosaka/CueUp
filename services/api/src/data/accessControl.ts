import type { IsoDateTime, ReminderStatus, UserScopedRecord, UUID } from '@cueup/shared';

export type Actor = {
  userId: UUID;
  role: 'user' | 'admin';
};

export type OwnedRecord = UserScopedRecord & {
  deletedAt?: IsoDateTime | null;
  status?: ReminderStatus;
};

export class AccessDeniedError extends Error {
  readonly code = 'ACCESS_DENIED';

  constructor(action: string) {
    super(`Actor is not allowed to ${action} this record`);
  }
}

export class RecordNotFoundError extends Error {
  readonly code = 'RECORD_NOT_FOUND';

  constructor() {
    super('Record was not found');
  }
}

export function assertCanAccessRecord<TRecord extends OwnedRecord>(
  actor: Actor,
  record: TRecord | undefined,
  action: string,
): TRecord {
  if (record === undefined) {
    throw new RecordNotFoundError();
  }

  if (record.deletedAt !== undefined && record.deletedAt !== null) {
    throw new RecordNotFoundError();
  }

  if (actor.role !== 'admin' && record.userId !== actor.userId) {
    throw new AccessDeniedError(action);
  }

  return record;
}

export function filterAccessibleRecords<TRecord extends OwnedRecord>(
  actor: Actor,
  records: readonly TRecord[],
): TRecord[] {
  return records.filter((record) => {
    if (record.deletedAt !== undefined && record.deletedAt !== null) {
      return false;
    }

    return actor.role === 'admin' || record.userId === actor.userId;
  });
}

export function softDeleteRecord<TRecord extends OwnedRecord>(
  actor: Actor,
  record: TRecord,
  deletedAt: IsoDateTime,
): TRecord {
  const accessibleRecord = assertCanAccessRecord(actor, record, 'delete');

  return {
    ...accessibleRecord,
    deletedAt,
    status: accessibleRecord.status === undefined ? accessibleRecord.status : 'deleted',
  };
}

const sensitiveLogFields = new Set([
  'body',
  'catchphrases',
  'email',
  'note',
  'personaPrompt',
  'prohibitedStyle',
  'title',
  'tokenUsage',
]);

export function redactForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item));
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveLogFields.has(key) ? '[REDACTED]' : redactForLog(nestedValue),
    ]),
  );
}
