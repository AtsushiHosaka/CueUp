import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryObservabilitySink } from './observabilitySink.js';
import { ObservabilityService } from './observabilityService.js';

const now = new Date('2026-06-01T09:00:00.000Z');

function createService() {
  let id = 1;
  const sink = new InMemoryObservabilitySink();
  const service = new ObservabilityService(sink, () => `event-${id++}`);

  return {
    service,
    sink,
  };
}

test('recordAuditEvent stores minimal user timestamp event and redacted context', async () => {
  const { service, sink } = createService();

  await service.recordAuditEvent({
    eventType: 'reminder.created',
    outcome: 'success',
    userId: 'user-1',
    resourceType: 'reminder',
    resourceId: 'reminder-1',
    context: {
      title: 'Sensitive title',
      characterId: 'character-1',
    },
    now,
  });

  assert.equal(sink.auditEvents.length, 1);
  assert.deepEqual(sink.auditEvents[0], {
    id: 'event-1',
    userId: 'user-1',
    timestamp: now.toISOString(),
    eventType: 'reminder.created',
    outcome: 'success',
    resourceType: 'reminder',
    resourceId: 'reminder-1',
    context: {
      title: '[REDACTED]',
      characterId: 'character-1',
    },
  });
});

test('trackAnalyticsEvent records analysis events without sensitive bodies', async () => {
  const { service, sink } = createService();

  await service.trackAnalyticsEvent({
    eventType: 'chat_message_sent',
    userId: 'user-1',
    context: {
      characterId: 'character-strict-boss',
      body: 'private chat text',
      remainingFreeChats: 3,
    },
    now,
  });

  assert.deepEqual(sink.analyticsEvents[0], {
    id: 'event-1',
    userId: 'user-1',
    timestamp: now.toISOString(),
    eventType: 'chat_message_sent',
    context: {
      characterId: 'character-strict-boss',
      body: '[REDACTED]',
      remainingFreeChats: 3,
    },
  });
});

test('recordOperationalLog keeps failure reasons while redacting provider payloads', async () => {
  const { service, sink } = createService();

  await service.recordOperationalLog({
    level: 'error',
    eventType: 'ai.generation.result',
    message: 'AI generation failed',
    userId: 'user-1',
    failureReason: 'provider_timeout',
    context: {
      provider: 'openai',
      prompt: 'private prompt',
      tokenUsage: {
        inputTokens: 100,
      },
    },
    now,
  });

  assert.deepEqual(sink.operationalLogs[0], {
    id: 'event-1',
    level: 'error',
    timestamp: now.toISOString(),
    eventType: 'ai.generation.result',
    message: 'AI generation failed',
    userId: 'user-1',
    failureReason: 'provider_timeout',
    context: {
      provider: 'openai',
      prompt: '[REDACTED]',
      tokenUsage: '[REDACTED]',
    },
  });
});
