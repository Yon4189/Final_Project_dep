// app/(customer)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../constants/Colors';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CustomerLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown: false,
        }}
      />
      
      <Stack.Screen
        name="profile"
        options={{
          title: 'My Profile',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <Stack.Screen
        name="requests/index"
        options={{
          title: 'My Requests',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <Stack.Screen
        name="requests/[id]"
        options={{
          title: 'Request Details',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <Stack.Screen
        name="complaints/index"
        options={{
          title: 'My Complaints',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <Stack.Screen
        name="complaints/new"
        options={{
          title: 'New Complaint',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <Stack.Screen
        name="complaints/[id]"
        options={{
          title: 'Complaint Details',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <Stack.Screen
        name="wallet/index"
        options={{
          title: 'My Wallet',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/(customer)/wallet')} style={{ marginLeft: 16 }}>
              <Ionicons name="time-outline" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}