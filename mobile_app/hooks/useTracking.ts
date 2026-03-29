import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { providerService } from '@/app/services/provider.service';
import { Alert } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the global background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[TaskManager] Location error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];

    // We need to fetch the active booking ID from SecureStore or rely on the frontend
    // Unfortunately, the global task scope does not have access to React state.
    // However, if the service just attempts to sync the latest active tracking booking
    // from AsyncStorage, we can do it. For simplicity we will still emit to providerService.

    try {
      // Temporary hack: we use a global variable or storage to track the current booking ID.
      // In a real prod app, you should fetch the current active booking ID from storage here.
      // E.g., const bookingID = await AsyncStorage.getItem('active_tracking_booking');
      const bookingID = global.activeTrackingBookingId;
      if (bookingID) {
        await providerService.updateLocation({
          bookingID,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed || 0,
          heading: location.coords.heading || 0,
        });
      }
    } catch (err) {
      console.error('[TaskManager] Sync failed:', err);
    }
  }
});

// Polyfill global tracking so the background task has the ID.
declare global {
  var activeTrackingBookingId: string | null;
}
global.activeTrackingBookingId = null;

export const useTracking = (bookingID: string | null, active: boolean = false) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const subscription = useRef<Location.LocationSubscription | null>(null);

  const startTracking = async () => {
    if (!bookingID) return;

    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert('Background Location Denied', 'To track your progress while driving, please allow "Always" location access in settings.');
      }

      setIsTracking(true);
      global.activeTrackingBookingId = bookingID;

      // Start background location tracking instead of just foreground
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Live Tracking Active',
          notificationBody: 'Sharing your location with the customer.',
        },
      });

      // Also watch position for the local UI state
      subscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        async (newLocation) => {
          setLocation(newLocation);
        }
      );
    } catch (err) {
      console.error('[useTracking] Error starting tracking:', err);
      setErrorMsg('Failed to start location tracking');
    }
  };

  const stopTracking = async () => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }

    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    global.activeTrackingBookingId = null;
    setIsTracking(false);
  };

  useEffect(() => {
    if (active && bookingID) {
      startTracking().catch(console.error);
    } else {
      stopTracking().catch(console.error);
    }

    return () => {
      stopTracking().catch(console.error);
    };
  }, [active, bookingID]);

  return { location, errorMsg, isTracking, startTracking, stopTracking };
};