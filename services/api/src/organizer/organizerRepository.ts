import type { Folder, ReminderTag, Tag, UUID } from '@cueup/shared';

export interface OrganizerRepository {
  findFolderById(id: UUID): Promise<Folder | undefined>;
  listFoldersByUser(userId: UUID): Promise<Folder[]>;
  saveFolder(folder: Folder): Promise<Folder>;
  deleteFolder(id: UUID): Promise<void>;
  findTagById(id: UUID): Promise<Tag | undefined>;
  listTagsByUser(userId: UUID): Promise<Tag[]>;
  saveTag(tag: Tag): Promise<Tag>;
  deleteTag(id: UUID): Promise<void>;
  listReminderTags(): Promise<ReminderTag[]>;
  replaceReminderTags(reminderId: UUID, tagIds: UUID[]): Promise<ReminderTag[]>;
  removeTagAssignments(tagId: UUID): Promise<void>;
}

export class InMemoryOrganizerRepository implements OrganizerRepository {
  private readonly folders = new Map<UUID, Folder>();
  private readonly tags = new Map<UUID, Tag>();
  private reminderTags: ReminderTag[] = [];

  constructor(
    params: {
      folders?: Folder[] | undefined;
      tags?: Tag[] | undefined;
      reminderTags?: ReminderTag[] | undefined;
    } = {},
  ) {
    for (const folder of params.folders ?? []) {
      this.folders.set(folder.id, folder);
    }

    for (const tag of params.tags ?? []) {
      this.tags.set(tag.id, tag);
    }

    this.reminderTags = [...(params.reminderTags ?? [])];
  }

  async findFolderById(id: UUID): Promise<Folder | undefined> {
    return this.folders.get(id);
  }

  async listFoldersByUser(userId: UUID): Promise<Folder[]> {
    return [...this.folders.values()].filter((folder) => folder.userId === userId);
  }

  async saveFolder(folder: Folder): Promise<Folder> {
    this.folders.set(folder.id, folder);
    return folder;
  }

  async deleteFolder(id: UUID): Promise<void> {
    this.folders.delete(id);
  }

  async findTagById(id: UUID): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async listTagsByUser(userId: UUID): Promise<Tag[]> {
    return [...this.tags.values()].filter((tag) => tag.userId === userId);
  }

  async saveTag(tag: Tag): Promise<Tag> {
    this.tags.set(tag.id, tag);
    return tag;
  }

  async deleteTag(id: UUID): Promise<void> {
    this.tags.delete(id);
  }

  async listReminderTags(): Promise<ReminderTag[]> {
    return [...this.reminderTags];
  }

  async replaceReminderTags(reminderId: UUID, tagIds: UUID[]): Promise<ReminderTag[]> {
    const nextAssignments = tagIds.map((tagId) => ({ reminderId, tagId }));

    this.reminderTags = [
      ...this.reminderTags.filter((assignment) => assignment.reminderId !== reminderId),
      ...nextAssignments,
    ];

    return nextAssignments;
  }

  async removeTagAssignments(tagId: UUID): Promise<void> {
    this.reminderTags = this.reminderTags.filter((assignment) => assignment.tagId !== tagId);
  }
}
