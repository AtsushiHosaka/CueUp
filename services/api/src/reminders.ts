import {
  FREE_PLAN_LIMITS,
  getPlanLimits,
  type IsoDateTime,
  type JsonObject,
  type Plan,
  type Reminder,
  type ReminderStatus,
  type UUID,
} from '@cueup/shared';
import { randomUUID } from 'node:crypto';

import {
  AccessDeniedError,
  RecordNotFoundError,
  assertCanAccessRecord,
  filterAccessibleRecords,
  softDeleteRecord,
  type Actor,
} from './data/accessControl.js';

export type ReminderInput = {
  title?: unknown;
  note?: unknown;
  scheduledAt?: unknown;
  recurrenceRule?: unknown;
  characterId?: unknown;
  folderId?: unknown;
  tagIds?: unknown;
  status?: unknown;
};

export type ReminderCompletionResult = {
  completed: Reminder;
  nextReminder?: Reminder;
};

export type ReminderRepository = {
  listAll(): Reminder[];
  getById(id: UUID): Reminder | undefined;
  save(reminder: Reminder): Reminder;
};

export type ReminderServiceOptions = {
  idFactory?: () => UUID;
  now?: () => Date;
};

export type ReminderErrorCode =
  | 'ACCESS_DENIED'
  | 'FREE_PLAN_LIMIT_REACHED'
  | 'PERSISTENCE_UNAVAILABLE'
  | 'RECORD_NOT_FOUND'
  | 'VALIDATION_ERROR';

export class ReminderServiceError extends Error {
  constructor(
    readonly code: ReminderErrorCode,
    message: string,
    readonly details: JsonObject = {},
  ) {
    super(message);
  }
}

export class InMemoryReminderRepository implements ReminderRepository {
  readonly #reminders = new Map<UUID, Reminder>();

  constructor(seedReminders: readonly Reminder[] = []) {
    for (const reminder of seedReminders) {
      this.#reminders.set(reminder.id, cloneReminder(reminder));
    }
  }

  listAll(): Reminder[] {
    return [...this.#reminders.values()].map((reminder) => cloneReminder(reminder));
  }

  getById(id: UUID): Reminder | undefined {
    const reminder = this.#reminders.get(id);

    return reminder === undefined ? undefined : cloneReminder(reminder);
  }

  save(reminder: Reminder): Reminder {
    this.#reminders.set(reminder.id, cloneReminder(reminder));

    return cloneReminder(reminder);
  }
}

export class ReminderService {
  readonly #repository: ReminderRepository;
  readonly #idFactory: () => UUID;
  readonly #now: () => Date;

  constructor(repository: ReminderRepository, options: ReminderServiceOptions = {}) {
    this.#repository = repository;
    this.#idFactory = options.idFactory ?? randomUUID;
    this.#now = options.now ?? (() => new Date());
  }

  list(actor: Actor): Reminder[] {
    const records = this.#readRepository(() => this.#repository.listAll());

    return filterAccessibleRecords(actor, records)
      .filter((reminder) => reminder.status !== 'deleted')
      .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  }

  get(actor: Actor, id: UUID): Reminder {
    return this.#getAccessibleReminder(actor, id, 'read');
  }

