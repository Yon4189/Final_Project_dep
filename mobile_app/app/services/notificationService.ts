import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

// Dynamic require to avoid side-effects in Expo Go (SDK 53+)
const getNotifications = () => {
  if (isExpoGo) return null;
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

const Notifications = getNotifications();

// Configure how notifications are handled when the app is in the foreground
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

class NotificationService {
  /**
   * Register for push notifications and get the token
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (isExpoGo) {
      console.warn('Push Notifications (remote) are not supported in Expo Go. Returning mock token for development.');
      return 'expo-go-mock-token';
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    if (!Notifications) return null;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      // Get the project ID from Expo constants or app config
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (!projectId) {
        console.warn('No EAS Project ID found. Push notifications require an EAS project.');
        return 'mock-token-no-eas';
      }

      // Get the token from Expo using the valid projectId
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;

      console.log('Expo Push Token:', token);

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Send the push token to the backend
   */
  async syncTokenWithBackend(token: string, userType: 'customer' | 'provider'): Promise<boolean> {
    try {
      const storedToken = await SecureStore.getItemAsync('push_token_synced');

      // Only sync if the token has changed or not yet synced
      if (storedToken === token) {
        return true;
      }

      const response = await api.post(`/${userType}/push-token`, {
        push_token: token,
      });

      if ((response as any).success) {
        await SecureStore.setItemAsync('push_token_synced', token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to sync push token with backend:', error);
      return false;
    }
  }

  /**
   * Handle incoming notifications
   */
  addNotificationListener(callback: (notification: any) => void): { remove: () => void } {
    if (isExpoGo || !Notifications) return { remove: () => {} };
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Handle user tapping on a notification
   */
  addNotificationResponseListener(callback: (response: any) => void): { remove: () => void } {
    if (isExpoGo || !Notifications) return { remove: () => {} };
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
