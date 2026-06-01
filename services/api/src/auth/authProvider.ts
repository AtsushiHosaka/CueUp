import type { AuthProvider } from '@cueup/shared';

import { AuthServiceError } from './authErrors.js';

export type ExternalIdentity = {
  provider: AuthProvider;
  providerAccountId: string;
  email?: string | null;
  displayName?: string | null;
};

export interface AuthTokenVerifier {
  verify(rawToken: string): Promise<ExternalIdentity>;
}

export class StaticTokenVerifier implements AuthTokenVerifier {
  constructor(private readonly identitiesByToken: ReadonlyMap<string, ExternalIdentity>) {}

  async verify(rawToken: string): Promise<ExternalIdentity> {
    if (rawToken.startsWith('expired:')) {
      throw new AuthServiceError('AUTH_TOKEN_EXPIRED', 'Authentication token has expired');
    }

    const identity = this.identitiesByToken.get(rawToken);

    if (identity === undefined) {
      throw new AuthServiceError('AUTH_INVALID_CREDENTIALS', 'Authentication token is invalid');
    }

    return identity;
  }
}
