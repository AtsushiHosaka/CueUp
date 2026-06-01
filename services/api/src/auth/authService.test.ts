import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthServiceError } from './authErrors.js';
import { StaticTokenVerifier, type ExternalIdentity } from './authProvider.js';
import { AuthService } from './authService.js';
import { InMemorySessionStore } from './sessionStore.js';
import { InMemoryUserRepository, type UserAccount } from './userRepository.js';

const now = new Date('2026-06-01T09:00:00.000Z');
const defaults = {
  locale: 'en',
  timezone: 'Asia/Tokyo',
};
const identity: ExternalIdentity = {
  provider: 'apple',
  providerAccountId: 'apple-user-1',
  email: 'alice@example.com',
  displayName: 'Alice',
};

function createAuthService(
  params: {
    identities?: [string, ExternalIdentity][];
    users?: UserAccount[];
    sessionTtlMilliseconds?: number;
  } = {},
) {
  let userCounter = 1;
  let sessionCounter = 1;

  return new AuthService(
    new StaticTokenVerifier(new Map(params.identities ?? [['valid-token', identity]])),
    new InMemoryUserRepository(params.users),
    new InMemorySessionStore(() => `session-${sessionCounter++}`),
    () => `user-${userCounter++}`,
    params.sessionTtlMilliseconds,
  );
}

function createUser(overrides: Partial<UserAccount> = {}): UserAccount {
  return {
    id: 'user-existing',
    provider: 'apple',
    providerAccountId: 'apple-user-existing',
    email: 'existing@example.com',
    displayName: 'Existing',
    locale: 'en',
    timezone: 'Asia/Tokyo',
    plan: 'free',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

test('signInWithToken creates a user with locale timezone and free plan defaults', async () => {
  const auth = createAuthService();

  const result = await auth.signInWithToken({
    rawToken: 'valid-token',
    defaults,
    now,
  });

  assert.equal(result.isNewUser, true);
  assert.equal(result.user.id, 'user-1');
  assert.equal(result.user.locale, 'en');
  assert.equal(result.user.timezone, 'Asia/Tokyo');
  assert.equal(result.user.plan, 'free');
  assert.equal(result.session.userId, result.user.id);
});

test('signInWithToken returns an existing user for the same provider account', async () => {
  const auth = createAuthService({
    users: [createUser({ id: 'alice', providerAccountId: identity.providerAccountId })],
  });

  const result = await auth.signInWithToken({
    rawToken: 'valid-token',
    defaults,
    now,
  });

  assert.equal(result.isNewUser, false);
  assert.equal(result.user.id, 'alice');
});

test('signInWithToken rejects duplicate active email across providers', async () => {
  const auth = createAuthService({
    identities: [
      ['google-token', { ...identity, provider: 'google', providerAccountId: 'google-1' }],
    ],
    users: [createUser({ provider: 'apple', email: identity.email ?? null })],
  });

  await assert.rejects(
    () =>
      auth.signInWithToken({
        rawToken: 'google-token',
        defaults,
        now,
      }),
    { code: 'AUTH_ACCOUNT_DUPLICATE' },
  );
});

test('logout prevents access to protected actor context', async () => {
  const auth = createAuthService();
  const result = await auth.signInWithToken({
    rawToken: 'valid-token',
    defaults,
    now,
  });

  assert.deepEqual(await auth.requireActor(result.session.id, now), {
    userId: result.user.id,
    role: 'user',
  });

  await auth.logout(result.session.id, now);
  await assert.rejects(() => auth.requireActor(result.session.id, now), { code: 'AUTH_REQUIRED' });
});

test('requireActor rejects expired sessions', async () => {
  const auth = createAuthService({ sessionTtlMilliseconds: 1 });
  const result = await auth.signInWithToken({
    rawToken: 'valid-token',
    defaults,
    now,
  });

  await assert.rejects(() => auth.requireActor(result.session.id, new Date(now.getTime() + 2)), {
    code: 'AUTH_TOKEN_EXPIRED',
  });
});

test('deleteAccount anonymizes the user and invalidates future actor access', async () => {
  const auth = createAuthService();
  const result = await auth.signInWithToken({
    rawToken: 'valid-token',
    defaults,
    now,
  });
  const actor = await auth.requireActor(result.session.id, now);

  const deletedUser = await auth.deleteAccount({ actor, now });

  assert.equal(deletedUser.email, null);
  assert.equal(deletedUser.displayName, null);
  assert.equal(deletedUser.deletedAt, now.toISOString());
  await assert.rejects(() => auth.requireActor(result.session.id, now), { code: 'AUTH_REQUIRED' });
});

test('token verifier maps invalid and expired token failures', async () => {
  const auth = createAuthService();

  await assert.rejects(
    () => auth.signInWithToken({ rawToken: 'missing-token', defaults, now }),
    (error) => error instanceof AuthServiceError && error.code === 'AUTH_INVALID_CREDENTIALS',
  );
  await assert.rejects(
    () => auth.signInWithToken({ rawToken: 'expired:anything', defaults, now }),
    (error) => error instanceof AuthServiceError && error.code === 'AUTH_TOKEN_EXPIRED',
  );
});
