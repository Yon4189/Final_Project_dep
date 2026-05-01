// app/services/googleAuth.service.ts
import { api } from './api';

/**
 * Exchanges a Google ID token with the backend for an app token.
 * Used for customer Google sign-in.
 */
export async function loginWithGoogleToken(
  token: string
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    // Send as id_token for proper backend validation
    const response = await api.post<any>('/customer/google-login', { id_token: token });
    return response as any;
  } catch (error: any) {
    console.error('Google login API error:', error);
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
    // Send as id_token for proper backend validation
    const response = await api.post<any>('/provider/google-login', { id_token: token });
    return response as any;
  } catch (error: any) {
    console.error('Google provider login API error:', error);
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
      id_token: token,
      ...additionalData,
    });
    return response as any;
  } catch (error: any) {
    console.error('Google registration API error:', error);
    return { success: false, message: error.message || 'Google registration failed' };
  }
}

/**
 * Shared helper: Launch Google OAuth flow using expo-auth-session.
 * Returns the ID token (not access token) for backend verification.
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
    console.error('Google Client ID not configured. Check EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB in .env');
    return { accessToken: null, userInfo: null, error: 'Google Client ID not configured' };
  }

  try {
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    console.log('Google OAuth Redirect URI:', redirectUri);
    console.log('Google Client ID:', clientId);
    
    const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');

    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      // Request ID token instead of just access token
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: {
        // Force account selection
        prompt: 'select_account',
      },
    });

    console.log('Launching Google OAuth prompt...');
    const result = await request.promptAsync(discovery);
    console.log('Google OAuth result type:', result.type);

    if (result.type === 'success') {
      // Get ID token (preferred) or access token as fallback
      const idToken = result.authentication?.idToken;
      const accessToken = result.authentication?.accessToken;
      
      console.log('Has ID token:', !!idToken);
      console.log('Has access token:', !!accessToken);

      if (idToken) {
        // Decode ID token to get user info (JWT format)
        try {
          const base64Url = idToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const userInfo = JSON.parse(jsonPayload);
          console.log('Decoded user info from ID token:', userInfo);

          return { accessToken: idToken, userInfo };
        } catch (decodeError) {
          console.error('Failed to decode ID token:', decodeError);
        }
      }

      if (accessToken) {
        // Fallback: Fetch user info from Google using access token
        console.log('Fetching user info with access token...');
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userInfo = await userInfoRes.json();
        console.log('Fetched user info:', userInfo);

        return { accessToken, userInfo };
      }

      return { accessToken: null, userInfo: null, error: 'No token received from Google' };
    } else if (result.type === 'cancel') {
      console.log('User cancelled Google sign-in');
      return { accessToken: null, userInfo: null, error: 'cancelled' };
    } else {
      console.error('Google sign-in failed:', result);
      return { accessToken: null, userInfo: null, error: 'Google sign-in failed' };
    }
  } catch (error: any) {
    console.error('Google OAuth error:', error);
    return { accessToken: null, userInfo: null, error: error.message || 'Google sign-in failed' };
  }
}
