import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';

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
  height = 300,
}) => {
  return (
    <View style={[styles.container, { height: height as any }]}>
      <View style={styles.placeholder}>
        <Ionicons name="map-outline" size={48} color={Colors.text.secondary} />
        <Text style={styles.text}>Map View (Not available on Web)</Text>
      </View>
    </View>
  );
};

export const DirectionsMap: React.FC<any> = ({ height = 400 }) => (
  <View style={{ height }}>
    <ProviderMap height={height} />
    <View style={styles.footer}>
      <Text style={styles.text}>Directions not available on Web</Text>
    </View>
  </View>
);

export const ServiceAreaMap: React.FC<any> = () => (
  <View style={{ height: 300 }}>
    <ProviderMap height={300} />
    <View style={styles.footer}>
      <Text style={styles.text}>Service Area not available on Web</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  placeholder: {
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  }
});
