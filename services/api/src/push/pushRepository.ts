import type { DevicePlatform, DeviceToken, PushDelivery, UUID } from '@cueup/shared';

export interface DeviceTokenRepository {
  findByPlatformToken(platform: DevicePlatform, token: string): Promise<DeviceToken | undefined>;
  listActiveByUser(userId: UUID): Promise<DeviceToken[]>;
  save(token: DeviceToken): Promise<DeviceToken>;
}

export interface PushDeliveryRepository {
  save(delivery: PushDelivery): Promise<PushDelivery>;
  listByUser(userId: UUID): Promise<PushDelivery[]>;
}

export class InMemoryDeviceTokenRepository implements DeviceTokenRepository {
  private readonly tokens = new Map<UUID, DeviceToken>();

  constructor(initialTokens: DeviceToken[] = []) {
    for (const token of initialTokens) {
      this.tokens.set(token.id, token);
    }
  }

  async findByPlatformToken(
    platform: DevicePlatform,
    token: string,
  ): Promise<DeviceToken | undefined> {
    return [...this.tokens.values()].find(
      (deviceToken) => deviceToken.platform === platform && deviceToken.token === token,
    );
  }

  async listActiveByUser(userId: UUID): Promise<DeviceToken[]> {
    return [...this.tokens.values()].filter(
      (deviceToken) => deviceToken.userId === userId && deviceToken.status === 'active',
    );
  }

  async save(token: DeviceToken): Promise<DeviceToken> {
    this.tokens.set(token.id, token);
    return token;
  }
}

export class InMemoryPushDeliveryRepository implements PushDeliveryRepository {
  private readonly deliveries = new Map<UUID, PushDelivery>();

  async save(delivery: PushDelivery): Promise<PushDelivery> {
    this.deliveries.set(delivery.id, delivery);
    return delivery;
  }

  async listByUser(userId: UUID): Promise<PushDelivery[]> {
    return [...this.deliveries.values()].filter((delivery) => delivery.userId === userId);
  }
}
