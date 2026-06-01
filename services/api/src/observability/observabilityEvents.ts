import type { IsoDateTime, UUID } from '@cueup/shared';

export type AuditEventType =
  | 'login'
  | 'reminder.created'
  | 'reminder.updated'
  | 'reminder.deleted'
  | 'notification.job.result'
  | 'ai.generation.result'
  | 'push.delivery.result'
  | 'billing.verification.result';

export type AnalyticsEventType =
  | 'reminder_created'
  | 'character_selected'
  | 'custom_character_created'
  | 'notification_received'
  | 'notification_completed'
  | 'snooze_created'
  | 'pro_purchase'
  | 'character_pack_purchase'
  | 'chat_message_sent'
  | 'free_limit_reached'
  | 'pro_upsell_shown';

export type OperationalLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type EventContext = Record<string, unknown>;
export type EventOutcome = 'failure' | 'success';

export type AuditEvent = {
  id: UUID;
  userId?: UUID;
  timestamp: IsoDateTime;
  eventType: AuditEventType;
  outcome: EventOutcome;
  resourceType?: string;
  resourceId?: UUID;
  context: EventContext;
};

export type AnalyticsEvent = {
  id: UUID;
  userId: UUID;
  timestamp: IsoDateTime;
  eventType: AnalyticsEventType;
  context: EventContext;
};

export type OperationalLog = {
  id: UUID;
  level: OperationalLogLevel;
  timestamp: IsoDateTime;
  eventType: string;
  message: string;
  userId?: UUID;
  failureReason?: string;
  context: EventContext;
};
