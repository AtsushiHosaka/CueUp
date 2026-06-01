import type {
  Character,
  DevicePlatform,
  DeviceToken,
  IsoDateTime,
  NotificationMessage,
  PushDelivery,
  UUID,
} from '@cueup/shared';

import type { Actor } from '../data/accessControl.js';
import type { PushProvider } from './pushProvider.js';
import type { DeviceTokenRepository, PushDeliveryRepository } from './pushRepository.js';

export type PushIdFactory = () => UUID;

export class PushNotificationService {
  constructor(
    private readonly provider: PushProvider,
    private readonly deviceTokens: DeviceTokenRepository,
    private readonly deliveries: PushDeliveryRepository,
    private readonly idFactory: PushIdFactory,
  ) {}

  async registerDeviceToken(params: {
    actor: Actor;
    platform: DevicePlatform;
    token: string;
    now: IsoDateTime;
  }): Promise<DeviceToken> {
    const tokenValue = params.token.trim();

    if (tokenValue.length === 0) {
      throw new Error('Device token is required');
    }

    const existing = await this.deviceTokens.findByPlatformToken(params.platform, tokenValue);
    const deviceToken: DeviceToken = {
      id: existing?.id ?? this.idFactory(),
      userId: params.actor.userId,
      platform: params.platform,
      token: tokenValue,
      status: 'active',
      lastRegisteredAt: params.now,
      invalidatedAt: null,
      createdAt: existing?.createdAt ?? params.now,
      updatedAt: params.now,
    };

    return this.deviceTokens.save(deviceToken);
  }

  async invalidateDeviceToken(params: {
    actor: Actor;
    deviceTokenId: UUID;
    now: IsoDateTime;
  }): Promise<DeviceToken | undefined> {
    const activeTokens = await this.deviceTokens.listActiveByUser(params.actor.userId);
    const token = activeTokens.find((deviceToken) => deviceToken.id === params.deviceTokenId);

    if (token === undefined) {
      return undefined;
    }

    return this.deviceTokens.save({
      ...token,
      status: 'invalid',
      invalidatedAt: params.now,
      updatedAt: params.now,
    });
  }

  async sendToActiveDevices(params: {
    actor: Actor;
    notificationMessage: NotificationMessage;
    character: Pick<Character, 'name' | 'iconUrl'>;
    now: Date;
  }): Promise<PushDelivery[]> {
    const activeTokens = await this.deviceTokens.listActiveByUser(params.actor.userId);
    const deliveries: PushDelivery[] = [];

    for (const deviceToken of activeTokens) {
      const providerResult = await this.provider.send({
        platform: deviceToken.platform,
        token: deviceToken.token,
        title: params.character.name,
        body: params.notificationMessage.body,
        iconUrl: params.character.iconUrl ?? null,
      });

      if (providerResult.status === 'sent') {
        deliveries.push(
          await this.deliveries.save({
            id: this.idFactory(),
            userId: params.actor.userId,
            deviceTokenId: deviceToken.id,
            notificationMessageId: params.notificationMessage.id,
            status: 'sent',
            providerMessageId: providerResult.providerMessageId,
            failureReason: null,
            retryAfter: null,
            createdAt: params.now.toISOString(),
          }),
        );
      } else {
        if (providerResult.status === 'invalid_token') {
          await this.deviceTokens.save({
            ...deviceToken,
            status: 'invalid',
            invalidatedAt: params.now.toISOString(),
            updatedAt: params.now.toISOString(),
          });
        }

        deliveries.push(
          await this.deliveries.save({
            id: this.idFactory(),
            userId: params.actor.userId,
            deviceTokenId: deviceToken.id,
            notificationMessageId: params.notificationMessage.id,
            status: providerResult.status === 'permission_denied' ? 'permission_denied' : 'failed',
            providerMessageId: null,
            failureReason: providerResult.reason,
            retryAfter:
              providerResult.status === 'failed' && providerResult.retryAfter !== undefined
                ? providerResult.retryAfter.toISOString()
                : null,
            createdAt: params.now.toISOString(),
          }),
        );
      }
    }

    return deliveries;
  }
}
