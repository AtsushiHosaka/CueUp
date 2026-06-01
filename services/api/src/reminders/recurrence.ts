import type { IsoDateTime, ReminderRecurrenceRule } from '@cueup/shared';

import { validationError } from './reminderErrors.js';

export function validateRecurrenceRule(
  value: ReminderRecurrenceRule | null | undefined,
): ReminderRecurrenceRule | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!['daily', 'weekly', 'monthly'].includes(value.frequency)) {
    throw validationError('Unsupported recurrence frequency', 'recurrenceRule.frequency');
  }

  if (!Number.isInteger(value.interval) || value.interval < 1 || value.interval > 365) {
    throw validationError(
      'Recurrence interval must be between 1 and 365',
      'recurrenceRule.interval',
    );
  }

  return value;
}

export function getNextScheduledAt(
  completedReminderScheduledAt: IsoDateTime,
  recurrenceRule: ReminderRecurrenceRule,
): IsoDateTime {
  const next = new Date(completedReminderScheduledAt);

  if (Number.isNaN(next.getTime())) {
    throw validationError('scheduledAt must be a valid ISO date', 'scheduledAt');
  }

  if (recurrenceRule.frequency === 'daily') {
    next.setUTCDate(next.getUTCDate() + recurrenceRule.interval);
  } else if (recurrenceRule.frequency === 'weekly') {
    next.setUTCDate(next.getUTCDate() + recurrenceRule.interval * 7);
  } else {
    next.setUTCMonth(next.getUTCMonth() + recurrenceRule.interval);
  }

  return next.toISOString();
}