  create(actor: Actor, plan: Plan, input: ReminderInput): Reminder {
    const now = this.#now();
    const createdAt = now.toISOString();
    const fields = normalizeCreateInput(input, now);
    const activeCount = this.list(actor).filter(isReminderLimitActive).length;
    const limit = getPlanLimits(plan).activeReminders;

    if (plan === 'free' && activeCount >= limit) {
      throw new ReminderServiceError(
        'FREE_PLAN_LIMIT_REACHED',
        `Free active reminder limit is ${FREE_PLAN_LIMITS.activeReminders}`,
        {
          limitName: 'activeReminders',
          limit,
          plan,
          upgrade: {
            requiredPlan: 'pro',
          },
        },
      );
    }

    return this.#writeRepository(() =>
      this.#repository.save({
        id: this.#idFactory(),
        userId: actor.userId,
        title: fields.title,
        note: fields.note,
        scheduledAt: fields.scheduledAt,
        recurrenceRule: fields.recurrenceRule,
        characterId: fields.characterId,
        folderId: fields.folderId,
        tagIds: fields.tagIds,
        status: 'active',
        createdAt,
        updatedAt: createdAt,
      }),
    );
  }

  update(actor: Actor, id: UUID, input: ReminderInput): Reminder {
    const reminder = this.#getAccessibleReminder(actor, id, 'update');
    const fields = normalizeUpdateInput(input, this.#now());
    const updatedReminder = {
      ...reminder,
      ...fields,
      updatedAt: this.#now().toISOString(),
    };

    return this.#writeRepository(() => this.#repository.save(updatedReminder));
  }

  delete(actor: Actor, id: UUID): Reminder {
    const deletedAt = this.#now().toISOString();
    const reminder = this.#getAccessibleReminder(actor, id, 'delete');
    const deletedReminder = softDeleteRecord(actor, reminder, deletedAt);

    return this.#writeRepository(() => this.#repository.save(deletedReminder));
  }

  complete(actor: Actor, id: UUID): ReminderCompletionResult {
    const completedAt = this.#now().toISOString();
    const reminder = this.#getAccessibleReminder(actor, id, 'complete');
    const completed: Reminder = {
      ...reminder,
      status: 'completed',
      completedAt,
      updatedAt: completedAt,
    };
    const nextScheduledAt = calculateNextScheduledAt(
      reminder.scheduledAt,
      reminder.recurrenceRule,
      completedAt,
    );
    const savedCompleted = this.#writeRepository(() => this.#repository.save(completed));

    if (nextScheduledAt === null) {
      return {
        completed: savedCompleted,
      };
    }

    const nextReminder = this.#writeRepository(() =>
      this.#repository.save({
        ...reminder,
        id: this.#idFactory(),
        status: 'active',
        scheduledAt: nextScheduledAt,
        completedAt: null,
        deletedAt: null,
        createdAt: completedAt,
        updatedAt: completedAt,
      }),
    );

    return {
      completed: savedCompleted,
      nextReminder,
    };
  }

  #getAccessibleReminder(actor: Actor, id: UUID, action: string): Reminder {
    const reminder = this.#readRepository(() => this.#repository.getById(id));

    try {
      return assertCanAccessRecord(actor, reminder, action);
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        throw new ReminderServiceError('RECORD_NOT_FOUND', 'Reminder was not found');
      }

      if (error instanceof AccessDeniedError) {
        throw new ReminderServiceError('ACCESS_DENIED', 'Reminder belongs to another user');
      }

      throw error;
    }
  }

  #readRepository<TResult>(operation: () => TResult): TResult {
    try {
      return operation();
    } catch (error) {
      if (error instanceof ReminderServiceError) {
        throw error;
      }

      throw new ReminderServiceError('PERSISTENCE_UNAVAILABLE', 'Reminder storage is unavailable');
    }
  }

  #writeRepository<TResult>(operation: () => TResult): TResult {
    return this.#readRepository(operation);
  }
}

export function isReminderLimitActive(reminder: Reminder): boolean {
  return (
    reminder.deletedAt === undefined &&
    reminder.status !== 'completed' &&
    reminder.status !== 'deleted'
  );
}

export function calculateNextScheduledAt(
  scheduledAt: IsoDateTime,
  recurrenceRule: JsonObject | null | undefined,
  after: IsoDateTime,
): IsoDateTime | null {
  if (recurrenceRule === null || recurrenceRule === undefined) {
    return null;
  }

  const rule = normalizeRecurrenceRule(recurrenceRule);
  const afterTime = new Date(after).getTime();
  let nextDate = new Date(scheduledAt);

  do {
    nextDate = addRecurrenceInterval(nextDate, rule);
  } while (nextDate.getTime() <= afterTime);

  if (rule.until !== null && nextDate.getTime() > new Date(rule.until).getTime()) {
    return null;
  }

  return nextDate.toISOString();
}

function normalizeCreateInput(input: ReminderInput, now: Date): RequiredReminderFields {
  return {
    title: normalizeTitle(input.title),
    note: normalizeOptionalText(input.note, 'note'),
    scheduledAt: normalizeScheduledAt(input.scheduledAt, now),
    recurrenceRule: normalizeRecurrenceRuleInput(input.recurrenceRule),
    characterId: normalizeRequiredId(input.characterId, 'characterId'),
    folderId: normalizeOptionalId(input.folderId, 'folderId'),
    tagIds: normalizeTagIds(input.tagIds),
  };
}

function normalizeUpdateInput(input: ReminderInput, now: Date): Partial<RequiredReminderFields> {
  const fields: Partial<RequiredReminderFields> & { status?: ReminderStatus } = {};

  if (input.title !== undefined) {
    fields.title = normalizeTitle(input.title);
  }

  if (input.note !== undefined) {
    fields.note = normalizeOptionalText(input.note, 'note');
  }

  if (input.scheduledAt !== undefined) {
    fields.scheduledAt = normalizeScheduledAt(input.scheduledAt, now);
  }

  if (input.recurrenceRule !== undefined) {
    fields.recurrenceRule = normalizeRecurrenceRuleInput(input.recurrenceRule);
  }

  if (input.characterId !== undefined) {
    fields.characterId = normalizeRequiredId(input.characterId, 'characterId');
  }

  if (input.folderId !== undefined) {
    fields.folderId = normalizeOptionalId(input.folderId, 'folderId');
  }

  if (input.tagIds !== undefined) {
    fields.tagIds = normalizeTagIds(input.tagIds);
  }

  if (input.status !== undefined) {
    fields.status = normalizeMutableStatus(input.status);
  }

  return fields;
}

