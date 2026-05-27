import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { api } from './api';
import { Platform } from 'react-native';

import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// These should ideally come from environment variables
// For now, these are placeholders. The user needs to provide their own
// Google Client IDs from the Google Cloud Console.
const GOOGLE_CLIENT_IDS = {
  webClientId: '201510205977-kvgq9qkfh0oeqstsbhsfet018rh9fl48.apps.googleusercontent.com',
  iosClientId: '',
  androidClientId: '201510205977-qc5oekbqigcb8a3psonacv80rq5nj07j.apps.googleusercontent.com',
};

import Constants, { ExecutionEnvironment } from 'expo-constants';

export const useGoogleAuth = () => {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const redirectUri = Platform.OS === 'web' 
    ? AuthSession.makeRedirectUri() 
    : (isExpoGo 
        ? 'https://auth.expo.io/@yoseph2123/mobile_app' 
        : AuthSession.makeRedirectUri({ scheme: 'mobileapp' }));

  console.log('--- GOOGLE AUTH DEBUG ---');
  console.log('Final Redirect URI:', redirectUri);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
    // Only pass native IDs if we are not on web
    ...(Platform.OS === 'android' ? { androidClientId: GOOGLE_CLIENT_IDS.androidClientId } : {}),
    ...(Platform.OS === 'ios' ? { iosClientId: GOOGLE_CLIENT_IDS.iosClientId } : {}),
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  const getGoogleUserInfo = async () => {
    try {
      const result = await promptAsync();

      if (result?.type === 'success') {
        const { authentication } = result;
        
        // Fetch user info from Google using the access token
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${authentication?.accessToken}` },
        });

        const userInfo = await response.json();
        
        return {
          success: true,
          data: {
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            id_token: result.params.id_token
          }
        };
      }
      return { success: false, message: 'Google sign-in cancelled' };
    } catch (error: any) {
      console.error('Google Info Fetch Error:', error);
      return { success: false, message: error.message };
    }
  };

  const handleGoogleSignIn = async (userType: 'customer' | 'provider') => {
    try {
      const result = await promptAsync();

      if (result?.type === 'success') {
        const { id_token } = result.params;

        if (!id_token) {
          throw new Error('No ID token received from Google');
        }

        const endpoint = userType === 'customer'
          ? '/auth/google/customer'
          : '/auth/google/provider';

        const response = await api.post<any>(endpoint, {
          id_token: id_token
        });

        return response;
      } else {
        return { success: false, message: 'Google sign-in cancelled or failed' };
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      return { success: false, message: error.message || 'An error occurred during Google sign-in' };
    }
  };

  return {
    handleGoogleSignIn,
    getGoogleUserInfo,
    isReady: !!request,
  };
};
