/**
 * pusherClient.ts
 *
 * Thin wrapper around @pusher/pusher-websocket-react-native that connects
 * to a Laravel Reverb server.  All chat screens use this singleton.
 *
 * Reverb is Pusher-protocol–compatible, so the mobile SDK works unchanged.
 */
import Pusher from 'pusher-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ── Resolve the Reverb host from the same logic as the HTTP API ──────────────

const getReverbHost = (): string => {
  if (process.env.EXPO_PUBLIC_REVERB_HOST) {
    return process.env.EXPO_PUBLIC_REVERB_HOST;
  }
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host; // Same LAN IP as HTTP API
      }
    }
    if (Platform.OS === 'android') return '10.0.2.2';
  }
  return '127.0.0.1';
};

const REVERB_HOST   = getReverbHost();
const REVERB_PORT   = Number(process.env.EXPO_PUBLIC_REVERB_PORT   ?? 8080);
const REVERB_APP_KEY = process.env.EXPO_PUBLIC_REVERB_APP_KEY ?? 'final-project-key';
const API_BASE_URL   = `http://${REVERB_HOST}:8000/api`;

// ── Singleton ─────────────────────────────────────────────────────────────────

let pusherInstance: Pusher | null = null;
let connecting = false;

export async function getPusher(): Promise<Pusher> {
  if (pusherInstance) return pusherInstance;
  if (connecting) {
    // Wait until the other call finishes
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
    console.log('[Reverb] Connected ✅');
    return instance;
  } finally {
    connecting = false;
  }
}

/** Subscribe to new messages on a private conversation channel. */
export async function subscribeToConversation(
  conversationId: number,
  onMessageReceived: (data: any) => void,
) {
  const pusher = await getPusher();
  const channelName = `private-conversation.${conversationId}`;

  const channel = pusher.subscribe(channelName);
  
  channel.bind('MessageSent', (data: any) => {
    try {
      // pusher-js usually parses the JSON for us automatically, but just in case:
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      onMessageReceived(payload);
    } catch (e) {
      console.warn('[Reverb] Failed to parse event data:', e);
    }
  });

  console.log(`[Reverb] Subscribed to ${channelName}`);
  return channel;
}

/** Unsubscribe and, if no channels are left, disconnect. */
export async function unsubscribeFromConversation(conversationId: number) {
  if (!pusherInstance) return;
  const channelName = `private-conversation.${conversationId}`;
  pusherInstance.unsubscribe(channelName);
  console.log(`[Reverb] Unsubscribed from ${channelName}`);
}

/** Subscribe to user-specific updates (e.g. booking changes). */
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
    } catch (e) {
      console.warn('[Reverb] Failed to parse event data:', e);
    }
  });

  console.log(`[Reverb] Subscribed to ${channelName}`);
  return channel;
}

/** Unsubscribe from user-specific updates. */
export async function unsubscribeFromUserUpdates(
  userType: 'customer' | 'provider',
  userId: string | number,
) {
  if (!pusherInstance) return;
  const channelName = `private-${userType}.${userId}`;
  pusherInstance.unsubscribe(channelName);
  console.log(`[Reverb] Unsubscribed from ${channelName}`);
}

/** Explicitly disconnect (call on logout). */
export async function disconnectPusher() {
  if (!pusherInstance) return;
  await pusherInstance.disconnect();
  pusherInstance = null;
  console.log('[Reverb] Disconnected');
}

/** Subscribe to live provider location updates for a booking. */
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
    } catch (e) {
      console.warn('[Reverb] Failed to parse tracking data:', e);
    }
  });

  console.log(`[Reverb] Subscribed to booking tracking: ${channelName}`);
  return channel;
}

/** Unsubscribe from booking live tracking channel. */
export async function unsubscribeFromBookingTracking(bookingId: string | number) {
  if (!pusherInstance) return;
  const channelName = `private-booking.${bookingId}`;
  pusherInstance.unsubscribe(channelName);
  console.log(`[Reverb] Unsubscribed from booking tracking: ${channelName}`);
}
