import assert from 'node:assert/strict';
import test from 'node:test';

import { routeRequest } from './server.js';

const testConfig = {
  port: 0,
  nodeEnv: 'test',
  aiProvider: 'disabled' as const,
  serverOnlyCredentialNames: ['OPENAI_API_KEY'],
};

test('GET /health returns service status', async () => {
  const response = routeRequest('GET', '/health', 'localhost', testConfig);
  const body = response.payload as { status: string; service: string };

  assert.equal(response.statusCode, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'cueup-api');
});

test('GET /v1/bootstrap returns free plan limits', async () => {
  const response = routeRequest('GET', '/v1/bootstrap', 'localhost', testConfig);
  const body = response.payload as { planLimits: { free: { activeReminders: number } } };

  assert.equal(response.statusCode, 200);
  assert.equal(body.planLimits.free.activeReminders, 20);
});
