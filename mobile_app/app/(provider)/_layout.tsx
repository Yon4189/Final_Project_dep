// app/(provider)/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TouchableOpacity, View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useProviderStore } from '@/app/store/providerStore';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export default function ProviderLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { profile, isLoading, loadProfile } = useProviderStore();

  useEffect(() => {
    loadProfile();
  }, []);

  // Check if provider is verified for certain screens
  const isVerificationScreen = segments[segments.length - 1] === 'verification';
  const isProfileScreen = segments[segments.length - 1] === 'profile';

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Redirect to verification if profile not verified and not on verification/profile screens
  if (profile && !profile.verificationStatus && !isVerificationScreen && !isProfileScreen) {
    router.replace('/(provider)/verification');
  }

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
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          ) : null,
      }}
    >
      {/* Main Dashboard */}
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown: false,
        }}
      />

      {/* Requests Stack */}
      <Stack.Screen
        name="requests/index"
        options={{
          title: 'Service Requests',
          headerRight: () => (
            <TouchableOpacity onPress={() => {}} style={{ marginLeft: 16 }}>
              <Ionicons name="filter-outline" size={22} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <Stack.Screen
        name="requests/[id]"
        options={{
          title: 'Request Details',
        }}
      />

      {/* Earnings Stack */}
      <Stack.Screen
        name="earnings/index"
        options={{
          title: 'Earnings',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(provider)/earnings/withdraw')}
              style={{ marginLeft: 16 }}
            >
              <View style={{
                backgroundColor: Colors.primary,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
              }}>
                <Text style={{ color: Colors.surface, fontSize: 12, fontWeight: '600' }}>
                  Withdraw
                </Text>
              </View>
            </TouchableOpacity>
          ),
        }}
      />

      <Stack.Screen
        name="earnings/withdraw"
        options={{
          title: 'Withdraw Funds',
        }}
      />

      {/* Profile Stack */}
      <Stack.Screen
        name="profile"
        options={{
          title: 'My Profile',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(provider)/profile/edit')}
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="create-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <Stack.Screen
        name="profile/edit"
        options={{
          title: 'Edit Profile',
        }}
      />

      <Stack.Screen
        name="profile/services"
        options={{
          title: 'My Services',
        }}
      />

      <Stack.Screen
        name="profile/bank"
        options={{
          title: 'Bank Details',
        }}
      />

      <Stack.Screen
        name="profile/verification"
        options={{
          title: 'Verification',
        }}
      />

      {/* Reviews Stack */}
      <Stack.Screen
        name="reviews/index"
        options={{
          title: 'Reviews & Ratings',
        }}
      />

      {/* Disputes Stack */}
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

      <Stack.Screen
        name="disputes/[id]"
        options={{
          title: 'Dispute Details',
        }}
      />

      {/* Schedule Stack */}
      <Stack.Screen
        name="schedule/index"
        options={{
          title: 'My Schedule',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(provider)/schedule/settings')}
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="settings-outline" size={22} color={Colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <Stack.Screen
        name="schedule/settings"
        options={{
          title: 'Working Hours',
        }}
      />
    </Stack>
  );
}