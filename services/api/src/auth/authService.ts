import type { AuthProvider, User, UUID } from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import { AuthServiceError } from './authErrors.js';
import type { AuthTokenVerifier, ExternalIdentity } from './authProvider.js';
import type { AuthSession } from './sessionStore.js';
import { InMemorySessionStore } from './sessionStore.js';
import type { UserAccount, UserRepository } from './userRepository.js';

const DEFAULT_SESSION_TTL_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

export type SignInDefaults = {
  locale: string;
  timezone: string;
};

export type SignInResult = {
  user: User;
  session: AuthSession;
  isNewUser: boolean;
};

export type UserIdFactory = () => UUID;

export class AuthService {
  constructor(
    private readonly verifier: AuthTokenVerifier,
    private readonly users: UserRepository,
    private readonly sessions: InMemorySessionStore,
    private readonly userIdFactory: UserIdFactory,
    private readonly sessionTtlMilliseconds = DEFAULT_SESSION_TTL_MILLISECONDS,
  ) {}

  async signInWithToken(params: {
    rawToken: string;
    defaults: SignInDefaults;
    now: Date;
  }): Promise<SignInResult> {
    const identity = await this.verifier.verify(params.rawToken);
    const existingUser = await this.users.findByProviderAccount(
      identity.provider,
      identity.providerAccountId,
    );

    if (existingUser !== undefined) {
      if (existingUser.deletedAt != null) {
        throw new AuthServiceError('AUTH_ACCOUNT_DELETED', 'Account has been deleted');
      }

      return {
        user: existingUser,
        session: await this.sessions.createSession({
          userId: existingUser.id,
          now: params.now,
          ttlMilliseconds: this.sessionTtlMilliseconds,
        }),
        isNewUser: false,
      };
    }

    await this.assertNoDuplicateActiveAccount(identity);

    const user = await this.users.save(
      createUserAccount({
        id: this.userIdFactory(),
        identity,
        defaults: params.defaults,
        now: params.now.toISOString(),
      }),
    );

    return {
      user,
      session: await this.sessions.createSession({
        userId: user.id,
        now: params.now,
        ttlMilliseconds: this.sessionTtlMilliseconds,
      }),
      isNewUser: true,
    };
  }

  async requireActor(sessionId: string, now: Date): Promise<Actor> {
    const session = await this.sessions.requireSession(sessionId, now);
    const user = await this.users.findById(session.userId);

    if (user === undefined || user.deletedAt != null) {
      throw new AuthServiceError('AUTH_REQUIRED', 'Authentication session is not usable');
    }

    return {
      userId: user.id,
      role: 'user',
    };
  }

  async logout(sessionId: string, now: Date): Promise<void> {
    await this.sessions.revokeSession(sessionId, now.toISOString());
  }

  async deleteAccount(params: { actor: Actor; now: Date }): Promise<User> {
    const user = await this.users.findById(params.actor.userId);

    if (user === undefined || user.deletedAt != null) {
      throw new AuthServiceError('AUTH_REQUIRED', 'Authentication session is not usable');
    }

    return this.users.save({
      ...user,
      email: null,
      displayName: null,
      deletedAt: params.now.toISOString(),
      updatedAt: params.now.toISOString(),
    });
  }

  private async assertNoDuplicateActiveAccount(identity: ExternalIdentity): Promise<void> {
    if (identity.email == null) {
      return;
    }

    const duplicateUser = await this.users.findActiveByEmail(identity.email);

    if (duplicateUser !== undefined) {
      throw new AuthServiceError(
        'AUTH_ACCOUNT_DUPLICATE',
        'Email is already linked to another account',
      );
    }
  }
}

function createUserAccount(params: {
  id: UUID;
  identity: ExternalIdentity;
  defaults: SignInDefaults;
  now: string;
}): UserAccount {
  return {
    id: params.id,
    provider: params.identity.provider as AuthProvider,
    providerAccountId: params.identity.providerAccountId,
    email: params.identity.email ?? null,
    displayName: params.identity.displayName ?? null,
    locale: params.defaults.locale,
    timezone: params.defaults.timezone,
    plan: 'free',
    createdAt: params.now,
    updatedAt: params.now,
    deletedAt: null,
  };
}
