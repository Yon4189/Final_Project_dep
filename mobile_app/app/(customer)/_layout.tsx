// app/(customer)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '@/app/constants/Colors';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CustomerLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(customer)/dashboard');
              }
            }} 
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          headerShown: false,
          title: 'Dashboard'
        }} 
      />
      
      <Stack.Screen 
        name="profile" 
        options={{ 
          title: 'My Profile',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="change-password" 
        options={{ 
          title: 'Change Password',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="locations" 
        options={{ 
          title: 'Service City',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="notifications" 
        options={{ 
          title: 'Notifications',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="bookings" 
        options={{ 
          title: 'My Bookings',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="payment" 
        options={{ 
          title: 'Payment',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="payment-methods" 
        options={{ 
          title: 'Payment Methods',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="provider/[id]" 
        options={{ 
          title: 'Provider Details',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="provider/[id]/reviews" 
        options={{ 
          title: 'All Reviews',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="search/results" 
        options={{ 
          title: 'Search Results',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="requests/index" 
        options={{ 
          title: 'My Requests',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="requests/[id]" 
        options={{ 
          title: 'Request Details',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="complaints/index" 
        options={{ 
          title: 'My Complaints',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="complaints/new" 
        options={{ 
          title: 'New Complaint',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="complaints/[id]" 
        options={{ 
          title: 'Complaint Details',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="wallet/index" 
        options={{ 
          title: 'My Wallet',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="help" 
        options={{ 
          title: 'Help Center',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="support" 
        options={{ 
          title: 'Contact Support',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="terms" 
        options={{ 
          title: 'Terms & Conditions',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="privacy" 
        options={{ 
          title: 'Privacy Policy',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="chat/[id]" 
        options={{ 
          title: 'Chat',
          headerShown: true
        }} 
      />
    </Stack>
  );
}