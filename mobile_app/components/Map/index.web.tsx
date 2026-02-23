// Map/index.web.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/app/constants/Colors';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  style?: any;
  markers?: Array<{
    position: [number, number];
    title: string;
    description?: string;
  }>;
  userLocation?: any;
  providers?: any[];
  onProviderSelect?: (provider: any) => void;
}

export default function Map({
  center = [9.03, 38.74],
  zoom = 13,
  markers = [],
  style,
  userLocation,
  providers = [],
  onProviderSelect = () => { },
}: MapProps) {
  const [MapComponent, setMapComponent] = useState<any>(null);

  useEffect(() => {
    // Inject Leaflet CSS from CDN (avoids Metro local resource warnings)
    if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Dynamically import leaflet only on client side
    const loadMap = async () => {
      try {
        // @ts-ignore
        const L = await import('leaflet');
        // @ts-ignore
        const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');

        // Fix marker icons
        // delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        setMapComponent(() => (props: any) => (
          <MapContainer
            center={props.center}
            zoom={props.zoom}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {props.markers?.map((marker: any, index: number) => (
              <Marker key={index} position={marker.position}>
                <Popup>
                  <strong>{marker.title}</strong>
                  {marker.description && <br />}
                  {marker.description}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ));
      } catch (error) {
        console.error('Failed to load map:', error);
      }
    };

    loadMap();
  }, []);

  if (!MapComponent) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.placeholder}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.title}>Loading Map...</Text>
          <Text style={styles.centerText}>
            Center: {center[0].toFixed(4)}, {center[1].toFixed(4)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapComponent
        center={center}
        zoom={zoom}
        markers={markers}
        userLocation={userLocation}
        providers={providers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  centerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});