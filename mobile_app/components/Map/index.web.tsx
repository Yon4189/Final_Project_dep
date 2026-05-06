import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';

export default function Map({ style }: any) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="map-outline" size={40} color={Colors.text.secondary} />
      <Text style={styles.text}>Map not available on web</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 10,
    color: Colors.text.secondary,
  }
});