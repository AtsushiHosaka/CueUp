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

export type RuntimeConfig = {
  port: number;
  nodeEnv: string;
  aiProvider: AiProvider;
  serverOnlyCredentialNames: readonly string[];
};

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

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    port: parsePort(env.PORT),
    nodeEnv: env.NODE_ENV ?? 'development',
    aiProvider: parseAiProvider(env.AI_PROVIDER),
    serverOnlyCredentialNames: SERVER_ONLY_CREDENTIAL_NAMES,
  };
}
