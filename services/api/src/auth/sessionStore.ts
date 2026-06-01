import type { IsoDateTime, UUID } from '@cueup/shared';

import { AuthServiceError } from './authErrors.js';

export type AuthSession = {
  id: string;
  userId: UUID;
  expiresAt: IsoDateTime;
  revokedAt?: IsoDateTime | null;
};

export type SessionIdFactory = () => string;

export class InMemorySessionStore {
  private readonly sessions = new Map<string, AuthSession>();

  constructor(private readonly idFactory: SessionIdFactory) {}

  async createSession(params: {
    userId: UUID;
    now: Date;
    ttlMilliseconds: number;
  }): Promise<AuthSession> {
    const session: AuthSession = {
      id: this.idFactory(),
      userId: params.userId,
      expiresAt: new Date(params.now.getTime() + params.ttlMilliseconds).toISOString(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async requireSession(sessionId: string, now: Date): Promise<AuthSession> {
    const session = this.sessions.get(sessionId);

    if (session === undefined || session.revokedAt != null) {
      throw new AuthServiceError('AUTH_REQUIRED', 'Authentication session is required');
    }

    if (new Date(session.expiresAt).getTime() <= now.getTime()) {
      throw new AuthServiceError('AUTH_TOKEN_EXPIRED', 'Authentication session has expired');
    }

    return session;
  }

  async revokeSession(sessionId: string, revokedAt: IsoDateTime): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session !== undefined) {
      this.sessions.set(sessionId, {
        ...session,
        revokedAt,
      });
    }
  }
}
