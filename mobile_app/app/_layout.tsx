// app/_layout.tsx
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useCurrencyStore } from './store/currencyStore';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import '../hooks/useTracking';
import { useNotifications } from '../hooks/useNotifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './i18n';
import LanguageToggleButton from '../components/LanguageToggleButton';

// Silence specific warnings globally
LogBox.ignoreLogs(['same key', 'Push notifications']);
LogBox.ignoreAllLogs(true); // Forcefully hide all warning notifications

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutContent() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        translucent={false}
        backgroundColor={colors.background}
      />
      <LanguageToggleButton />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(provider)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

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
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutContent />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
