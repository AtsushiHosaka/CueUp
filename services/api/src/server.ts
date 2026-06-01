import { FREE_PLAN_LIMITS } from '@cueup/shared';
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';

import type { RuntimeConfig } from './config.js';
import { getRuntimeConfig } from './config.js';

type JsonValue = boolean | number | string | null | JsonValue[] | { [key: string]: JsonValue };
type RouteResult = {
  statusCode: number;
  payload: JsonValue;
};

function sendJson(response: ServerResponse, statusCode: number, payload: JsonValue): void {
  const body = JSON.stringify(payload);

  response.writeHead(statusCode, {
    'content-length': Buffer.byteLength(body),
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(body);
}

export function createServer(config: RuntimeConfig = getRuntimeConfig()) {
  return createHttpServer((request: IncomingMessage, response: ServerResponse) => {
    const result = routeRequest(
      request.method ?? 'GET',
      request.url ?? '/',
      request.headers.host ?? 'localhost',
      config,
    );

    sendJson(response, result.statusCode, result.payload);
  });
}

export function routeRequest(
  method: string,
  requestUrl: string,
  host: string,
  config: RuntimeConfig,
): RouteResult {
  const url = new URL(requestUrl, `http://${host}`);

  if (method === 'GET' && url.pathname === '/health') {
    return {
      statusCode: 200,
      payload: {
        status: 'ok',
        service: 'cueup-api',
        environment: config.nodeEnv,
      },
    };
  }

  if (method === 'GET' && url.pathname === '/ready') {
    return {
      statusCode: 200,
      payload: {
        status: 'ready',
        aiProvider: config.aiProvider,
        serverOnlyCredentialNames: [...config.serverOnlyCredentialNames],
      },
    };
  }

  if (method === 'GET' && url.pathname === '/v1/bootstrap') {
    return {
      statusCode: 200,
      payload: {
        app: 'CueUp',
        planLimits: {
          free: FREE_PLAN_LIMITS,
        },
      },
    };
  }

  return {
    statusCode: 404,
    payload: {
      error: 'not_found',
      message: 'Route not found',
    },
  };
}
