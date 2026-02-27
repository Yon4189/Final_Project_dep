import Constants from 'expo-constants';

/**
 * Dynamically resolves the backend base URL.
 *
 * In development: reads the host from Expo's bundler manifest
 * (Constants.expoConfig.hostUri). Since the Expo dev server and
 * Laravel backend run on the same machine, they always share the
 * same IP — even when it changes between sessions.
 *
 * In production: replace the placeholder with your real server URL.
 */
const getApiBaseUrl = (): string => {
    if (__DEV__) {
        // hostUri looks like "192.168.x.x:8081" — extract just the IP part
        const hostUri = Constants.expoConfig?.hostUri;
        if (hostUri) {
            const host = hostUri.split(':')[0];
            return `http://${host}:8000/api`;
        }
        // Fallback for Android emulator / iOS simulator
        return 'http://localhost:8000/api';
    }
    // 🔴 Replace with your real production API URL before deploying
    return 'https://your-production-server.com/api';
};

export const API_BASE_URL = getApiBaseUrl();