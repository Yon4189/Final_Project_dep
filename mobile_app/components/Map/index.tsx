// components/Map/index.tsx
import { Platform } from 'react-native';

// Define the props interface to ensure type safety
interface MapProps {
  center?: [number, number];
  zoom?: number;
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

// Dynamically export the correct implementation based on platform
let Map: React.ComponentType<MapProps>;

if (Platform.OS === 'web') {
  // For web, use the web version
  Map = require('./index.web').default;
} else {
  // For native (iOS/Android), use the native version
  Map = require('./index.native').default;
}

export default Map;