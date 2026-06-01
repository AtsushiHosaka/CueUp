import type {
  EntitlementSnapshot,
  IsoDateTime,
  Reminder,
  ReminderRecurrenceRule,
  UUID,
} from '@cueup/shared';

import {
  AccessDeniedError,
  RecordNotFoundError,
  assertCanAccessRecord,
  filterAccessibleRecords,
  softDeleteRecord,
  type Actor,
} from '../data/accessControl.js';
import { freeLimitExceeded, ReminderServiceError, validationError } from './reminderErrors.js';
import type { ReminderRepository } from './reminderRepository.js';
import { getNextScheduledAt, validateRecurrenceRule } from './recurrence.js';

export type CreateReminderInput = {
  title: string;
  note?: string | null;
  scheduledAt: IsoDateTime;
  recurrenceRule?: ReminderRecurrenceRule | null;
  characterId: UUID;
  folderId?: UUID | null;
};

export type UpdateReminderInput = Partial<CreateReminderInput>;

export type CompleteReminderResult = {
  completed: Reminder;
  nextReminder?: Reminder;
};

export type ReminderIdFactory = () => UUID;

export class ReminderService {
  constructor(
    private readonly repository: ReminderRepository,
    private readonly idFactory: ReminderIdFactory,
  ) {}

  async listReminders(actor: Actor): Promise<Reminder[]> {
    const records = await this.repository.listByUser(actor.userId);

    return filterAccessibleRecords(actor, records).sort((a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt),
    );
  }

  async getReminder(actor: Actor, id: UUID): Promise<Reminder> {
    return this.requireAccessible(actor, await this.repository.findById(id), 'read');
  }

  async createReminder(params: {
    actor: Actor;
    input: CreateReminderInput;
    entitlement: EntitlementSnapshot;
    now: IsoDateTime;
  }): Promise<Reminder> {
    const activeReminderCount = (await this.listReminders(params.actor)).filter(
      (reminder) => reminder.status === 'active',
    ).length;

    if (activeReminderCount >= params.entitlement.limits.activeReminders) {
      throw freeLimitExceeded(params.entitlement.limits.activeReminders);
    }

    const reminder = buildReminder({
      id: this.idFactory(),
      userId: params.actor.userId,
      input: params.input,
      now: params.now,
    });

    return this.repository.save(reminder);
  }

  async updateReminder(params: {
    actor: Actor;
    id: UUID;
    input: UpdateReminderInput;
    now: IsoDateTime;
  }): Promise<Reminder> {
    const existing = await this.getReminder(params.actor, params.id);
    const reminder = buildReminder({
      id: existing.id,
      userId: existing.userId,
      input: {
        title: params.input.title ?? existing.title,
        note: params.input.note ?? existing.note ?? null,
        scheduledAt: params.input.scheduledAt ?? existing.scheduledAt,
        recurrenceRule:
          params.input.recurrenceRule === undefined
            ? (existing.recurrenceRule ?? null)
            : params.input.recurrenceRule,
        characterId: params.input.characterId ?? existing.characterId,
        folderId:
          params.input.folderId === undefined ? (existing.folderId ?? null) : params.input.folderId,
      },
      now: existing.createdAt,
    });

    return this.repository.save({
      ...existing,
      ...reminder,
      createdAt: existing.createdAt,
      updatedAt: params.now,
      completedAt: existing.completedAt ?? null,
      deletedAt: existing.deletedAt ?? null,
      status: existing.status,
    });
  }

  async deleteReminder(params: { actor: Actor; id: UUID; now: IsoDateTime }): Promise<Reminder> {
    const existing = await this.getReminder(params.actor, params.id);
    const deleted = softDeleteRecord(params.actor, existing, params.now);

    return this.repository.save({
      ...deleted,
      updatedAt: params.now,
    });
  }

  async completeReminder(params: {
    actor: Actor;
    id: UUID;
    now: IsoDateTime;
  }): Promise<CompleteReminderResult> {
    const existing = await this.getReminder(params.actor, params.id);
    const completed = await this.repository.save({
      ...existing,
      status: 'completed',
      completedAt: params.now,
      updatedAt: params.now,
    });
    const recurrenceRule = validateRecurrenceRule(existing.recurrenceRule);

    if (recurrenceRule === null) {
      return { completed };
    }

    const nextReminder = await this.repository.save({
      ...existing,
      id: this.idFactory(),
      status: 'active',
      scheduledAt: getNextScheduledAt(existing.scheduledAt, recurrenceRule),
      completedAt: null,
      deletedAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });

    return { completed, nextReminder };
  }

  private requireAccessible(
    actor: Actor,
    reminder: Reminder | undefined,
    action: string,
  ): Reminder {
    try {
      return assertCanAccessRecord(actor, reminder, action);
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        throw new ReminderServiceError('REMINDER_ACCESS_DENIED', error.message);
      }

      if (error instanceof RecordNotFoundError) {
        throw new ReminderServiceError('REMINDER_NOT_FOUND', error.message);
      }

      throw error;
    }
  }
}

function buildReminder(params: {
  id: UUID;
  userId: UUID;
  input: CreateReminderInput;
  now: IsoDateTime;
}): Reminder {
  const title = params.input.title.trim();

  if (title.length === 0) {
    throw validationError('Reminder title is required', 'title');
  }

  if (params.input.characterId.trim().length === 0) {
    throw validationError('Reminder characterId is required', 'characterId');
  }

  const scheduledAt = new Date(params.input.scheduledAt);
  const now = new Date(params.now);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw validationError('scheduledAt must be a valid ISO date', 'scheduledAt');
  }

  if (scheduledAt.getTime() <= now.getTime()) {
    throw validationError('scheduledAt must be in the future', 'scheduledAt');
  }

  return {
    id: params.id,
    userId: params.userId,
    title,
    note: params.input.note ?? null,
    scheduledAt: scheduledAt.toISOString(),
    recurrenceRule: validateRecurrenceRule(params.input.recurrenceRule),
    characterId: params.input.characterId,
    folderId: params.input.folderId ?? null,
    status: 'active',
    createdAt: params.now,
    updatedAt: params.now,
  };
}
