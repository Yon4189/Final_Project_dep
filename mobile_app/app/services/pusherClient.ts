/**
 * Thin wrapper around pusher-js that connects to Laravel Reverb.
 * All chat screens use this singleton.
 */
import Pusher from 'pusher-js';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_HOST } from '../config/api';

const REVERB_HOST = (__DEV__
  ? API_HOST || process.env.EXPO_PUBLIC_REVERB_HOST?.trim()
  : process.env.EXPO_PUBLIC_REVERB_HOST?.trim() || API_HOST) || '127.0.0.1';
const REVERB_PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? 8080);
const REVERB_APP_KEY = process.env.EXPO_PUBLIC_REVERB_APP_KEY ?? 'final-project-key';

let pusherInstance: Pusher | null = null;
let connecting = false;

export async function getPusher(): Promise<Pusher> {
  if (pusherInstance) return pusherInstance;
  if (connecting) {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    if (pusherInstance) return pusherInstance;
  }

  connecting = true;
  try {
    const token = await SecureStore.getItemAsync('user_token') ?? '';

    const instance = new Pusher(REVERB_APP_KEY, {
      cluster: 'mt1',
      wsHost: REVERB_HOST,
      wsPort: REVERB_PORT,
      wssPort: REVERB_PORT,
      forceTLS: false,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });
    pusherInstance = instance;
    console.log('[Reverb] Connected');
    return instance;
  } finally {
    connecting = false;
  }
}

export async function subscribeToConversation(
  conversationId: number,
  onMessageReceived: (data: any) => void,
) {
  const pusher = await getPusher();
  const channelName = `private-conversation.${conversationId}`;

  const channel = pusher.subscribe(channelName);

  channel.bind('MessageSent', (data: any) => {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      onMessageReceived(payload);
    } catch (error) {
      console.warn('[Reverb] Failed to parse event data:', error);
    }
  });

  console.log(`[Reverb] Subscribed to ${channelName}`);
  return channel;
}

export async function unsubscribeFromConversation(conversationId: number) {
  if (!pusherInstance) return;
  const channelName = `private-conversation.${conversationId}`;
  pusherInstance.unsubscribe(channelName);
  console.log(`[Reverb] Unsubscribed from ${channelName}`);
}

export async function subscribeToUserUpdates(
  userType: 'customer' | 'provider',
  userId: string | number,
  onUpdate: (data: any) => void,
) {
  const pusher = await getPusher();
  const channelName = `private-${userType}.${userId}`;

  const channel = pusher.subscribe(channelName);

  channel.bind('BookingUpdated', (data: any) => {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      onUpdate(payload);
    } catch (error) {
      console.warn('[Reverb] Failed to parse event data:', error);
    }
  });

  console.log(`[Reverb] Subscribed to ${channelName}`);
  return channel;
}

export async function unsubscribeFromUserUpdates(
  userType: 'customer' | 'provider',
  userId: string | number,
) {
  if (!pusherInstance) return;
  const channelName = `private-${userType}.${userId}`;
  pusherInstance.unsubscribe(channelName);
  console.log(`[Reverb] Unsubscribed from ${channelName}`);
}

export async function disconnectPusher() {
  if (!pusherInstance) return;
  await pusherInstance.disconnect();
  pusherInstance = null;
  console.log('[Reverb] Disconnected');
}

export async function subscribeToBookingTracking(
  bookingId: string | number,
  onLocationUpdate: (data: { latitude: number; longitude: number; speed?: number; heading?: number; tracked_at?: string }) => void,
) {
  const pusher = await getPusher();
  const channelName = `private-booking.${bookingId}`;

  const channel = pusher.subscribe(channelName);

  channel.bind('location.updated', (data: any) => {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      onLocationUpdate(payload);
    } catch (error) {
      console.warn('[Reverb] Failed to parse tracking data:', error);
    }
  });

  console.log(`[Reverb] Subscribed to booking tracking: ${channelName}`);
  return channel;
}

export async function unsubscribeFromBookingTracking(bookingId: string | number) {
  if (!pusherInstance) return;
  const channelName = `private-booking.${bookingId}`;
  pusherInstance.unsubscribe(channelName);
  console.log(`[Reverb] Unsubscribed from booking tracking: ${channelName}`);
}
