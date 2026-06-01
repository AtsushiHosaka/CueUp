import type { Reminder, UUID } from '@cueup/shared';

export interface ReminderRepository {
  findById(id: UUID): Promise<Reminder | undefined>;
  listByUser(userId: UUID): Promise<Reminder[]>;
  save(reminder: Reminder): Promise<Reminder>;
}

export class InMemoryReminderRepository implements ReminderRepository {
  private readonly reminders = new Map<UUID, Reminder>();

  constructor(initialReminders: Reminder[] = []) {
    for (const reminder of initialReminders) {
      this.reminders.set(reminder.id, reminder);
    }
  }

  async findById(id: UUID): Promise<Reminder | undefined> {
    return this.reminders.get(id);
  }

  async listByUser(userId: UUID): Promise<Reminder[]> {
    return [...this.reminders.values()].filter((reminder) => reminder.userId === userId);
  }

  async save(reminder: Reminder): Promise<Reminder> {
    this.reminders.set(reminder.id, reminder);
    return reminder;
  }
}
