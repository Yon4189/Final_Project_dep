// components/customer/MapLocationPicker.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';

interface MapLocationPickerProps {
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  onClose: () => void;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  initialLocation,
  onLocationSelect,
  onClose,
}) => {
  const mapRef = useRef<MapView>(null);
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || {
      latitude: 9.0320, // Addis Ababa default
      longitude: 38.7469,
    }
  );
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setSelectedLocation(newLocation);
      
      // Animate map to current location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...newLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }

      // Get address for current location
      await reverseGeocode(newLocation.latitude, newLocation.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location');
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (result && result.length > 0) {
        const location = result[0];
        const addressParts = [
          location.street,
          location.district,
          location.city,
          location.region,
        ].filter(Boolean);
        
        const formattedAddress = addressParts.join(', ') || 'Selected location';
        setAddress(formattedAddress);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setAddress('Selected location');
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    await reverseGeocode(latitude, longitude);
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      Alert.alert('Error', 'Please select a location on the map');
      return;
    }

    onLocationSelect({
      ...selectedLocation,
      address: address || 'Location pinned on map',
    });
    onClose();
  };

  const centerOnLocation = () => {
    if (mapRef.current && selectedLocation) {
      mapRef.current.animateToRegion({
        ...selectedLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pin Your Location</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar (placeholder for future implementation) */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a location..."
          placeholderTextColor={Colors.text.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={false} // Disabled for now
        />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            ...selectedLocation,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {selectedLocation && (
            <Marker
              coordinate={selectedLocation}
              draggable
              onDragEnd={async (e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setSelectedLocation({ latitude, longitude });
                await reverseGeocode(latitude, longitude);
              }}
            >
              <View style={styles.markerContainer}>
                <Ionicons name="location" size={40} color={Colors.primary} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Center on location button */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={getCurrentLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="locate" size={24} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Address Display */}
      <View style={styles.addressContainer}>
        <View style={styles.addressHeader}>
          <Ionicons name="location-outline" size={20} color={Colors.primary} />
          <Text style={styles.addressTitle}>Selected Location</Text>
        </View>
        <Text style={styles.addressText}>
          {address || 'Tap on the map to select a location'}
        </Text>
        {selectedLocation && (
          <Text style={styles.coordinatesText}>
            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!selectedLocation}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text.primary,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: Colors.surface,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addressContainer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  coordinatesText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});
