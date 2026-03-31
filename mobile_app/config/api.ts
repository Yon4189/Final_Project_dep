// config/api.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const getPcIpAddress = (): string | null => {
  if (!__DEV__) return null;

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      console.log('📱 Resolved PC IP from hostUri:', host);
      return host;
    }
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  if (Platform.OS === 'ios' && !hostUri) {
    return 'localhost';
  }

  return null;
};

const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (process.env.EXPO_PUBLIC_API_IP) {
    return `http://${process.env.EXPO_PUBLIC_API_IP}:8000/api`;
  }

  if (__DEV__) {
    const pcIp = getPcIpAddress();
    if (pcIp) {
      return `http://${pcIp}:8000/api`;
    }

    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000/api';
    }
    return 'http://localhost:8000/api';
  }

  const baseUrl = 'https://your-production-server.com/api';
  console.log('🌐 API Base URL:', baseUrl);
  return baseUrl;
};

export const API_BASE_URL = getApiBaseUrl();
export const PC_IP_ADDRESS = getPcIpAddress();