export const SERVER_ONLY_CREDENTIAL_NAMES = [
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'APNS_PRIVATE_KEY',
  'APNS_KEY_ID',
  'APNS_TEAM_ID',
  'FCM_SERVICE_ACCOUNT_JSON',
  'APP_STORE_SHARED_SECRET',
  'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
] as const;

export type AiProvider = 'disabled' | 'openai' | 'gemini';
export type BillingProductKind = 'character_pack' | 'pro_subscription';
export type BillingPlatform = 'app_store' | 'google_play';

export type BillingProductConfig = {
  id: string;
  displayName: string;
  kind: BillingProductKind;
  platform: BillingPlatform;
  priceLabel: string | null;
  productId: string;
  packId?: string;
};

export type RuntimeConfig = {
  port: number;
  nodeEnv: string;
  aiProvider: AiProvider;
  billingVerificationEnabled: boolean;
  billingProducts: BillingProductConfig[];
  serverOnlyCredentialNames: readonly string[];
};

export const DEFAULT_BILLING_PRODUCTS = [
  {
    id: 'pro-app-store',
    displayName: 'CueUp Pro',
    kind: 'pro_subscription',
    platform: 'app_store',
    priceLabel: null,
    productId: 'cueup.pro.monthly',
  },
  {
    id: 'pro-google-play',
    displayName: 'CueUp Pro',
    kind: 'pro_subscription',
    platform: 'google_play',
    priceLabel: null,
    productId: 'cueup.pro.monthly',
  },
  {
    id: 'starter-pack-app-store',
    displayName: 'Starter Character Pack',
    kind: 'character_pack',
    packId: 'starter-pack',
    platform: 'app_store',
    priceLabel: null,
    productId: 'cueup.pack.starter',
  },
  {
    id: 'starter-pack-google-play',
    displayName: 'Starter Character Pack',
    kind: 'character_pack',
    packId: 'starter-pack',
    platform: 'google_play',
    priceLabel: null,
    productId: 'cueup.pack.starter',
  },
] as const satisfies BillingProductConfig[];

export function parsePort(value: string | undefined, fallback = 3000): number {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return parsed;
}

export function parseAiProvider(value: string | undefined): AiProvider {
  if (value === undefined || value === '') {
    return 'disabled';
  }

  if (value === 'disabled' || value === 'openai' || value === 'gemini') {
    return value;
  }

  throw new Error(`Invalid AI_PROVIDER value: ${value}`);
}

export function parseBillingProducts(value: string | undefined): BillingProductConfig[] {
  if (value === undefined || value === '') {
    return [...DEFAULT_BILLING_PRODUCTS];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Invalid BILLING_PRODUCTS_JSON value');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('BILLING_PRODUCTS_JSON must be an array');
  }

  return parsed.map((product, index) => parseBillingProduct(product, index));
}

export function parseBooleanFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  throw new Error(`Invalid boolean flag value: ${value}`);
}

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    port: parsePort(env.PORT),
    nodeEnv: env.NODE_ENV ?? 'development',
    aiProvider: parseAiProvider(env.AI_PROVIDER),
    billingVerificationEnabled: parseBooleanFlag(env.BILLING_VERIFICATION_ENABLED),
    billingProducts: parseBillingProducts(env.BILLING_PRODUCTS_JSON),
    serverOnlyCredentialNames: SERVER_ONLY_CREDENTIAL_NAMES,
  };
}

function parseBillingProduct(value: unknown, index: number): BillingProductConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`BILLING_PRODUCTS_JSON[${index}] must be an object`);
  }

  const product = value as Record<string, unknown>;
  const kind = product.kind;
  const platform = product.platform;

  if (kind !== 'pro_subscription' && kind !== 'character_pack') {
    throw new Error(`BILLING_PRODUCTS_JSON[${index}].kind is invalid`);
  }

  if (platform !== 'app_store' && platform !== 'google_play') {
    throw new Error(`BILLING_PRODUCTS_JSON[${index}].platform is invalid`);
  }

  const id = requiredString(product.id, `BILLING_PRODUCTS_JSON[${index}].id`);
  const displayName = requiredString(
    product.displayName,
    `BILLING_PRODUCTS_JSON[${index}].displayName`,
  );
  const productId = requiredString(product.productId, `BILLING_PRODUCTS_JSON[${index}].productId`);
  const priceLabel =
    product.priceLabel === null || product.priceLabel === undefined
      ? null
      : requiredString(product.priceLabel, `BILLING_PRODUCTS_JSON[${index}].priceLabel`);

  if (kind === 'character_pack') {
    return {
      id,
      displayName,
      kind,
      packId: requiredString(product.packId, `BILLING_PRODUCTS_JSON[${index}].packId`),
      platform,
      priceLabel,
      productId,
    };
  }

  return {
    id,
    displayName,
    kind,
    platform,
    priceLabel,
    productId,
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}
