// Map/index.native.tsx
import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { View, StyleSheet } from 'react-native';

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
  const initialRegion = center ? {
    latitude: center[0],
    longitude: center[1],
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
              latitude: userLocation.latitude,
              longitude: userLocation.longitude
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
              latitude: provider.latitude,
              longitude: provider.longitude
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
              latitude: marker.position[0],
              longitude: marker.position[1]
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
});