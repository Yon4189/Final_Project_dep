// app/(provider)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useProviderStore } from '@/app/store/providerStore';

export default function ProviderLayout() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Safely access store with default values
  let store;
  try {
    store = useProviderStore();
  } catch (error) {
    console.error('Provider store not available:', error);
  }

  const loadProfile = store?.loadProfile;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (loadProfile && typeof loadProfile === 'function' && isMounted) {
      loadProfile();
    }
  }, [loadProfile, isMounted]);

  // Always render the Stack navigator — never conditionally unmount it.
  // This prevents getRehydratedState errors in React Navigation.
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: Colors.background,
        },
        headerBackVisible: false,
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ) : null,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.replace('/(provider)/dashboard')}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="home-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        ),
      }}
    >
      {/* Main Dashboard */}
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown: false,
          headerRight: () => null,
        }}
      />

      {/* Notifications */}
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
        }}
      />

      {/* Profile */}
      <Stack.Screen
        name="profile"
        options={{
          title: 'My Profile',
        }}
      />

      {/* Requests */}
      <Stack.Screen
        name="requests/index"
        options={{
          title: 'Service Requests',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => { }} style={{ marginRight: 16 }}>
                <Ionicons name="filter-outline" size={22} color={Colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.replace('/(provider)/dashboard')}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="home-outline" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Stack.Screen
        name="requests/[id]"
        options={{
          headerShown: false,
        }}
      />

      {/* Earnings */}
      <Stack.Screen
        name="earnings/index"
        options={{
          title: 'Earnings',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => router.push('/(provider)/earnings/withdraw')}
                style={{ marginRight: 16 }}
              >
                <View
                  style={{
                    backgroundColor: Colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ color: Colors.surface, fontSize: 12, fontWeight: '600' }}>
                    Withdraw
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.replace('/(provider)/dashboard')}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="home-outline" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Stack.Screen
        name="earnings/withdraw"
        options={{
          title: 'Withdraw Funds',
        }}
      />

      {/* Reviews */}
      <Stack.Screen
        name="reviews/index"
        options={{
          title: 'Reviews & Ratings',
        }}
      />

      {/* Schedule */}
      <Stack.Screen
        name="schedule"
        options={{
          title: 'My Schedule',
        }}
      />

      {/* Disputes */}
      <Stack.Screen
        name="disputes/index"
        options={{
          title: 'Disputes',
        }}
      />

      <Stack.Screen
        name="disputes/new"
        options={{
          title: 'File a Dispute',
        }}
      />

      {/* Chat */}
      <Stack.Screen
        name="chat/index"
        options={{
          title: 'Messages',
        }}
      />

      <Stack.Screen
        name="chat/[id]"
        options={{
          title: 'Chat',
        }}
      />

    </Stack>
  );
}
