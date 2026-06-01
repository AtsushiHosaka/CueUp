import type { AnalyticsEvent, AuditEvent, OperationalLog } from './observabilityEvents.js';

export interface ObservabilitySink {
  writeAuditEvent(event: AuditEvent): Promise<void>;
  writeAnalyticsEvent(event: AnalyticsEvent): Promise<void>;
  writeOperationalLog(log: OperationalLog): Promise<void>;
}

export class InMemoryObservabilitySink implements ObservabilitySink {
  readonly auditEvents: AuditEvent[] = [];
  readonly analyticsEvents: AnalyticsEvent[] = [];
  readonly operationalLogs: OperationalLog[] = [];

  async writeAuditEvent(event: AuditEvent): Promise<void> {
    this.auditEvents.push(event);
  }

  async writeAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    this.analyticsEvents.push(event);
  }

  async writeOperationalLog(log: OperationalLog): Promise<void> {
    this.operationalLogs.push(log);
  }
}
