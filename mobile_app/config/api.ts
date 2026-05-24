// config/api.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT?.trim() || '8000';
const DEFAULT_PRODUCTION_API_URL = 'https://final-project-production-3f09.up.railway.app/api/v1';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const normalizeHost = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//i, '');
  const withoutPath = withoutProtocol.split('/')[0];
  const host = withoutPath.split(':')[0];

  if (!host) {
    return null;
  }

  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  return host;
};

const getExpoHostCandidates = (): Array<string | undefined> => {
  const manifest = (Constants as any).manifest;
  const manifest2 = (Constants as any).manifest2;
  const expoGoConfig = (Constants as any).expoGoConfig;
  const extra = (Constants.expoConfig?.extra || {}) as {
    apiIp?: string;
    expoClient?: { hostUri?: string };
  };

  return [
    extra.apiIp,
    Constants.expoConfig?.hostUri,
    extra.expoClient?.hostUri,
    manifest?.debuggerHost,
    manifest2?.extra?.expoClient?.hostUri,
    expoGoConfig?.debuggerHost,
  ];
};

export const getPcIpAddress = (): string | null => {
  if (!__DEV__) {
    return null;
  }

  for (const candidate of getExpoHostCandidates()) {
    const host = normalizeHost(candidate);
    if (host) {
      return host;
    }
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  if (Platform.OS === 'ios') {
    return 'localhost';
  }

  return null;
};

const getConfiguredApiBaseUrl = (): string | null => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  const configuredIp = normalizeHost(process.env.EXPO_PUBLIC_API_IP);
  if (configuredIp) {
    return `http://${configuredIp}:${DEFAULT_API_PORT}/api/v1`;
  }

  return null;
};

export const getApiBaseUrl = (): string => {
  // First, check if there is an explicit API URL configured in the env file.
  // This allows overriding the base URL (e.g. for ngrok testing)
  // in both development and production modes.
  const configuredUrl = getConfiguredApiBaseUrl();
  if (configuredUrl) {
    return configuredUrl;
  }

  if (__DEV__) {
    const detectedHost = getPcIpAddress();
    if (detectedHost) {
      return `http://${detectedHost}:${DEFAULT_API_PORT}/api/v1`;
    }

    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${DEFAULT_API_PORT}/api/v1`;
    }

    return `http://localhost:${DEFAULT_API_PORT}/api/v1`;
  }

  return DEFAULT_PRODUCTION_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
export const API_HOST = normalizeHost(API_ORIGIN) || getPcIpAddress();
export const PC_IP_ADDRESS = getPcIpAddress();
