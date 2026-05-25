// hooks/useLocation.ts
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { storage } from '@/app/services/storage.service';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    formattedAddress?: string;
  };
}

interface UseLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  address: LocationData['address'] | null;
  refreshLocation: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [address, setAddress] = useState<LocationData['address'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);

  // Load cached location on mount
  useEffect(() => {
    loadCachedLocation();
    checkPermissions();
  }, []);

  const loadCachedLocation = async () => {
    try {
      const cached = await storage.getItem<LocationData>('last_location');
      if (cached) {
        console.log('Location - Loaded cached location:', cached);
        setLocation(cached);
        setAddress(cached.address || null);
      }
    } catch (error) {
      console.warn('Location - Failed to load cached location:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        getCurrentLocation();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.log('Location - Permission check failed:', error);
      setError('Failed to check location permissions');
      setLoading(false);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        await getCurrentLocation();
        return true;
      } else {
        setError('Location permission denied');
        return false;
      }
    } catch (error) {
      console.log('Location - Permission request failed:', error);
      setError('Failed to request location permissions');
      return false;
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Location - Getting current location...');
      
      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      console.log('Location - Got coordinates:', { latitude, longitude });

      // Get address from coordinates
      let addressData: LocationData['address'] = undefined;
      
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        
       // hooks/useLocation.ts - Fixed address data handling

if (geocode.length > 0) {
  const result = geocode[0];
  
  // Helper function to convert null to undefined
  const toUndefined = (value: string | null | undefined): string | undefined => {
    return value === null ? undefined : value;
  };

  addressData = {
    street: toUndefined(result.street || result.name),
    city: toUndefined(result.city || result.subregion),
    region: toUndefined(result.region),
    country: toUndefined(result.country),
    postalCode: toUndefined(result.postalCode),
    formattedAddress: Object.values(result)
      .filter((v): v is string => v !== null && typeof v === 'string')
      .join(', '),
  };
  
  console.log('Location - Got address:', addressData);
}
      } catch (geoError) {
        console.warn('Location - Reverse geocoding failed:', geoError);
        // Continue without address
      }

      const locationData: LocationData = {
        latitude,
        longitude,
        address: addressData,
      };

      // Cache location
      await storage.setItem('last_location', locationData);
      
      setLocation(locationData);
      setAddress(addressData || null);
    } catch (error: any) {
      console.log('Location - Failed to get location:', error);
      
      if (error.code === 'E_LOCATION_UNAVAILABLE') {
        setError('Location services are unavailable');
      } else if (error.code === 'E_LOCATION_TIMEOUT') {
        setError('Location request timed out');
      } else {
        setError(error.message || 'Failed to get location');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshLocation = async () => {
    if (permissionStatus === 'granted') {
      await getCurrentLocation();
    } else {
      await requestPermissions();
    }
  };

  return {
    location,
    loading,
    error,
    address,
    refreshLocation,
    requestPermissions,
  };
};