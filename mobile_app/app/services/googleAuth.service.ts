/**
 * Google OAuth service for Expo
 *
 * Setup required:
 * 1. Run: npx expo install expo-auth-session expo-crypto
 * 2. Add GOOGLE_CLIENT_ID to your .env (backend) and app.json (mobile)
 * 3. In app.json, add your scheme under "expo.scheme" (e.g. "hbservicefinder")
 *
 * Google Cloud Console setup:
 * - Create OAuth 2.0 credentials for "Android" and "iOS" app types
 * - For Expo Go testing, also create a "Web" credential
 * - Add the redirect URI: https://auth.expo.io/@your-username/your-app-slug
 */

import { api } from './api';

// These are set in app.json / eas.json
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || '';
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '';
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || '';

export interface GoogleAuthResult {
  success: boolean;
  idToken?: string;
  error?: string;
}

export interface GoogleLoginResponse {
  success: boolean;
  data?: {
    customerID: number;
    user_type: string;
    token: string;
    fullname: string;
    email: string;
    phone: string;
    profilePicture?: string;
    needs_phone_update?: boolean;
  };
  message?: string;
}

/**
 * Exchange a Google ID token with our backend for a session token.
 */
export async function loginWithGoogleToken(idToken: string): Promise<GoogleLoginResponse> {
  try {
    const response = await api.post<any>('/auth/google/customer', { id_token: idToken });
    return response as GoogleLoginResponse;
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Google login failed',
    };
  }
}

export { GOOGLE_CLIENT_ID_WEB, GOOGLE_CLIENT_ID_IOS, GOOGLE_CLIENT_ID_ANDROID };
