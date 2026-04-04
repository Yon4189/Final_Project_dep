import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiBaseUrl = (): string => {

    // 1️⃣ Use environment variable first
    // 1️⃣ Priority: Automatically detected IP (only in dev)
    if (__DEV__) {
        const dynamicIp = Constants.expoConfig?.extra?.apiIp;
        if (dynamicIp && dynamicIp !== 'localhost') {
            return `http://${dynamicIp}:8000/api`;
        }
    }

    // 2️⃣ Use environment variable if provided
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 3️⃣ Check for IP specified in env
    if (process.env.EXPO_PUBLIC_API_IP) {
        return `http://${process.env.EXPO_PUBLIC_API_IP}:8000/api`;
    }

    // 3️⃣ Development fallback
    if (__DEV__) {
        const hostUri = Constants.expoConfig?.hostUri;

        if (hostUri) {
            const host = hostUri.split(':')[0];
            if (host && host !== 'localhost' && host !== '127.0.0.1') {
                return `http://${host}:8000/api`;
            }
        }

        // Common emulator IP
        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:8000/api';
        }

        return 'http://localhost:8000/api';
    }

    // 3️⃣ Production server
    return 'https://your-production-server.com/api';
};

export const API_BASE_URL = getApiBaseUrl();