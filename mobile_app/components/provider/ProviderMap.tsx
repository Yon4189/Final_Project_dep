// components/provider/ProviderMap.tsx
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '@/app/constants/Colors';
import Constants from 'expo-constants';
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface ProviderMapProps {
  providerLocation?: Location;
  customerLocation?: Location;
  showDirections?: boolean;
  onRouteCalculated?: (distance: number, duration: number) => void;
  onLocationSelect?: (location: Location) => void;
  interactive?: boolean;
  height?: number | string;
  showsUserLocation?: boolean;
  showsTraffic?: boolean;
}

export const ProviderMap: React.FC<ProviderMapProps> = ({
  providerLocation,
  customerLocation,
  showDirections = false,
  onRouteCalculated,
  onLocationSelect,
  interactive = true,
  height = 300,
  showsUserLocation = true,
  showsTraffic = false,
}) => {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (providerLocation || customerLocation) {
      fitMarkers();
    }
  }, [providerLocation, customerLocation]);

  useEffect(() => {
    if (showDirections && providerLocation && customerLocation) {
      calculateRoute();
    }
  }, [showDirections, providerLocation, customerLocation]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.warn('Failed to get user location:', error);
    }
  };

  const fitMarkers = () => {
    if (!mapRef.current) return;

    const coordinates = [];
    if (providerLocation) coordinates.push(providerLocation);
    if (customerLocation) coordinates.push(customerLocation);
    if (userLocation && showsUserLocation) coordinates.push(userLocation);

    if (coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        },
        animated: true,
      });
    }
  };

  const calculateRoute = async () => {
    if (!providerLocation || !customerLocation) return;

    try {
      // Using OSRM (Open Source Routing Machine) to get the real driving route
      const url = `http://router.project-osrm.org/route/v1/driving/${providerLocation.longitude},${providerLocation.latitude};${customerLocation.longitude},${customerLocation.latitude}?geometries=geojson&overview=full`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // OSRM returns coordinates as [longitude, latitude]
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0], // fix OSRM reversed coordinates
        }));

        setRouteCoordinates(coordinates);

        // OSRM provides distance in meters, convert to km
        const distance = Number((route.distance / 1000).toFixed(1));
        
        // OSRM provides duration in seconds, convert to minutes
        const duration = Math.round(route.duration / 60);

        setRouteInfo({ distance, duration });
        onRouteCalculated?.(distance, duration);
      } else {
        throw new Error('No valid route returned from OSRM');
      }
    } catch (error) {
      console.warn('Failed to calculate real route, falling back to mock straight line:', error);
      
      // Fallback
      setRouteCoordinates([providerLocation, customerLocation]);
      const distance = calculateDistance(
        providerLocation.latitude,
        providerLocation.longitude,
        customerLocation.latitude,
        customerLocation.longitude
      );
      const duration = Math.round(distance * 2);
      setRouteInfo({ distance, duration });
      onRouteCalculated?.(distance, duration);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Number((R * c).toFixed(1));
  };

  const handleMapPress = (event: any) => {
    if (!interactive || !onLocationSelect) return;

    const { coordinate } = event.nativeEvent;
    const newLocation = {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    };
    setSelectedLocation(newLocation);
    onLocationSelect(newLocation);
  };

  const handleMarkerPress = (type: 'provider' | 'customer' | 'user') => {
    // Handle marker press
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const getInitialRegion = (): Region => {
    if (providerLocation) {
      return {
        latitude: providerLocation.latitude,
        longitude: providerLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
    }
    if (customerLocation) {
      return {
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
    }
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
    }
    return {
      latitude: 9.0222, // Default to Addis Ababa
      longitude: 38.7468,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    };
  };

  const renderMarker = (
    location: Location | undefined,
    type: 'provider' | 'customer' | 'user',
    title?: string,
    description?: string
  ) => {
    if (!location) return null;

    const markerColors = {
      provider: Colors.primary,
      customer: Colors.warning,
      user: Colors.info,
    };

    const markerIcons = {
      provider: 'briefcase',
      customer: 'person',
      user: 'locate',
    };

    return (
      <Marker
        coordinate={location}
        title={title}
        description={description}
        onPress={() => handleMarkerPress(type)}
      >
        <View style={[styles.markerContainer, { backgroundColor: markerColors[type] }]}>
          <Ionicons name={markerIcons[type] as any} size={20} color={Colors.surface} />
        </View>
      </Marker>
    );
  };

  // Guard: In standalone production Android builds, mounting MapView without
  // a Google Maps API Key causes an immediate native crash.
  const googleMapsApiKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  if (!googleMapsApiKey && Platform.OS === 'android' && !__DEV__) {
    return (
      <View style={[styles.container, { height: height as any }, styles.fallbackContainer]}>
        <Ionicons name="map-outline" size={40} color={Colors.text.secondary} />
        <Text style={styles.fallbackText}>Map unavailable (Google Maps API Key not configured)</Text>
      </View>
    );
  }

  return (
   <View style={[styles.container, { height: height as any }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={getInitialRegion()}
        onPress={handleMapPress}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsCompass
        showsScale
        showsTraffic={showsTraffic}
        loadingEnabled
        loadingIndicatorColor={Colors.primary}
        loadingBackgroundColor={Colors.background}
      >
        {renderMarker(providerLocation, 'provider', 'Your Location', providerLocation?.address)}
        {renderMarker(customerLocation, 'customer', 'Customer Location', customerLocation?.address)}
        
        {showDirections && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={Colors.primary}
            strokeWidth={3}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={centerOnUser}>
          <Ionicons name="locate" size={22} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={fitMarkers}>
          <Ionicons name="expand" size={22} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => mapRef.current?.animateToRegion(getInitialRegion(), 500)}
        >
          <Ionicons name="home" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Route Info */}
      {routeInfo && showDirections && (
        <View style={styles.routeInfo}>
          <View style={styles.routeInfoItem}>
            <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
            <Text style={styles.routeInfoText}>{routeInfo.distance} km</Text>
          </View>
          <View style={styles.routeInfoDivider} />
          <View style={styles.routeInfoItem}>
            <Ionicons name="time-outline" size={16} color={Colors.primary} />
            <Text style={styles.routeInfoText}>~{routeInfo.duration} min</Text>
          </View>
        </View>
      )}

      {/* Selected Location Info */}
      {selectedLocation && interactive && (
        <TouchableOpacity 
          style={styles.selectedLocationInfo}
          onPress={() => setSelectedLocation(null)}
        >
          <Text style={styles.selectedLocationText}>
            Selected: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </Text>
          <Ionicons name="close-circle" size={16} color={Colors.text.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Specialized map components
interface DirectionsMapProps extends ProviderMapProps {
  onStartNavigation?: () => void;
}

export const DirectionsMap: React.FC<DirectionsMapProps> = ({
  onStartNavigation,
  ...props
}) => {
  return (
    <View style={styles.directionsContainer}>
      <ProviderMap {...props} showDirections height={400} />
      
      <View style={styles.directionsFooter}>
        <View style={styles.directionsAddress}>
          <Ionicons name="location" size={16} color={Colors.primary} />
          <Text style={styles.directionsAddressText} numberOfLines={1}>
            {props.customerLocation?.address || 'Customer location'}
          </Text>
        </View>

        <TouchableOpacity style={styles.startNavigationButton} onPress={onStartNavigation}>
          <Ionicons name="navigate" size={20} color={Colors.surface} />
          <Text style={styles.startNavigationText}>Start Navigation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface ServiceAreaMapProps {
  centerLocation: Location;
  radius: number; // in km
  onAreaChange?: (radius: number) => void;
}

export const ServiceAreaMap: React.FC<ServiceAreaMapProps> = ({
  centerLocation,
  radius,
  onAreaChange,
}) => {
  return (
    <View style={styles.serviceAreaContainer}>
      <ProviderMap
        providerLocation={centerLocation}
        interactive={false}
        height={300}
      />
      
      <View style={styles.serviceAreaOverlay}>
        <View style={[styles.serviceAreaCircle, {
          width: radius * 20, // Scale for display
          height: radius * 20,
          borderRadius: radius * 10,
        }]} />
      </View>

      <View style={styles.serviceAreaInfo}>
        <Text style={styles.serviceAreaLabel}>Service Radius</Text>
        <Text style={styles.serviceAreaValue}>{radius} km</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 16,
    position: 'relative',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  fallbackText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  controls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeInfoText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  routeInfoDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  selectedLocationInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedLocationText: {
    fontSize: 12,
    color: Colors.text.primary,
    flex: 1,
  },

  // Directions Map
  directionsContainer: {
    flex: 1,
  },
  directionsFooter: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  directionsAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  directionsAddressText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },
  startNavigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  startNavigationText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },

  // Service Area Map
  serviceAreaContainer: {
    position: 'relative',
  },
  serviceAreaOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceAreaCircle: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.primary + '20',
  },
  serviceAreaInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceAreaLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  serviceAreaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});