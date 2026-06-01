const DEFAULT_API_BASE_URL = 'http://localhost:3000';

export type ClientConfig = {
  apiBaseUrl: string;
};

export function getClientConfig(env: Record<string, string | undefined>): ClientConfig {
  return {
    apiBaseUrl: env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  };
}

export const clientConfig = getClientConfig(process.env);
