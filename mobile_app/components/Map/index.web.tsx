import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from 'leaflet';

// Fix for default marker icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface MapProps {
  center?: [number, number];
  zoom?: number;
  style?: React.CSSProperties;   // ✅ add this
  markers?: Array<{
    position: [number, number];
    title: string;
    description?: string;
  }>;
}


export default function Map({ 
  center = [9.03, 38.74], 
  zoom = 13, 
  markers = [], 
   style
}: MapProps) {
  return (
  <MapContainer
  center={center}
  zoom={zoom}
  style={style ?? { height: "100%", width: "100%", minHeight: "400px" }}
>

      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker, index) => (
        <Marker key={index} position={marker.position}>
          <Popup>
            <strong>{marker.title}</strong>
            {marker.description && <br />}
            {marker.description}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}