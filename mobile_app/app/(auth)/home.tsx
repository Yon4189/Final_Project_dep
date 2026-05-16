/*import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function HomeTab() {
  const router = useRouter();

  return (
    <View style={styles.container}>

      {/* Header with Back/Home button *}
      <View style={styles.header}>
         
        <TouchableOpacity
          onPress={() => router.replace('/index')}
          style={{ position: 'absolute', left: 20 }}
        >
        
        </TouchableOpacity>

        <Text style={styles.title}>Home Service Finder</Text>
        <Text style={styles.subtitle}>
          Find trusted home service professionals near you
        </Text>
      </View>

      {/* I PROVIDE SERVICE BUTTON *}
     <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 10  } }>
      <Ionicons name="construct-outline" size={80} color="#190ead" ></Ionicons></View> 
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#0A84FF', marginTop: 40 }]}
        onPress={() => router.push('(auth)/register-provider')}> 
        <Text style={styles.buttonText}>I Provide Service</Text>
      </TouchableOpacity>
<View style={{ alignItems: 'center', marginTop: 20, marginBottom: 50  } }>
  <Ionicons name="person-outline" size={80} color={Colors.primary} />
</View>
      {/* I NEED SERVICE BUTTON *}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#34C759' }]}
        onPress={() => router.push('/(auth)/register-customer')}
      >
        <Text style={styles.buttonText}>I Need Service</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 5,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },*/
