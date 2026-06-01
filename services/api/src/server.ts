import { FREE_PLAN_LIMITS, type Plan } from '@cueup/shared';
import {
  createServer as createHttpServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';

import type { RuntimeConfig } from './config.js';
import { getRuntimeConfig } from './config.js';
import type { Actor } from './data/accessControl.js';
import {
  InMemoryReminderRepository,
  ReminderService,
  ReminderServiceError,
  type ReminderInput,
} from './reminders.js';

type JsonValue = boolean | number | string | null | JsonValue[] | { [key: string]: JsonValue };
type RouteResult = {
  statusCode: number;
  payload: JsonValue;
};
type RouteContext = {
  actor?: Actor;
  body?: unknown;
  dependencies?: ApiDependencies;
  headers?: IncomingHttpHeaders;
  plan?: Plan;
};
type ApiDependencies = {
  reminders: ReminderService;
};

class AuthenticationRequiredError extends Error {
  readonly code = 'AUTHENTICATION_REQUIRED';
}

class RequestBodyError extends Error {
  constructor(
    readonly code: 'INVALID_JSON' | 'PAYLOAD_TOO_LARGE',
    message: string,
  ) {
    super(message);
  }
}

function sendJson(response: ServerResponse, statusCode: number, payload: JsonValue): void {
  const body = JSON.stringify(payload);

  response.writeHead(statusCode, {
    'content-length': Buffer.byteLength(body),
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(body);
}

export function createServer(
  config: RuntimeConfig = getRuntimeConfig(),
  dependencies: ApiDependencies = createApiDependencies(),
) {
  return createHttpServer((request: IncomingMessage, response: ServerResponse) => {
    void handleRequest(request, response, config, dependencies);
  });
}

export function createApiDependencies(): ApiDependencies {
  return {
    reminders: new ReminderService(new InMemoryReminderRepository()),
  };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  config: RuntimeConfig,
  dependencies: ApiDependencies,
): Promise<void> {
  try {
    const body = await readJsonBody(request);
    const result = routeRequest(
      request.method ?? 'GET',
      request.url ?? '/',
      request.headers.host ?? 'localhost',
      config,
      {
        body,
        dependencies,
        headers: request.headers,
      },
    );

    sendJson(response, result.statusCode, result.payload);
  } catch (error) {
    const result = mapRouteError(error);

    sendJson(response, result.statusCode, result.payload);
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > 1024 * 1024) {
      throw new RequestBodyError('PAYLOAD_TOO_LARGE', 'Request body is too large');
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new RequestBodyError('INVALID_JSON', 'Request body must be valid JSON');
  }
}

function mapRouteError(error: unknown): RouteResult {
  if (error instanceof RequestBodyError) {
    return {
      statusCode: error.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400,
      payload: {
        error: error.code === 'PAYLOAD_TOO_LARGE' ? 'payload_too_large' : 'invalid_json',
        message: error.message,
      },
    };
  }

  return {
    statusCode: 500,
    payload: {
      error: 'internal_error',
      message: 'Unexpected server error',
    },
  };
}

function mapReminderError(error: unknown): RouteResult {
  if (error instanceof AuthenticationRequiredError) {
    return {
      statusCode: 401,
      payload: {
        error: 'authentication_required',
        message: 'x-user-id header is required',
      },
    };
  }

  if (!(error instanceof ReminderServiceError)) {
    return {
      statusCode: 500,
      payload: {
        error: 'internal_error',
        message: 'Unexpected server error',
      },
    };
  }

  const statusCodeByError = {
    ACCESS_DENIED: 403,
    FREE_PLAN_LIMIT_REACHED: 402,
    PERSISTENCE_UNAVAILABLE: 503,
    RECORD_NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
  } as const satisfies Record<string, number>;
  const apiErrorByCode = {
    ACCESS_DENIED: 'forbidden',
    FREE_PLAN_LIMIT_REACHED: 'plan_limit_exceeded',
    PERSISTENCE_UNAVAILABLE: 'service_unavailable',
    RECORD_NOT_FOUND: 'not_found',
    VALIDATION_ERROR: 'invalid_request',
  } as const satisfies Record<string, string>;

  return {
    statusCode: statusCodeByError[error.code],
    payload: {
      error: apiErrorByCode[error.code],
      message: error.message,
      details: error.details as JsonValue,
    },
  };
}

function handleReminderRequest(
  method: string,
  pathname: string,
  context: RouteContext,
): RouteResult | undefined {
  const dependencies = context.dependencies ?? createApiDependencies();
  const actor = resolveActor(context);
  const plan = resolvePlan(context);

  try {
    if (pathname === '/v1/reminders' && method === 'GET') {
      return {
        statusCode: 200,
        payload: {
          reminders: dependencies.reminders.list(actor) as JsonValue,
        },
      };
    }

    if (pathname === '/v1/reminders' && method === 'POST') {
      return {
        statusCode: 201,
        payload: {
          reminder: dependencies.reminders.create(
            actor,
            plan,
            requireObjectBody(context.body),
          ) as JsonValue,
        },
      };
    }

    const match = /^\/v1\/reminders\/([^/]+)(?:\/(complete))?$/.exec(pathname);

    if (match === null) {
      return undefined;
    }

    const reminderId = match[1];
    const action = match[2];

    if (reminderId === undefined) {
      return undefined;
    }

    if (action === 'complete' && method === 'POST') {
      return {
        statusCode: 200,
        payload: dependencies.reminders.complete(actor, reminderId) as JsonValue,
      };
    }

    if (action !== undefined) {
      return undefined;
    }

    if (method === 'GET') {
      return {
        statusCode: 200,
        payload: {
          reminder: dependencies.reminders.get(actor, reminderId) as JsonValue,
        },
      };
    }

    if (method === 'PATCH') {
      return {
        statusCode: 200,
        payload: {
          reminder: dependencies.reminders.update(
            actor,
            reminderId,
            requireObjectBody(context.body),
          ) as JsonValue,
        },
      };
    }

    if (method === 'DELETE') {
      return {
        statusCode: 200,
        payload: {
          reminder: dependencies.reminders.delete(actor, reminderId) as JsonValue,
        },
      };
    }

    return undefined;
  } catch (error) {
    return mapReminderError(error);
  }
}

function resolveActor(context: RouteContext): Actor {
  if (context.actor !== undefined) {
    return context.actor;
  }

  const userId = headerValue(context.headers, 'x-user-id');

  if (userId === undefined || userId.trim().length === 0) {
    throw new AuthenticationRequiredError();
  }

  return {
    userId,
    role: headerValue(context.headers, 'x-user-role') === 'admin' ? 'admin' : 'user',
  };
}

function resolvePlan(context: RouteContext): Plan {
  if (context.plan !== undefined) {
    return context.plan;
  }

  return headerValue(context.headers, 'x-user-plan') === 'pro' ? 'pro' : 'free';
}

function headerValue(headers: IncomingHttpHeaders | undefined, name: string): string | undefined {
  const value = headers?.[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireObjectBody(body: unknown): ReminderInput {
  if (!isRecord(body)) {
    throw new ReminderServiceError('VALIDATION_ERROR', 'Request body must be a JSON object');
  }

  return body;
}

function routeReminderRequest(
  method: string,
  pathname: string,
  context: RouteContext,
): RouteResult | undefined {
  if (pathname !== '/v1/reminders' && !pathname.startsWith('/v1/reminders/')) {
    return undefined;
  }

  try {
    return handleReminderRequest(method, pathname, context);
  } catch (error) {
    return mapReminderError(error);
  }
}

export function routeRequest(
  method: string,
  requestUrl: string,
  host: string,
  config: RuntimeConfig,
  context: RouteContext = {},
): RouteResult {
  const normalizedMethod = method.toUpperCase();
  const url = new URL(requestUrl, `http://${host}`);

  const reminderResult = routeReminderRequest(normalizedMethod, url.pathname, context);

  if (reminderResult !== undefined) {
    return reminderResult;
  }

  if (normalizedMethod === 'GET' && url.pathname === '/health') {
    return {
      statusCode: 200,
      payload: {
        status: 'ok',
        service: 'cueup-api',
        environment: config.nodeEnv,
      },
    };
  }

  if (normalizedMethod === 'GET' && url.pathname === '/ready') {
    return {
      statusCode: 200,
      payload: {
        status: 'ready',
        aiProvider: config.aiProvider,
        serverOnlyCredentialNames: [...config.serverOnlyCredentialNames],
      },
    };
  }

  if (normalizedMethod === 'GET' && url.pathname === '/v1/bootstrap') {
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
