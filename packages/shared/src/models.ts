import type { Plan } from './plans.js';

export type UUID = string;
export type IsoDateTime = string;
export type JsonObject = Record<string, unknown>;

export type AuthProvider = 'apple' | 'google' | 'email';
export type ReminderStatus = 'active' | 'completed' | 'snoozed' | 'deleted';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';
export type CharacterType = 'built_in' | 'custom' | 'pack';
export type GenerationStatus = 'success' | 'fallback' | 'failed';
export type BillingPlatform = 'app_store' | 'google_play';
export type DevicePlatform = 'ios' | 'android';
export type DeviceTokenStatus = 'active' | 'disabled' | 'invalid';
export type PushDeliveryStatus = 'sent' | 'failed' | 'permission_denied';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'refunded';
export type PackPurchaseStatus = 'active' | 'refunded';
export type ChatRole = 'user' | 'assistant' | 'system';

export type Timestamped = {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type SoftDeletable = {
  deletedAt?: IsoDateTime | null;
};

export type ReminderRecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
};

export type User = Timestamped &
  SoftDeletable & {
    id: UUID;
    email?: string | null;
    provider: AuthProvider;
    displayName?: string | null;
    locale: string;
    timezone: string;
    plan: Plan;
  };

export type Reminder = Timestamped &
  SoftDeletable & {
    id: UUID;
    userId: UUID;
    title: string;
    note?: string | null;
    scheduledAt: IsoDateTime;
    recurrenceRule?: ReminderRecurrenceRule | null;
    characterId: UUID;
    folderId?: UUID | null;
    tagIds?: UUID[];
    status: ReminderStatus;
    completedAt?: IsoDateTime | null;
  };

export type Character = Timestamped & {
  id: UUID;
  ownerUserId?: UUID | null;
  type: CharacterType;
  name: string;
  description?: string | null;
  personaPrompt: string;
  strictness: number;
  warmth: number;
  catchphrases?: string[] | null;
  prohibitedStyle?: string[] | null;
  iconUrl?: string | null;
  packId?: UUID | null;
};

export type NotificationMessage = {
  id: UUID;
  userId: UUID;
  reminderId: UUID;
  characterId: UUID;
  body: string;
  generationStatus: GenerationStatus;
  sentAt?: IsoDateTime | null;
  completedAt?: IsoDateTime | null;
  aiModel?: string | null;
  tokenUsage?: JsonObject | null;
  hiddenAt?: IsoDateTime | null;
  createdAt: IsoDateTime;
};

export type Folder = Timestamped & {
  id: UUID;
  userId: UUID;
  name: string;
  color?: string | null;
  sortOrder: number;
};

export type Tag = Timestamped & {
  id: UUID;
  userId: UUID;
  name: string;
  color?: string | null;
};

export type ReminderTag = {
  reminderId: UUID;
  tagId: UUID;
};

export type Subscription = Timestamped & {
  id: UUID;
  userId: UUID;
  platform: BillingPlatform;
  productId: string;
  status: SubscriptionStatus;
  expiresAt?: IsoDateTime | null;
};

export type CharacterPackPurchase = {
  id: UUID;
  userId: UUID;
  packId: UUID;
  platform: BillingPlatform;
  purchasedAt: IsoDateTime;
  status: PackPurchaseStatus;
};

export type UsageQuota = Timestamped & {
  id: UUID;
  userId: UUID;
  period: string;
  aiNotificationCount: number;
  chatMessageCount: number;
};

export type ChatMessage = {
  id: UUID;
  userId: UUID;
  characterId: UUID;
  role: ChatRole;
  body: string;
  createdAt: IsoDateTime;
};

export type DeviceToken = Timestamped & {
  id: UUID;
  userId: UUID;
  platform: DevicePlatform;
  token: string;
  status: DeviceTokenStatus;
  lastRegisteredAt: IsoDateTime;
  invalidatedAt?: IsoDateTime | null;
};

export type PushDelivery = {
  id: UUID;
  userId: UUID;
  deviceTokenId: UUID;
  notificationMessageId: UUID;
  status: PushDeliveryStatus;
  providerMessageId?: string | null;
  failureReason?: string | null;
  retryAfter?: IsoDateTime | null;
  createdAt: IsoDateTime;
};

export type UserScopedRecord =
  | Reminder
  | NotificationMessage
  | Folder
  | Tag
  | Subscription
  | CharacterPackPurchase
  | UsageQuota
  | ChatMessage
  | DeviceToken
  | PushDelivery;
