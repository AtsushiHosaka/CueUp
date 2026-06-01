import type { EntitlementSnapshot, Folder, Reminder, Tag, UUID } from '@cueup/shared';

import {
  AccessDeniedError,
  RecordNotFoundError,
  assertCanAccessRecord,
  filterAccessibleRecords,
  type Actor,
} from '../data/accessControl.js';
import type { ReminderRepository } from '../reminders/reminderRepository.js';
import {
  folderLimitExceeded,
  organizerDuplicateName,
  OrganizerServiceError,
  organizerValidationError,
  tagLimitExceeded,
} from './organizerErrors.js';
import type { OrganizerRepository } from './organizerRepository.js';

export type OrganizerIdFactory = () => UUID;

export type CreateFolderInput = {
  name: string;
  color?: string | null;
  sortOrder?: number;
};

export type UpdateFolderInput = Partial<CreateFolderInput>;

export type CreateTagInput = {
  name: string;
  color?: string | null;
};

export type UpdateTagInput = Partial<CreateTagInput>;

export type SmartListKind = 'character' | 'folder' | 'home' | 'overdue' | 'tag' | 'today' | 'work';

export type SmartListParams = {
  actor: Actor;
  kind: SmartListKind;
  now: Date;
  characterId?: UUID | undefined;
  folderId?: UUID | undefined;
  tagId?: UUID | undefined;
};

export class OrganizerService {
  constructor(
    private readonly organizerRepository: OrganizerRepository,
    private readonly reminderRepository: ReminderRepository,
    private readonly idFactory: OrganizerIdFactory,
  ) {}

  async listFolders(actor: Actor): Promise<Folder[]> {
    return (await this.organizerRepository.listFoldersByUser(actor.userId)).sort(compareFolders);
  }

