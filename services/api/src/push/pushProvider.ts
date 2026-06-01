import type { DevicePlatform } from '@cueup/shared';

export type PushProviderRequest = {
  platform: DevicePlatform;
  token: string;
  title: string;
  body: string;
  iconUrl?: string | null;
};

export type PushProviderResult =
  | {
      status: 'sent';
      providerMessageId: string;
    }
  | {
      status: 'permission_denied';
      reason: string;
    }
  | {
      status: 'invalid_token';
      reason: string;
    }
  | {
      status: 'failed';
      reason: string;
      retryAfter?: Date;
    };

export interface PushProvider {
  send(request: PushProviderRequest): Promise<PushProviderResult>;
}

export class StaticPushProvider implements PushProvider {
  constructor(private readonly result: PushProviderResult) {}

  async send(): Promise<PushProviderResult> {
    return this.result;
  }
}
