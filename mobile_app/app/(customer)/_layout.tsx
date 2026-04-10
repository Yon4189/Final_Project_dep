// app/(customer)/_layout.tsx
import React, { useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUnreadNotificationsCount } from '@/hooks/useCustomerQueries';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '@/app/constants/Colors';

function NotificationBadge() {
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (unreadCount === 0) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/(customer)/notifications')}
        style={{ marginRight: 15 }}
      >
        <Ionicons name="notifications-outline" size={24} color={colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => router.push('/(customer)/notifications')}
      style={{ marginRight: 15, position: 'relative' }}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.primary} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CustomerLayout() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        headerTopInsetEnabled: true,
        statusBarTranslucent: false,
        contentStyle: { backgroundColor: colors.background },
        headerLeft: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16 }}>
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(customer)/dashboard');
                }
              }}
              style={{ marginRight: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace('/(customer)/dashboard')}
            >
              <Ionicons name="home-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ),
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <NotificationBadge />
          </View>
        ),
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown: false,
          headerRight: () => null,
          title: 'Dashboard',
        }}
      />

      <Stack.Screen
        name="profile"
        options={{
          title: 'My Profile',
          headerShown: true,
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
        name="locations"
        options={{
          title: 'Service City',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="bookings"
        options={{
          title: 'My Bookings',
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="bookings/[id]"
        options={{
          title: 'Booking Details',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="payment"
        options={{
          title: 'Payment',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="provider/[id]"
        options={{
          title: 'Provider Details',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="search/results"
        options={{
          title: 'Search Results',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="requests/index"
        options={{
          title: 'My Requests',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="requests/[id]"
        options={{
          title: 'Request Details',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="complaints/index"
        options={{
          title: 'My Complaints',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="complaints/new"
        options={{
          title: 'New Complaint',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="complaints/[id]"
        options={{
          title: 'Complaint Details',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="wallet/index"
        options={{
          title: 'My Wallet',
          headerShown: false,
        }}
      />

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

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
