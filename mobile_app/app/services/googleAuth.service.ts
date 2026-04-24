// app/services/googleAuth.service.ts
import { api } from './api';

/**
 * Exchanges a Google access/ID token with the backend for an app token.
 * Used for customer Google sign-in.
 */
export async function loginWithGoogleToken(
  token: string
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const response = await api.post<any>('/customer/google-login', { token });
    return response as any;
  } catch (error: any) {
    return { success: false, message: error.message || 'Google login failed' };
  }
}

/**
 * Exchanges a Google token with the backend for a provider app token.
 */
export async function loginWithGoogleTokenProvider(
  token: string
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const response = await api.post<any>('/provider/google-login', { token });
    return response as any;
  } catch (error: any) {
    return { success: false, message: error.message || 'Google login failed' };
  }
}

/**
 * Registers a new customer via Google OAuth.
 * Used on the customer registration page.
 */
export async function registerWithGoogle(
  token: string,
  additionalData?: { phone?: string; location?: string }
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const response = await api.post<any>('/customer/google-register', {
      token,
      ...additionalData,
    });
    return response as any;
  } catch (error: any) {
    return { success: false, message: error.message || 'Google registration failed' };
  }
}

/**
 * Shared helper: Launch Google OAuth flow using expo-auth-session.
 * Returns the access token or null.
 */
export async function launchGoogleOAuth(): Promise<{
  accessToken: string | null;
  userInfo: any | null;
  error?: string;
}> {
  let AuthSession: any;
  try {
    AuthSession = require('expo-auth-session');
  } catch {
    return { accessToken: null, userInfo: null, error: 'expo-auth-session not installed' };
  }

  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
  if (!clientId) {
    return { accessToken: null, userInfo: null, error: 'Google Client ID not configured' };
  }

  try {
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');

    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success' && result.authentication?.accessToken) {
      const accessToken = result.authentication.accessToken;

      // Fetch user info from Google
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json();

      return { accessToken, userInfo };
    } else if (result.type === 'cancel') {
      return { accessToken: null, userInfo: null, error: 'cancelled' };
    } else {
      return { accessToken: null, userInfo: null, error: 'Google sign-in failed' };
    }
  } catch (error: any) {
    return { accessToken: null, userInfo: null, error: error.message || 'Google sign-in failed' };
  }
}
