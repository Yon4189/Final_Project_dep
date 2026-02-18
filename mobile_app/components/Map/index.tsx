// mobile_app/components/Map/index.tsx

// Define what props the Map component accepts
interface MapProps {
  center?: [number, number];
  userLocation: { latitude: number; longitude: number } | null;
  providers: any[];
  onProviderSelect: (provider: any) => void;
    style?: any;
    markers?: Array<{
    position: [number, number];
    title: string;
    description?: string;
  }>;
}

// Export a placeholder component to satisfy TypeScript's type checking
const Map = (props: MapProps) => null;

export default Map;