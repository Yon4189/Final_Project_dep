// hooks/useLocation.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, Platform, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface AddressData {
  latitude?: number;
  longitude?: number;
  street?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  name?: string;
  district?: string;
  formattedAddress: string;
}

export interface UserLocation extends LocationData {
  address?: AddressData;
  timestamp: number;
}

interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  timeInterval?: number;
  distanceInterval?: number;
  maxAge?: number;
  timeout?: number;
  showPermissionDeniedAlert?: boolean;
  autoUpdate?: boolean;
}

interface UseLocationReturn {
  location: UserLocation | null;
  address: AddressData | null;
  error: string | null;
  loading: boolean;
  permissionStatus: Location.PermissionStatus | null;
  getCurrentLocation: () => Promise<UserLocation | null>;
  startWatching: () => Promise<boolean>;
  stopWatching: () => void;
  searchAddress: (query: string) => Promise<AddressData[]>;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number, unit?: 'km' | 'miles') => number;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
  refreshIfStale: () => Promise<UserLocation | null>;
  isLocationStale: () => boolean;
  getLocationAge: () => number | null;
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    enableHighAccuracy = true,
    timeInterval = 5000,
    distanceInterval = 10,
    maxAge = 10000,
    showPermissionDeniedAlert = true,
    autoUpdate = false,
  } = options;

  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [address, setAddress] = useState<AddressData | null>(null);
  
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        if (showPermissionDeniedAlert) {
          Alert.alert(
            'Location Permission Required',
            'Please enable location services to find providers near you.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
        setError('Location permission denied');
        return false;
      }

      setError(null);
      return true;
    } catch (err) {
      setError('Failed to request location permission');
      return false;
    }
  }, [showPermissionDeniedAlert]);

  // Check permission
  const checkPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setPermissionStatus(status);
    return status === 'granted';
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async (): Promise<UserLocation | null> => {
    try {
      setLoading(true);
      setError(null);

      const hasPermission = await checkPermission();
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setLoading(false);
          return null;
        }
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: enableHighAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
      });

      const locationData: UserLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      };

      setLocation(locationData);
      lastUpdateRef.current = Date.now();

      // Get address for this location
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });

        if (addresses && addresses.length > 0) {
          const addr = addresses[0];
          const addressData: AddressData = {
            street: addr.street ?? addr.name ?? undefined,
            city: addr.city ?? undefined,
            region: addr.region ?? undefined,
            country: addr.country ?? undefined,
            postalCode: addr.postalCode ?? undefined,
            district: addr.district ?? undefined,
            formattedAddress: [
              addr.street || addr.name,
              addr.city,
              addr.region,
              addr.country,
            ].filter(Boolean).join(', '),
          };
          setAddress(addressData);
          locationData.address = addressData;
        }
      } catch (addrErr) {
        console.warn('Failed to get address:', addrErr);
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return locationData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enableHighAccuracy, checkPermission, requestPermission]);

  // Start watching location
  const startWatching = useCallback(async (): Promise<boolean> => {
    try {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) return false;
      }

      if (watchSubscription.current) {
        watchSubscription.current.remove();
      }

      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: enableHighAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
          timeInterval,
          distanceInterval,
        },
        (position) => {
          const locationData: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };
          setLocation(locationData);
          lastUpdateRef.current = Date.now();
        }
      );

      return true;
    } catch (err) {
      setError('Failed to start location watching');
      return false;
    }
  }, [enableHighAccuracy, timeInterval, distanceInterval, checkPermission, requestPermission]);

  // Stop watching location
  const stopWatching = useCallback(() => {
    if (watchSubscription.current) {
      watchSubscription.current.remove();
      watchSubscription.current = null;
    }
  }, []);

  // Search address
  const searchAddress = useCallback(async (query: string): Promise<AddressData[]> => {
    try {
      setLoading(true);
      const results = await Location.geocodeAsync(query);
      
      const addresses: AddressData[] = [];
      
      for (const result of results) {
        const addr = await Location.reverseGeocodeAsync({
          latitude: result.latitude,
          longitude: result.longitude,
        });

        if (addr && addr.length > 0) {
          const firstAddr = addr[0];
          
          // Create address data with proper typing
          const addressData: AddressData = {
            latitude: result.latitude,
            longitude: result.longitude,
            street: firstAddr.street || firstAddr.name || undefined,
            city: firstAddr.city || undefined,
            region: firstAddr.region || undefined,
            country: firstAddr.country || undefined,
            postalCode: firstAddr.postalCode || undefined,
            district: firstAddr.district || undefined,
            name: firstAddr.name || undefined,
            formattedAddress: [
              firstAddr.street || firstAddr.name,
              firstAddr.city,
              firstAddr.region,
              firstAddr.country
            ]
              .filter((item): item is string => !!item)
              .join(', '),
          };
          
          addresses.push(addressData);
        }
      }

      return addresses;
    } catch (err) {
      setError('Failed to search address');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = useCallback((
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    unit: 'km' | 'miles' = 'km'
  ): number => {
    const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Number((R * c).toFixed(2));
  }, []);

  // Get location age
  const getLocationAge = useCallback((): number | null => {
    if (!location?.timestamp) return null;
    return Date.now() - location.timestamp;
  }, [location]);

  // Check if location is stale
  const isLocationStale = useCallback((): boolean => {
    const age = getLocationAge();
    return age !== null && age > maxAge;
  }, [getLocationAge, maxAge]);

  // Refresh location if stale
  const refreshIfStale = useCallback(async (): Promise<UserLocation | null> => {
    if (isLocationStale()) {
      return getCurrentLocation();
    }
    return location;
  }, [isLocationStale, getCurrentLocation, location]);

  // Auto-update effect
  useEffect(() => {
    if (autoUpdate) {
      startWatching();
      return () => stopWatching();
    }
  }, [autoUpdate, startWatching, stopWatching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    location,
    address,
    error,
    loading,
    permissionStatus,
    getCurrentLocation,
    startWatching,
    stopWatching,
    searchAddress,
    calculateDistance,
    requestPermission,
    checkPermission,
    refreshIfStale,
    isLocationStale,
    getLocationAge,
  };
}

// Utility hook for getting address from coordinates
export function useReverseGeocode() {
  const [address, setAddress] = useState<AddressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAddress = useCallback(async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      setError(null);

      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const addressData: AddressData = {
          latitude,
          longitude,
          street: addr.street || addr.name || undefined,
          city: addr.city || undefined,
          region: addr.region || undefined,
          country: addr.country || undefined,
          postalCode: addr.postalCode || undefined,
          district: addr.district || undefined,
          formattedAddress: [
            addr.street || addr.name,
            addr.city,
            addr.region,
            addr.country,
          ].filter(Boolean).join(', '),
        };
        setAddress(addressData);
        return addressData;
      }
      return null;
    } catch (err) {
      setError('Failed to get address');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    address,
    loading,
    error,
    getAddress,
  };
}

// Utility hook for getting coordinates from address
export function useGeocode() {
  const [coordinates, setCoordinates] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCoordinates = useCallback(async (address: string) => {
    try {
      setLoading(true);
      setError(null);

      const results = await Location.geocodeAsync(address);

      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        const coords: LocationData = { latitude, longitude };
        setCoordinates(coords);
        return coords;
      }
      return null;
    } catch (err) {
      setError('Failed to get coordinates');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    coordinates,
    loading,
    error,
    getCoordinates,
  };
}