// app/_layout.tsx
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useCurrencyStore } from './store/currencyStore';
import { ThemeProvider } from './context/ThemeContext';
import '../hooks/useTracking';
import { useNotifications } from '../hooks/useNotifications';
import * as SplashScreen from 'expo-splash-screen';

import { LogBox } from 'react-native';

// Silence the Expo SDK 53 Android push notification warning in local development
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    // Fetch live ETB/USD exchange rate on app start
    useCurrencyStore.getState().fetchExchangeRate();

    // Hide splash screen after app mounts to prevent hanging on blank startup screen
    SplashScreen.hideAsync().catch(console.warn);
  }, []);

  // Initialize notifications
  useNotifications();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(customer)" options={{ headerShown: false }} />
          <Stack.Screen name="(provider)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </ThemeProvider>
  );
}