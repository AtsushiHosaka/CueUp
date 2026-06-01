import type { UUID } from '@cueup/shared';

import { redactForLog } from '../data/accessControl.js';
import type {
  AnalyticsEventType,
  AuditEventType,
  EventContext,
  EventOutcome,
  OperationalLogLevel,
} from './observabilityEvents.js';
import type { ObservabilitySink } from './observabilitySink.js';

export type ObservabilityIdFactory = () => UUID;

export class ObservabilityService {
  constructor(
    private readonly sink: ObservabilitySink,
    private readonly idFactory: ObservabilityIdFactory,
  ) {}

  async recordAuditEvent(params: {
    eventType: AuditEventType;
    outcome: EventOutcome;
    now: Date;
    userId?: UUID;
    resourceType?: string;
    resourceId?: UUID;
    context?: EventContext;
  }): Promise<void> {
    await this.sink.writeAuditEvent({
      id: this.idFactory(),
      timestamp: params.now.toISOString(),
      eventType: params.eventType,
      outcome: params.outcome,
      ...(params.userId === undefined ? {} : { userId: params.userId }),
      ...(params.resourceType === undefined ? {} : { resourceType: params.resourceType }),
      ...(params.resourceId === undefined ? {} : { resourceId: params.resourceId }),
      context: sanitizeContext(params.context),
    });
  }

  async trackAnalyticsEvent(params: {
    eventType: AnalyticsEventType;
    userId: UUID;
    now: Date;
    context?: EventContext;
  }): Promise<void> {
    await this.sink.writeAnalyticsEvent({
      id: this.idFactory(),
      userId: params.userId,
      timestamp: params.now.toISOString(),
      eventType: params.eventType,
      context: sanitizeContext(params.context),
    });
  }

  async recordOperationalLog(params: {
    level: OperationalLogLevel;
    eventType: string;
    message: string;
    now: Date;
    userId?: UUID;
    failureReason?: string;
    context?: EventContext;
  }): Promise<void> {
    await this.sink.writeOperationalLog({
      id: this.idFactory(),
      level: params.level,
      timestamp: params.now.toISOString(),
      eventType: params.eventType,
      message: params.message,
      ...(params.userId === undefined ? {} : { userId: params.userId }),
      ...(params.failureReason === undefined ? {} : { failureReason: params.failureReason }),
      context: sanitizeContext(params.context),
    });
  }
}

function sanitizeContext(context: EventContext | undefined): EventContext {
  const redacted = redactForLog(context ?? {});

  if (redacted === null || typeof redacted !== 'object' || Array.isArray(redacted)) {
    return {};
  }

  return redacted as EventContext;
}
