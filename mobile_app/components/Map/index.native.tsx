// Map/index.native.tsx
import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Constants from 'expo-constants';

interface MapProps {
  center?: [number, number];
  userLocation?: { latitude: number; longitude: number } | null;
  providers?: any[];
  onProviderSelect?: (provider: any) => void;
  style?: any;
  markers?: Array<{
    position: [number, number];
    title: string;
    description?: string;
  }>;
}

export default function Map({ 
  center, 
  userLocation, 
  providers = [], 
  onProviderSelect = () => {}, 
  style,
  markers = []
}: MapProps) {
  const apiKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;

  // In standalone production Android builds, mounting MapView without a Google Maps API Key will crash the app.
  // We check for this condition and display a fallback placeholder instead.
  if (!apiKey && Platform.OS === 'android' && !__DEV__) {
    return (
      <View style={[styles.container, style, styles.fallbackContainer]}>
        <Text style={styles.fallbackText}>📍 Map is disabled (Google Maps API Key not configured)</Text>
      </View>
    );
  }

  const initialRegion = center ? {
    latitude: Number(center[0]) || 9.03,
    longitude: Number(center[1]) || 38.74,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: 9.03,
    longitude: 38.74,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: Number(userLocation.latitude) || 9.03,
              longitude: Number(userLocation.longitude) || 38.74
            }}
            title="Your Location"
            pinColor="blue"
          />
        )}
        
        {/* Provider markers */}
        {providers.map((provider, index) => (
          <Marker
            key={`provider-${index}`}
            coordinate={{
              latitude: Number(provider.latitude) || 0,
              longitude: Number(provider.longitude) || 0
            }}
            title={provider.name}
            onPress={() => onProviderSelect(provider)}
          />
        ))}

        {/* Custom markers */}
        {markers.map((marker, index) => (
          <Marker
            key={`marker-${index}`}
            coordinate={{
              latitude: Number(marker.position[0]) || 0,
              longitude: Number(marker.position[1]) || 0
            }}
            title={marker.title}
            description={marker.description}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
  },
  fallbackText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
  },
});