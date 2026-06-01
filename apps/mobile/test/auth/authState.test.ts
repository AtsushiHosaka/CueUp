import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authReducer,
  canAccessProtectedScreens,
  initialAuthState,
} from '../../src/auth/authState.js';

test('authReducer allows protected screens only while authenticated', () => {
  const signedIn = authReducer(initialAuthState, {
    type: 'signedIn',
    sessionId: 'session-1',
    userId: 'user-1',
  });

  assert.equal(canAccessProtectedScreens(signedIn), true);
  assert.equal(canAccessProtectedScreens(authReducer(signedIn, { type: 'signedOut' })), false);
});

test('authReducer exposes API auth errors for UI handling', () => {
  const failed = authReducer(initialAuthState, {
    type: 'authFailed',
    error: 'duplicate_account',
  });
  const expired = authReducer(initialAuthState, {
    type: 'authExpired',
  });

  assert.deepEqual(failed, {
    status: 'signedOut',
    error: 'duplicate_account',
  });
  assert.deepEqual(expired, {
    status: 'expired',
    error: 'expired_session',
  });
});
