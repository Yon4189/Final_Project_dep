import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../app/services/notificationService';
import { useUser } from '../app/store/customerStore';
import { useProviderProfile } from '../app/store/providerStore';
import { useRouter } from 'expo-router';

export const useNotifications = () => {
  const customer = useUser();
  const provider = useProviderProfile();
  const router = useRouter();
  
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupNotifications = async () => {
      // 1. Determine user type
      let userType: 'customer' | 'provider' | null = null;
      if (customer) userType = 'customer';
      else if (provider) userType = 'provider';

      if (!userType) return;

      // 2. Register for token
      const token = await notificationService.registerForPushNotificationsAsync();
      
      if (token && isMounted) {
        // 3. Sync with backend
        await notificationService.syncTokenWithBackend(token, userType);
      }
    };

    setupNotifications();

    // 4. Handle foreground notifications
    notificationListener.current = notificationService.addNotificationListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // 5. Handle notification tap (interaction)
    responseListener.current = notificationService.addNotificationResponseListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data as any;
      
      // Navigate based on notification type
      const bookingId = data?.bookingID || data?.booking_id;
      const disputeId = data?.disputeID || data?.dispute_id;
      const conversationId = data?.conversationID || data?.conversation_id;

      if (data?.type === 'booking_request' || data?.type === 'booking_accepted' || data?.type === 'booking_confirmed') {
        if (bookingId) {
          const path = customer 
            ? `/(customer)/requests/${bookingId}` 
            : `/(provider)/requests/${bookingId}`;
          router.push(path as any);
        }
      } else if (data?.type === 'payment_reminder_24h' || data?.type === 'payment_reminder_48h' || data?.type === 'payment_overdue') {
        if (bookingId) {
          router.push({ pathname: '/(customer)/payment', params: { bookingId } } as any);
        }
      } else if (data?.type === 'immediate_payout_credited' || data?.type === 'held_payout_scheduled' || data?.type === 'held_payout_released') {
        router.push('/(provider)/wallet' as any);
      } else if (data?.type === 'dispute' || data?.type === 'dispute_message') {
        if (disputeId) {
          router.push(`/(customer)/complaints` as any);
        }
      } else if (data?.type === 'new_message' || data?.type === 'chat') {
        if (conversationId) {
          const path = customer
            ? `/(customer)/chat/${conversationId}`
            : `/(provider)/chat/${conversationId}`;
          router.push(path as any);
        }
      } else if (bookingId) {
        // Fallback: navigate to booking
        const path = customer 
          ? `/(customer)/requests/${bookingId}` 
          : `/(provider)/requests/${bookingId}`;
        router.push(path as any);
      }
    });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [customer?.customerID, provider?.providerID]);

  return null;
};