type RequiredReminderFields = {
  title: string;
  note: string | null;
  scheduledAt: IsoDateTime;
  recurrenceRule: JsonObject | null;
  characterId: UUID;
  folderId: UUID | null;
  tagIds: UUID[];
};

type NormalizedRecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  until: IsoDateTime | null;
};

function normalizeTitle(value: unknown): string {
  if (typeof value !== 'string') {
    throw validationError('title', 'Title is required');
  }

  const title = value.trim().replace(/\s+/g, ' ');

  if (title.length === 0) {
    throw validationError('title', 'Title is required');
  }

  if (title.length > 120) {
    throw validationError('title', 'Title must be 120 characters or fewer');
  }

  return title;
}

function normalizeOptionalText(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw validationError(field, `${field} must be a string`);
  }

  const text = value.trim();

  return text.length === 0 ? null : text;
}

function normalizeScheduledAt(value: unknown, now: Date): IsoDateTime {
  if (typeof value !== 'string') {
    throw validationError('scheduledAt', 'scheduledAt is required');
  }

  const scheduledAt = new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw validationError('scheduledAt', 'scheduledAt must be a valid ISO datetime');
  }

  if (scheduledAt.getTime() <= now.getTime()) {
    throw validationError('scheduledAt', 'scheduledAt must be in the future');
  }

  return scheduledAt.toISOString();
}

function normalizeRequiredId(value: unknown, field: string): UUID {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(field, `${field} is required`);
  }

  return value.trim();
}

function normalizeOptionalId(value: unknown, field: string): UUID | null {
  if (value === undefined || value === null) {
    return null;
  }

  return normalizeRequiredId(value, field);
}

function normalizeTagIds(value: unknown): UUID[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw validationError('tagIds', 'tagIds must be an array');
  }

  return value.map((tagId) => normalizeRequiredId(tagId, 'tagIds'));
}

function normalizeMutableStatus(value: unknown): ReminderStatus {
  if (value === 'active' || value === 'snoozed') {
    return value;
  }

  throw validationError('status', 'status can only be active or snoozed through update');
}

function normalizeRecurrenceRuleInput(value: unknown): JsonObject | null {
  if (value === undefined || value === null) {
    return null;
  }

  const rule = normalizeRecurrenceRule(value);

  return {
    frequency: rule.frequency,
    interval: rule.interval,
    until: rule.until,
  };
}

function normalizeRecurrenceRule(value: unknown): NormalizedRecurrenceRule {
  if (!isRecord(value)) {
    throw validationError('recurrenceRule', 'recurrenceRule must be an object');
  }

  const { frequency, interval, until } = value;

  if (frequency !== 'daily' && frequency !== 'weekly' && frequency !== 'monthly') {
    throw validationError('recurrenceRule.frequency', 'Unsupported recurrence frequency');
  }

  const normalizedInterval = interval ?? 1;

  if (
    typeof normalizedInterval !== 'number' ||
    !Number.isInteger(normalizedInterval) ||
    normalizedInterval < 1 ||
    normalizedInterval > 366
  ) {
    throw validationError(
      'recurrenceRule.interval',
      'interval must be an integer between 1 and 366',
    );
  }

  if (until !== undefined && until !== null) {
    if (typeof until !== 'string' || Number.isNaN(new Date(until).getTime())) {
      throw validationError('recurrenceRule.until', 'until must be a valid ISO datetime');
    }

    return {
      frequency,
      interval: normalizedInterval,
      until: new Date(until).toISOString(),
    };
  }

  return {
    frequency,
    interval: normalizedInterval,
    until: null,
  };
}

function addRecurrenceInterval(date: Date, rule: NormalizedRecurrenceRule): Date {
  const nextDate = new Date(date);

  if (rule.frequency === 'daily') {
    nextDate.setUTCDate(nextDate.getUTCDate() + rule.interval);
  }

  if (rule.frequency === 'weekly') {
    nextDate.setUTCDate(nextDate.getUTCDate() + rule.interval * 7);
  }

  if (rule.frequency === 'monthly') {
    nextDate.setUTCMonth(nextDate.getUTCMonth() + rule.interval);
  }

  return nextDate;
}

function validationError(field: string, message: string): ReminderServiceError {
  return new ReminderServiceError('VALIDATION_ERROR', message, { field });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneReminder(reminder: Reminder): Reminder {
  const clonedReminder: Reminder = {
    ...reminder,
  };

  if (reminder.recurrenceRule !== undefined && reminder.recurrenceRule !== null) {
    clonedReminder.recurrenceRule = { ...reminder.recurrenceRule };
  }

  if (reminder.tagIds !== undefined) {
    clonedReminder.tagIds = [...reminder.tagIds];
  }

  return clonedReminder;
}
