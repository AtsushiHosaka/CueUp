export type ReminderDraft = {
  title: string;
  note: string;
  scheduledAt: string;
};

export function sanitizeReminderTitle(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function createReminderDraft(now: Date = new Date()): ReminderDraft {
  const scheduledAt = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    title: 'Take the first step',
    note: '',
    scheduledAt: scheduledAt.toISOString(),
  };
}
