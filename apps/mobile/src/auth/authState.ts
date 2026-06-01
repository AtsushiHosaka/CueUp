export type AuthUiError =
  | 'account_deleted'
  | 'duplicate_account'
  | 'expired_session'
  | 'invalid_credentials'
  | 'unknown';

export type AuthState =
  | {
      status: 'signedOut';
      error?: AuthUiError;
    }
  | {
      status: 'authenticated';
      sessionId: string;
      userId: string;
    }
  | {
      status: 'expired';
      error: 'expired_session';
    };

export type AuthAction =
  | {
      type: 'signedIn';
      sessionId: string;
      userId: string;
    }
  | {
      type: 'signedOut';
    }
  | {
      type: 'authExpired';
    }
  | {
      type: 'authFailed';
      error: AuthUiError;
    };

export const initialAuthState: AuthState = {
  status: 'signedOut',
};

export function authReducer(_state: AuthState, action: AuthAction): AuthState {
  if (action.type === 'signedIn') {
    return {
      status: 'authenticated',
      sessionId: action.sessionId,
      userId: action.userId,
    };
  }

  if (action.type === 'authExpired') {
    return {
      status: 'expired',
      error: 'expired_session',
    };
  }

  if (action.type === 'authFailed') {
    return {
      status: 'signedOut',
      error: action.error,
    };
  }

  return initialAuthState;
}

export function canAccessProtectedScreens(state: AuthState): boolean {
  return state.status === 'authenticated';
}
