// app/(provider)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProviderStore } from '@/app/store/providerStore';
import { useTheme } from '../context/ThemeContext';

export default function ProviderLayout() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { colors } = useTheme();

  // Use selector to avoid unnecessary re-renders on every store change
  const loadProfile = useProviderStore(state => state.loadProfile);

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
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerShadowVisible: false,
        headerTopInsetEnabled: true,
        statusBarTranslucent: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        headerBackVisible: false,
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ) : null,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.replace('/(provider)/dashboard')}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="home-outline" size={24} color={colors.primary} />
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
          headerShown: false,
        }}
      />

      {/* Profile */}
      <Stack.Screen
        name="profile"
        options={{
          title: 'My Profile',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="profile/edit"
        options={{
          title: 'Edit Profile',
        }}
      />

      <Stack.Screen
        name="profile/bank"
        options={{
          title: 'Bank Details',
        }}
      />

      {/* Requests */}
      <Stack.Screen
        name="requests/index"
        options={{
          title: 'Service Requests',
          headerShown: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => { }} style={{ marginRight: 16 }}>
                <Ionicons name="filter-outline" size={22} color={colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.replace('/(provider)/dashboard')}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="home-outline" size={24} color={colors.primary} />
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
          headerShown: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => router.push('/(provider)/earnings/withdraw')}
                style={{ marginRight: 16 }}
              >
                <View
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ color: colors.surface, fontSize: 12, fontWeight: '600' }}>
                    Withdraw
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.replace('/(provider)/dashboard')}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="home-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Stack.Screen
        name="earnings/withdraw"
        options={{
          title: 'Withdraw Funds',
          headerShown: false,
        }}
      />

      {/* Reviews */}
      <Stack.Screen
        name="reviews/index"
        options={{
          title: 'Reviews & Ratings',
          headerShown: false,
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
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="disputes/new"
        options={{
          title: 'File a Dispute',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="change-password"
        options={{
          title: 'Change Password',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="profile/services"
        options={{
          title: 'My Services',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="profile/documents"
        options={{
          title: 'Verification Documents',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="profile/certifications"
        options={{
          title: 'Certifications',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="profile/schedule"
        options={{
          title: 'My Schedule',
          headerShown: false,
        }}
      />

      {/* Chat */}
      <Stack.Screen
        name="chat/index"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="chat/[id]"
        options={{
          headerShown: false,
        }}
      />

    </Stack>
  );
}
