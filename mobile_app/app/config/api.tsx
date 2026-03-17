import Constants from 'expo-constants';

const getApiBaseUrl = (): string => {

    // 1️⃣ Use environment variable first
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 2️⃣ Development fallback
    if (__DEV__) {
        const hostUri = Constants.expoConfig?.hostUri;

        if (hostUri) {
            const host = hostUri.split(':')[0];
            return `http://${host}:8000/api`;
        }

        return 'http://localhost:8000/api';
    }

    // 3️⃣ Production server
    return 'https://your-production-server.com/api';
};

export const API_BASE_URL = getApiBaseUrl();