import React from "react";
import MapView, { Marker } from "react-native-maps";
import { View, StyleSheet } from "react-native";

export default function Map() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 9.03,
          longitude: 38.74,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={{ latitude: 9.03, longitude: 38.74 }}
          title="Addis Ababa"
        />
      </MapView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});