  async createFolder(params: {
    actor: Actor;
    input: CreateFolderInput;
    entitlement: EntitlementSnapshot;
    now: string;
  }): Promise<Folder> {
    const folders = await this.listFolders(params.actor);

    if (folders.length >= params.entitlement.limits.folders) {
      throw folderLimitExceeded(params.entitlement.limits.folders);
    }

    const name = normalizeName(params.input.name, 'name');
    assertUniqueName(folders, name, 'folder');

    return this.organizerRepository.saveFolder({
      id: this.idFactory(),
      userId: params.actor.userId,
      name,
      color: params.input.color ?? null,
      sortOrder: params.input.sortOrder ?? nextSortOrder(folders),
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  async updateFolder(params: {
    actor: Actor;
    id: UUID;
    input: UpdateFolderInput;
    now: string;
  }): Promise<Folder> {
    const folder = this.requireFolder(
      params.actor,
      await this.organizerRepository.findFolderById(params.id),
    );
    const folders = (await this.listFolders(params.actor)).filter((item) => item.id !== folder.id);
    const name =
      params.input.name === undefined ? folder.name : normalizeName(params.input.name, 'name');

    assertUniqueName(folders, name, 'folder');

    return this.organizerRepository.saveFolder({
      ...folder,
      name,
      color: params.input.color === undefined ? (folder.color ?? null) : params.input.color,
      sortOrder: params.input.sortOrder ?? folder.sortOrder,
      updatedAt: params.now,
    });
  }

  async deleteFolder(params: { actor: Actor; id: UUID; now: string }): Promise<Folder> {
    const folder = this.requireFolder(
      params.actor,
      await this.organizerRepository.findFolderById(params.id),
    );
    const reminders = await this.reminderRepository.listByUser(params.actor.userId);

    for (const reminder of filterAccessibleRecords(params.actor, reminders)) {
      if (reminder.folderId === folder.id) {
        await this.reminderRepository.save({
          ...reminder,
          folderId: null,
          updatedAt: params.now,
        });
      }
    }

    await this.organizerRepository.deleteFolder(folder.id);
    return folder;
  }

  async listTags(actor: Actor): Promise<Tag[]> {
    return (await this.organizerRepository.listTagsByUser(actor.userId)).sort(compareTags);
  }

  async createTag(params: {
    actor: Actor;
    input: CreateTagInput;
    entitlement: EntitlementSnapshot;
    now: string;
  }): Promise<Tag> {
    const tags = await this.listTags(params.actor);

    if (tags.length >= params.entitlement.limits.tags) {
      throw tagLimitExceeded(params.entitlement.limits.tags);
    }

    const name = normalizeName(params.input.name, 'name');
    assertUniqueName(tags, name, 'tag');

    return this.organizerRepository.saveTag({
      id: this.idFactory(),
      userId: params.actor.userId,
      name,
      color: params.input.color ?? null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  async updateTag(params: {
    actor: Actor;
    id: UUID;
    input: UpdateTagInput;
    now: string;
  }): Promise<Tag> {
    const tag = this.requireTag(
      params.actor,
      await this.organizerRepository.findTagById(params.id),
    );
    const tags = (await this.listTags(params.actor)).filter((item) => item.id !== tag.id);
    const name =
      params.input.name === undefined ? tag.name : normalizeName(params.input.name, 'name');

    assertUniqueName(tags, name, 'tag');

    return this.organizerRepository.saveTag({
      ...tag,
      name,
      color: params.input.color === undefined ? (tag.color ?? null) : params.input.color,
      updatedAt: params.now,
    });
  }

  async deleteTag(params: { actor: Actor; id: UUID; now: string }): Promise<Tag> {
    const tag = this.requireTag(
      params.actor,
      await this.organizerRepository.findTagById(params.id),
    );
    const reminders = await this.reminderRepository.listByUser(params.actor.userId);

    for (const reminder of filterAccessibleRecords(params.actor, reminders)) {
      if ((reminder.tagIds ?? []).includes(tag.id)) {
        await this.reminderRepository.save({
          ...reminder,
          tagIds: (reminder.tagIds ?? []).filter((tagId) => tagId !== tag.id),
          updatedAt: params.now,
        });
      }
    }

    await this.organizerRepository.removeTagAssignments(tag.id);
    await this.organizerRepository.deleteTag(tag.id);
    return tag;
  }

  async setReminderTags(params: {
    actor: Actor;
    reminderId: UUID;
    tagIds: UUID[];
    now: string;
  }): Promise<Tag[]> {
    const reminder = await this.requireReminder(params.actor, params.reminderId);
    const uniqueTagIds = [...new Set(params.tagIds)];
    const tags = await Promise.all(
      uniqueTagIds.map(async (tagId) =>
        this.requireTag(params.actor, await this.organizerRepository.findTagById(tagId)),
      ),
    );

    await this.organizerRepository.replaceReminderTags(reminder.id, uniqueTagIds);
    await this.reminderRepository.save({
      ...reminder,
      tagIds: uniqueTagIds,
      updatedAt: params.now,
    });

    return tags.sort(compareTags);
  }

  async listReminderTags(params: { actor: Actor; reminderId: UUID }): Promise<Tag[]> {
    const reminder = await this.requireReminder(params.actor, params.reminderId);
    const tagIds = new Set([
      ...(reminder.tagIds ?? []),
      ...(await this.organizerRepository.listReminderTags())
        .filter((assignment) => assignment.reminderId === reminder.id)
        .map((assignment) => assignment.tagId),
    ]);
    const tags = await this.listTags(params.actor);

    return tags.filter((tag) => tagIds.has(tag.id));
  }

  async listSmartList(params: SmartListParams): Promise<Reminder[]> {
    const reminders = filterAccessibleRecords(
      params.actor,
      await this.reminderRepository.listByUser(params.actor.userId),
    ).filter(isOpenReminder);

    switch (params.kind) {
      case 'today':
        return reminders
          .filter((reminder) => isSameUtcDay(reminder.scheduledAt, params.now))
          .sort(compareReminders);
      case 'overdue':
        return reminders
          .filter((reminder) => new Date(reminder.scheduledAt).getTime() < params.now.getTime())
          .sort(compareReminders);
      case 'folder':
        return this.listFolderSmartList(params, reminders);
      case 'character':
        return this.listCharacterSmartList(params, reminders);
      case 'tag':
        return this.listTagSmartList(params, reminders);
      case 'work':
        return this.listNamedTagSmartList(params.actor, reminders, ['work', '仕事']);
      case 'home':
        return this.listNamedTagSmartList(params.actor, reminders, ['home', '家事']);
    }
  }

  private async listFolderSmartList(
    params: SmartListParams,
    reminders: Reminder[],
  ): Promise<Reminder[]> {
    const folderId = requireIdParam(params.folderId, 'folderId');

    this.requireFolder(params.actor, await this.organizerRepository.findFolderById(folderId));
    return reminders.filter((reminder) => reminder.folderId === folderId).sort(compareReminders);
  }

  private async listCharacterSmartList(
    params: SmartListParams,
    reminders: Reminder[],
  ): Promise<Reminder[]> {
    const characterId = requireIdParam(params.characterId, 'characterId');

    return reminders
      .filter((reminder) => reminder.characterId === characterId)
      .sort(compareReminders);
  }

  private async listTagSmartList(
    params: SmartListParams,
    reminders: Reminder[],
  ): Promise<Reminder[]> {
    const tagId = requireIdParam(params.tagId, 'tagId');

    this.requireTag(params.actor, await this.organizerRepository.findTagById(tagId));
    return this.filterRemindersByTagIds(reminders, new Set([tagId]));
  }

  private async listNamedTagSmartList(
    actor: Actor,
    reminders: Reminder[],
    names: string[],
  ): Promise<Reminder[]> {
    const normalizedNames = new Set(names.map(normalizeComparableName));
    const tagIds = new Set(
      (await this.listTags(actor))
        .filter((tag) => normalizedNames.has(normalizeComparableName(tag.name)))
        .map((tag) => tag.id),
    );

    return this.filterRemindersByTagIds(reminders, tagIds);
  }

  private async filterRemindersByTagIds(
    reminders: Reminder[],
    tagIds: Set<UUID>,
  ): Promise<Reminder[]> {
    if (tagIds.size === 0) {
      return [];
    }

    const reminderIds = new Set(
      (await this.organizerRepository.listReminderTags())
        .filter((assignment) => tagIds.has(assignment.tagId))
        .map((assignment) => assignment.reminderId),
    );

    return reminders
      .filter(
        (reminder) =>
          reminderIds.has(reminder.id) ||
          (reminder.tagIds ?? []).some((tagId) => tagIds.has(tagId)),
      )
      .sort(compareReminders);
  }

  private async requireReminder(actor: Actor, reminderId: UUID): Promise<Reminder> {
    try {
      return assertCanAccessRecord(
        actor,
        await this.reminderRepository.findById(reminderId),
        'read',
      );
    } catch (error) {
      throw mapAccessError(error);
    }
  }

  private requireFolder(actor: Actor, folder: Folder | undefined): Folder {
    try {
      return assertCanAccessRecord(actor, folder, 'access');
    } catch (error) {
      throw mapAccessError(error);
    }
  }

  private requireTag(actor: Actor, tag: Tag | undefined): Tag {
    try {
      return assertCanAccessRecord(actor, tag, 'access');
    } catch (error) {
      throw mapAccessError(error);
    }
  }
}

function normalizeName(input: string, field: string): string {
  const name = input.trim().replace(/\s+/g, ' ');

  if (name.length === 0) {
    throw organizerValidationError(`${field} is required`, field);
  }

  if (name.length > 60) {
    throw organizerValidationError(`${field} must be 60 characters or fewer`, field);
  }

  return name;
}

function normalizeComparableName(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function assertUniqueName(
  records: Array<Folder | Tag>,
  name: string,
  kind: 'folder' | 'tag',
): void {
  if (
    records.some((record) => normalizeComparableName(record.name) === normalizeComparableName(name))
  ) {
    throw organizerDuplicateName(kind, name);
  }
}

function nextSortOrder(folders: Folder[]): number {
  return folders.reduce((max, folder) => Math.max(max, folder.sortOrder), 0) + 1;
}

function compareFolders(a: Folder, b: Folder): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

function compareTags(a: Tag, b: Tag): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

function compareReminders(a: Reminder, b: Reminder): number {
  return a.scheduledAt.localeCompare(b.scheduledAt) || a.id.localeCompare(b.id);
}

function isOpenReminder(reminder: Reminder): boolean {
  return reminder.status === 'active' || reminder.status === 'snoozed';
}

function isSameUtcDay(iso: string, now: Date): boolean {
  return iso.slice(0, 10) === now.toISOString().slice(0, 10);
}

function requireIdParam(value: UUID | undefined, field: string): UUID {
  if (value === undefined || value.trim().length === 0) {
    throw organizerValidationError(`${field} is required`, field);
  }

  return value;
}

function mapAccessError(error: unknown): OrganizerServiceError {
  if (error instanceof AccessDeniedError) {
    return new OrganizerServiceError(
      'ORGANIZER_ACCESS_DENIED',
      'Actor is not allowed to access this organizer record',
    );
  }

  if (error instanceof RecordNotFoundError) {
    return new OrganizerServiceError('ORGANIZER_NOT_FOUND', 'Organizer record was not found');
  }

  throw error;
}
