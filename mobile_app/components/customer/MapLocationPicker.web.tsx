import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Picker (Web)</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.placeholderContainer}>
        <Ionicons name="map-outline" size={80} color={Colors.text.secondary} />
        <Text style={styles.placeholderText}>
          Map view is not available on the web version.
        </Text>
        <Text style={styles.placeholderSubtext}>
          Please use a mobile device to use the map location picker.
        </Text>
        
        <TouchableOpacity 
          style={styles.mockButton}
          onPress={() => {
            onLocationSelect({
              latitude: 9.0320,
              longitude: 38.7469,
              address: 'Addis Ababa, Ethiopia (Web Mock)'
            });
            onClose();
          }}
        >
          <Text style={styles.mockButtonText}>Select Default Location (Addis Ababa)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.closeAction} onPress={onClose}>
        <Text style={styles.closeActionText}>Close</Text>
      </TouchableOpacity>
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
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 20,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 10,
    textAlign: 'center',
  },
  mockButton: {
    marginTop: 30,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  mockButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  closeAction: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  closeActionText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
