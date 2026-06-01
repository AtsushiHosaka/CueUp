import {
  FREE_PLAN_LIMITS,
  createEmptyUsageQuota,
  createEntitlementSnapshot,
  type IsoDateTime,
  type Plan,
  type User,
} from '@cueup/shared';
import {
  createServer as createHttpServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { randomUUID } from 'node:crypto';

import { CharacterServiceError } from './characters/characterErrors.js';
import { InMemoryCharacterRepository } from './characters/characterRepository.js';
import { CustomCharacterService } from './characters/customCharacterService.js';
import type { RuntimeConfig } from './config.js';
import { getRuntimeConfig } from './config.js';
import type { Actor } from './data/accessControl.js';
import { InMemoryNotificationJobRepository } from './notifications/notificationJobRepository.js';
import { NotificationJobService } from './notifications/notificationJobService.js';
import { OrganizerServiceError } from './organizer/organizerErrors.js';
import { InMemoryOrganizerRepository } from './organizer/organizerRepository.js';
import {
  OrganizerService,
  type CreateFolderInput,
  type CreateTagInput,
  type SmartListKind,
  type UpdateFolderInput,
  type UpdateTagInput,
} from './organizer/organizerService.js';
import { ReminderServiceError } from './reminders/reminderErrors.js';
import { InMemoryReminderRepository } from './reminders/reminderRepository.js';
import {
  ReminderService,
  type CreateReminderInput,
  type UpdateReminderInput,
} from './reminders/reminderService.js';
import { SnoozeService, type SnoozeReminderInput } from './reminders/snoozeService.js';

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
  now?: IsoDateTime;
  plan?: Plan;
};
type ApiDependencies = {
  characters?: CustomCharacterService;
  organizer?: OrganizerService;
  reminders: ReminderService;
  snoozes?: SnoozeService;
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
  const characters = new InMemoryCharacterRepository();
  const reminders = new InMemoryReminderRepository();
  const notificationJobs = new InMemoryNotificationJobRepository();

  return {
    characters: new CustomCharacterService(characters, randomUUID),
    organizer: new OrganizerService(new InMemoryOrganizerRepository(), reminders, randomUUID),
    reminders: new ReminderService(reminders, randomUUID),
    snoozes: new SnoozeService(reminders, new NotificationJobService(notificationJobs, randomUUID)),
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
    const result = await routeRequest(
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
    REMINDER_ACCESS_DENIED: 403,
    REMINDER_FREE_LIMIT_EXCEEDED: 402,
    REMINDER_NOT_FOUND: 404,
    REMINDER_PERSISTENCE_UNAVAILABLE: 503,
    REMINDER_SNOOZE_LIMIT_EXCEEDED: 429,
    REMINDER_VALIDATION_ERROR: 400,
  } as const satisfies Record<string, number>;
  const apiErrorByCode = {
    REMINDER_ACCESS_DENIED: 'forbidden',
    REMINDER_FREE_LIMIT_EXCEEDED: 'plan_limit_exceeded',
    REMINDER_NOT_FOUND: 'not_found',
    REMINDER_PERSISTENCE_UNAVAILABLE: 'service_unavailable',
    REMINDER_SNOOZE_LIMIT_EXCEEDED: 'snooze_limit_exceeded',
    REMINDER_VALIDATION_ERROR: 'invalid_request',
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

function mapCharacterError(error: unknown): RouteResult {
  if (error instanceof AuthenticationRequiredError) {
    return {
      statusCode: 401,
      payload: {
        error: 'authentication_required',
        message: 'x-user-id header is required',
      },
    };
  }

  if (!(error instanceof CharacterServiceError)) {
    return {
      statusCode: 500,
      payload: {
        error: 'internal_error',
        message: 'Unexpected server error',
      },
    };
  }

  const statusCodeByError = {
    CHARACTER_ACCESS_DENIED: 403,
    CHARACTER_CUSTOM_LIMIT_EXCEEDED: 402,
    CHARACTER_ICON_UNAVAILABLE: 422,
    CHARACTER_NOT_FOUND: 404,
    CHARACTER_PACK_REQUIRED: 402,
    CHARACTER_SAFETY_REVIEW_REQUIRED: 422,
    CHARACTER_SELECTION_LIMIT_EXCEEDED: 402,
    CHARACTER_VALIDATION_ERROR: 400,
  } as const satisfies Record<string, number>;
  const apiErrorByCode = {
    CHARACTER_ACCESS_DENIED: 'forbidden',
    CHARACTER_CUSTOM_LIMIT_EXCEEDED: 'plan_limit_exceeded',
    CHARACTER_ICON_UNAVAILABLE: 'icon_unavailable',
    CHARACTER_NOT_FOUND: 'not_found',
    CHARACTER_PACK_REQUIRED: 'character_pack_required',
    CHARACTER_SAFETY_REVIEW_REQUIRED: 'safety_review_required',
    CHARACTER_SELECTION_LIMIT_EXCEEDED: 'plan_limit_exceeded',
    CHARACTER_VALIDATION_ERROR: 'invalid_request',
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

function mapOrganizerError(error: unknown): RouteResult {
  if (error instanceof AuthenticationRequiredError) {
    return {
      statusCode: 401,
      payload: {
        error: 'authentication_required',
        message: 'x-user-id header is required',
      },
    };
  }

  if (!(error instanceof OrganizerServiceError)) {
    return {
      statusCode: 500,
      payload: {
        error: 'internal_error',
        message: 'Unexpected server error',
      },
    };
  }

  const statusCodeByError = {
    ORGANIZER_ACCESS_DENIED: 403,
    ORGANIZER_DUPLICATE_NAME: 409,
    ORGANIZER_FOLDER_LIMIT_EXCEEDED: 402,
    ORGANIZER_NOT_FOUND: 404,
    ORGANIZER_TAG_LIMIT_EXCEEDED: 402,
    ORGANIZER_VALIDATION_ERROR: 400,
  } as const satisfies Record<string, number>;
  const apiErrorByCode = {
    ORGANIZER_ACCESS_DENIED: 'forbidden',
    ORGANIZER_DUPLICATE_NAME: 'duplicate_name',
    ORGANIZER_FOLDER_LIMIT_EXCEEDED: 'plan_limit_exceeded',
    ORGANIZER_NOT_FOUND: 'not_found',
    ORGANIZER_TAG_LIMIT_EXCEEDED: 'plan_limit_exceeded',
    ORGANIZER_VALIDATION_ERROR: 'invalid_request',
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

async function handleReminderRequest(
  method: string,
  pathname: string,
  context: RouteContext,
): Promise<RouteResult | undefined> {
  const dependencies = context.dependencies ?? createApiDependencies();
  const actor = resolveActor(context);
  const plan = resolvePlan(context);
  const now = resolveNow(context);

  try {
    if (pathname === '/v1/reminders' && method === 'GET') {
      return {
        statusCode: 200,
        payload: {
          reminders: (await dependencies.reminders.listReminders(actor)) as JsonValue,
        },
      };
    }

    if (pathname === '/v1/reminders' && method === 'POST') {
      return {
        statusCode: 201,
        payload: {
          reminder: (await dependencies.reminders.createReminder({
            actor,
            entitlement: createRouteEntitlement(actor, plan, now),
            input: requireObjectBody(context.body) as CreateReminderInput,
            now,
          })) as JsonValue,
        },
      };
    }

    const match = /^\/v1\/reminders\/([^/]+)(?:\/(complete|snooze))?$/.exec(pathname);

    if (match === null) {
      return undefined;
    }

    const reminderId = match[1];
    const action = match[2];

    if (reminderId === undefined) {
      return undefined;
    }

    if (action === 'snooze' && method === 'POST') {
      const result = await resolveSnoozeService(dependencies).snoozeReminder({
        actor,
        id: reminderId,
        input: requireObjectBody(context.body) as SnoozeReminderInput,
        now,
      });

      return {
        statusCode: 200,
        payload: {
          reminder: result.reminder as JsonValue,
          notificationJob: result.notificationJob as JsonValue,
          message: (result.message ?? null) as JsonValue,
          quota: (result.quota ?? null) as JsonValue,
        },
      };
    }

    if (action === 'complete' && method === 'POST') {
      const result = await dependencies.reminders.completeReminder({
        actor,
        id: reminderId,
        now,
      });

      return {
        statusCode: 200,
        payload: {
          reminder: result.completed as JsonValue,
          nextReminder: (result.nextReminder ?? null) as JsonValue,
        },
      };
    }

    if (action !== undefined) {
      return undefined;
    }

    if (method === 'GET') {
      return {
        statusCode: 200,
        payload: {
          reminder: (await dependencies.reminders.getReminder(actor, reminderId)) as JsonValue,
        },
      };
    }

    if (method === 'PATCH') {
      return {
        statusCode: 200,
        payload: {
          reminder: (await dependencies.reminders.updateReminder({
            actor,
            id: reminderId,
            input: requireObjectBody(context.body) as UpdateReminderInput,
            now,
          })) as JsonValue,
        },
      };
    }

    if (method === 'DELETE') {
      return {
        statusCode: 200,
        payload: {
          reminder: (await dependencies.reminders.deleteReminder({
            actor,
            id: reminderId,
            now,
          })) as JsonValue,
        },
      };
    }

    return undefined;
  } catch (error) {
    return mapReminderError(error);
  }
}

async function handleCharacterRequest(
  method: string,
  pathname: string,
  context: RouteContext,
): Promise<RouteResult | undefined> {
  const dependencies = context.dependencies ?? createApiDependencies();
  const actor = resolveActor(context);
  const plan = resolvePlan(context);
  const now = resolveNow(context);

  try {
    if (pathname === '/v1/characters/custom' && method === 'POST') {
      return {
        statusCode: 201,
        payload: {
          character: (await resolveCustomCharacterService(dependencies).createCustomCharacter({
            actor,
            entitlement: createRouteEntitlement(actor, plan, now),
            input: context.body,
            now,
          })) as JsonValue,
        },
      };
    }

    const match = /^\/v1\/characters\/custom\/([^/]+)$/.exec(pathname);

    if (match === null) {
      return undefined;
    }

    const characterId = match[1];

    if (characterId === undefined || method !== 'PATCH') {
      return undefined;
    }

    return {
      statusCode: 200,
      payload: {
        character: (await resolveCustomCharacterService(dependencies).updateCustomCharacter({
          actor,
          id: characterId,
          input: context.body,
          now,
        })) as JsonValue,
      },
    };
  } catch (error) {
    return mapCharacterError(error);
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

function resolveNow(context: RouteContext): IsoDateTime {
  return context.now ?? new Date().toISOString();
}

function createRouteEntitlement(actor: Actor, plan: Plan, now: IsoDateTime) {
  const user: User = {
    id: actor.userId,
    provider: 'email',
    locale: 'en',
    timezone: 'UTC',
    plan,
    createdAt: now,
    updatedAt: now,
  };

  return createEntitlementSnapshot({
    user,
    subscriptions: [],
    characterPackPurchases: [],
    usageQuota: createEmptyUsageQuota({
      id: `route-quota-${actor.userId}`,
      userId: actor.userId,
      period: now.slice(0, 7),
      now,
    }),
    now: new Date(now),
  });
}

function resolveSnoozeService(dependencies: ApiDependencies): SnoozeService {
  if (dependencies.snoozes === undefined) {
    throw new Error('Snooze dependencies are not configured');
  }

  return dependencies.snoozes;
}

function resolveCustomCharacterService(dependencies: ApiDependencies): CustomCharacterService {
  return dependencies.characters ?? createApiDependencies().characters!;
}

function resolveOrganizerService(dependencies: ApiDependencies): OrganizerService {
  if (dependencies.organizer === undefined) {
    throw new Error('Organizer dependencies are not configured');
  }

  return dependencies.organizer;
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

function requireObjectBody(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) {
    throw new ReminderServiceError(
      'REMINDER_VALIDATION_ERROR',
      'Request body must be a JSON object',
    );
  }

  return body;
}

function requireOrganizerObjectBody(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) {
    throw new OrganizerServiceError(
      'ORGANIZER_VALIDATION_ERROR',
      'Request body must be a JSON object',
    );
  }

  return body;
}

function requireTagIdsBody(body: unknown): string[] {
  const objectBody = requireOrganizerObjectBody(body);
  const tagIds = objectBody.tagIds;

  if (!Array.isArray(tagIds) || !tagIds.every((tagId) => typeof tagId === 'string')) {
    throw new OrganizerServiceError(
      'ORGANIZER_VALIDATION_ERROR',
      'tagIds must be an array of tag IDs',
      {
        field: 'tagIds',
      },
    );
  }

  return tagIds;
}

async function routeReminderRequest(
  method: string,
  pathname: string,
  context: RouteContext,
): Promise<RouteResult | undefined> {
  if (pathname !== '/v1/reminders' && !pathname.startsWith('/v1/reminders/')) {
    return undefined;
  }

  try {
    return await handleReminderRequest(method, pathname, context);
  } catch (error) {
    return mapReminderError(error);
  }
}

async function routeCharacterRequest(
  method: string,
  pathname: string,
  context: RouteContext,
): Promise<RouteResult | undefined> {
  if (pathname !== '/v1/characters/custom' && !pathname.startsWith('/v1/characters/custom/')) {
    return undefined;
  }

  try {
    return await handleCharacterRequest(method, pathname, context);
  } catch (error) {
    return mapCharacterError(error);
  }
}

async function routeOrganizerRequest(
  method: string,
  url: URL,
  context: RouteContext,
): Promise<RouteResult | undefined> {
  if (!isOrganizerPath(url.pathname)) {
    return undefined;
  }

  const dependencies = context.dependencies ?? createApiDependencies();

  try {
    const actor = resolveActor(context);
    const plan = resolvePlan(context);
    const now = resolveNow(context);
    const organizer = resolveOrganizerService(dependencies);

    if (url.pathname === '/v1/folders' && method === 'GET') {
      return {
        statusCode: 200,
        payload: {
          folders: (await organizer.listFolders(actor)) as JsonValue,
        },
      };
    }

    if (url.pathname === '/v1/folders' && method === 'POST') {
      return {
        statusCode: 201,
        payload: {
          folder: (await organizer.createFolder({
            actor,
            entitlement: createRouteEntitlement(actor, plan, now),
            input: requireOrganizerObjectBody(context.body) as CreateFolderInput,
            now,
          })) as JsonValue,
        },
      };
    }

    const folderMatch = /^\/v1\/folders\/([^/]+)$/.exec(url.pathname);

    if (folderMatch !== null) {
      return handleFolderMemberRequest(method, folderMatch[1], context, actor, now, organizer);
    }

    if (url.pathname === '/v1/tags' && method === 'GET') {
      return {
        statusCode: 200,
        payload: {
          tags: (await organizer.listTags(actor)) as JsonValue,
        },
      };
    }

    if (url.pathname === '/v1/tags' && method === 'POST') {
      return {
        statusCode: 201,
        payload: {
          tag: (await organizer.createTag({
            actor,
            entitlement: createRouteEntitlement(actor, plan, now),
            input: requireOrganizerObjectBody(context.body) as CreateTagInput,
            now,
          })) as JsonValue,
        },
      };
    }

    const tagMatch = /^\/v1\/tags\/([^/]+)$/.exec(url.pathname);

    if (tagMatch !== null) {
      return handleTagMemberRequest(method, tagMatch[1], context, actor, now, organizer);
    }

    const reminderTagsMatch = /^\/v1\/reminders\/([^/]+)\/tags$/.exec(url.pathname);

    if (reminderTagsMatch !== null) {
      return handleReminderTagsRequest(
        method,
        reminderTagsMatch[1],
        context,
        actor,
        now,
        organizer,
      );
    }

    const smartListMatch = /^\/v1\/smart-lists\/([^/]+)$/.exec(url.pathname);

    if (smartListMatch !== null && method === 'GET') {
      return {
        statusCode: 200,
        payload: {
          reminders: (await organizer.listSmartList({
            actor,
            kind: parseSmartListKind(smartListMatch[1]),
            now: new Date(now),
            characterId: url.searchParams.get('characterId') ?? undefined,
            folderId: url.searchParams.get('folderId') ?? undefined,
            tagId: url.searchParams.get('tagId') ?? undefined,
          })) as JsonValue,
        },
      };
    }

    return undefined;
  } catch (error) {
    return mapOrganizerError(error);
  }
}

async function handleFolderMemberRequest(
  method: string,
  folderId: string | undefined,
  context: RouteContext,
  actor: Actor,
  now: IsoDateTime,
  organizer: OrganizerService,
): Promise<RouteResult | undefined> {
  if (folderId === undefined) {
    return undefined;
  }

  if (method === 'PATCH') {
    return {
      statusCode: 200,
      payload: {
        folder: (await organizer.updateFolder({
          actor,
          id: folderId,
          input: requireOrganizerObjectBody(context.body) as UpdateFolderInput,
          now,
        })) as JsonValue,
      },
    };
  }

  if (method === 'DELETE') {
    return {
      statusCode: 200,
      payload: {
        folder: (await organizer.deleteFolder({
          actor,
          id: folderId,
          now,
        })) as JsonValue,
      },
    };
  }

  return undefined;
}

async function handleTagMemberRequest(
  method: string,
  tagId: string | undefined,
  context: RouteContext,
  actor: Actor,
  now: IsoDateTime,
  organizer: OrganizerService,
): Promise<RouteResult | undefined> {
  if (tagId === undefined) {
    return undefined;
  }

  if (method === 'PATCH') {
    return {
      statusCode: 200,
      payload: {
        tag: (await organizer.updateTag({
          actor,
          id: tagId,
          input: requireOrganizerObjectBody(context.body) as UpdateTagInput,
          now,
        })) as JsonValue,
      },
    };
  }

  if (method === 'DELETE') {
    return {
      statusCode: 200,
      payload: {
        tag: (await organizer.deleteTag({
          actor,
          id: tagId,
          now,
        })) as JsonValue,
      },
    };
  }

  return undefined;
}

async function handleReminderTagsRequest(
  method: string,
  reminderId: string | undefined,
  context: RouteContext,
  actor: Actor,
  now: IsoDateTime,
  organizer: OrganizerService,
): Promise<RouteResult | undefined> {
  if (reminderId === undefined) {
    return undefined;
  }

  if (method === 'GET') {
    return {
      statusCode: 200,
      payload: {
        tags: (await organizer.listReminderTags({
          actor,
          reminderId,
        })) as JsonValue,
      },
    };
  }

  if (method === 'PUT') {
    return {
      statusCode: 200,
      payload: {
        tags: (await organizer.setReminderTags({
          actor,
          reminderId,
          tagIds: requireTagIdsBody(context.body),
          now,
        })) as JsonValue,
      },
    };
  }

  return undefined;
}

function isOrganizerPath(pathname: string): boolean {
  return (
    pathname === '/v1/folders' ||
    pathname.startsWith('/v1/folders/') ||
    pathname === '/v1/tags' ||
    pathname.startsWith('/v1/tags/') ||
    /^\/v1\/reminders\/[^/]+\/tags$/.test(pathname) ||
    pathname.startsWith('/v1/smart-lists/')
  );
}

function parseSmartListKind(value: string | undefined): SmartListKind {
  const smartListKinds = new Set<SmartListKind>([
    'character',
    'folder',
    'home',
    'overdue',
    'tag',
    'today',
    'work',
  ]);

  if (value !== undefined && smartListKinds.has(value as SmartListKind)) {
    return value as SmartListKind;
  }

  throw new OrganizerServiceError('ORGANIZER_VALIDATION_ERROR', 'Unsupported smart list kind', {
    field: 'kind',
  });
}

export async function routeRequest(
  method: string,
  requestUrl: string,
  host: string,
  config: RuntimeConfig,
  context: RouteContext = {},
): Promise<RouteResult> {
  const normalizedMethod = method.toUpperCase();
  const url = new URL(requestUrl, `http://${host}`);

  const organizerResult = await routeOrganizerRequest(normalizedMethod, url, context);

  if (organizerResult !== undefined) {
    return organizerResult;
  }

  const reminderResult = await routeReminderRequest(normalizedMethod, url.pathname, context);

  if (reminderResult !== undefined) {
    return reminderResult;
  }

  const characterResult = await routeCharacterRequest(normalizedMethod, url.pathname, context);

  if (characterResult !== undefined) {
    return characterResult;
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
