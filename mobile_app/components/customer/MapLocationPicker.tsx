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
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';

interface MapLocationPickerProps {
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  onLocationSelect: (location: { latitude: number; longitude: number; address: string; shouldSave?: boolean; customLabel?: string }) => void;
  onClose: () => void;
  existingLabels?: string[]; // For duplicate validation
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  initialLocation,
  onLocationSelect,
  onClose,
  existingLabels = [],
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
  
  // Save panel state
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [saveToggle, setSaveToggle] = useState(true); // Default ON
  const [customLabel, setCustomLabel] = useState('');
  const [labelError, setLabelError] = useState('');

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

    // Show save panel instead of immediately closing
    setShowSavePanel(true);
  };

  const handleContinue = () => {
    // Validate if saving
    if (saveToggle) {
      const trimmedLabel = customLabel.trim();
      
      if (!trimmedLabel) {
        setLabelError('Please enter a label for this location');
        return;
      }
      
      // Check for duplicate (case-insensitive)
      const isDuplicate = existingLabels.some(
        label => label.toLowerCase() === trimmedLabel.toLowerCase()
      );
      
      if (isDuplicate) {
        setLabelError('There is a location labeled with this exact name. Please change it.');
        return;
      }
    }

    // Pass data back with save info
    onLocationSelect({
      ...selectedLocation,
      address: address || 'Location pinned on map',
      shouldSave: saveToggle,
      customLabel: saveToggle ? customLabel.trim() : undefined,
    });
    onClose();
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

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
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
      {!showSavePanel && (
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
      )}

      {/* Save Panel */}
      {showSavePanel && (
        <View style={styles.savePanel}>
          <View style={styles.savePanelHeader}>
            <Text style={styles.savePanelTitle}>Save Location</Text>
            <TouchableOpacity onPress={() => setShowSavePanel(false)}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Confirmed Address */}
          <View style={styles.confirmedAddressContainer}>
            <View style={styles.confirmedAddressHeader}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={styles.confirmedAddressLabel}>Confirmed Location</Text>
            </View>
            <Text style={styles.confirmedAddressText}>{address || 'Location pinned on map'}</Text>
            <TouchableOpacity 
              style={styles.changeLocationButton}
              onPress={() => setShowSavePanel(false)}
            >
              <Text style={styles.changeLocationText}>Change Location</Text>
            </TouchableOpacity>
          </View>

          {/* Save Toggle */}
          <TouchableOpacity 
            style={styles.saveToggleContainer}
            onPress={() => {
              setSaveToggle(!saveToggle);
              setLabelError('');
            }}
          >
            <Ionicons 
              name={saveToggle ? 'checkbox' : 'square-outline'} 
              size={24} 
              color={Colors.primary} 
            />
            <Text style={styles.saveToggleText}>Save this location for future use?</Text>
          </TouchableOpacity>

          {/* Custom Label Input */}
          {saveToggle && (
            <View style={styles.labelInputContainer}>
              <Text style={styles.labelInputLabel}>Location Label</Text>
              <TextInput
                style={[styles.labelInput, labelError ? styles.labelInputError : null]}
                value={customLabel}
                onChangeText={(text) => {
                  setCustomLabel(text);
                  setLabelError('');
                }}
                placeholder="e.g., Mom's house, Gym, Office 2"
                placeholderTextColor={Colors.text.secondary}
                maxLength={50}
              />
              {labelError ? (
                <Text style={styles.labelErrorText}>{labelError}</Text>
              ) : null}
            </View>
          )}

          {/* Continue Button */}
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
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
  savePanel: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  savePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  savePanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  confirmedAddressContainer: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  confirmedAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmedAddressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  confirmedAddressText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  changeLocationButton: {
    alignSelf: 'flex-start',
  },
  changeLocationText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  saveToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  saveToggleText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  labelInputContainer: {
    marginBottom: 16,
  },
  labelInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  labelInput: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    color: Colors.text.primary,
  },
  labelInputError: {
    borderColor: Colors.error,
  },
  labelErrorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});
