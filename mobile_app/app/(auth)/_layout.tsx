// app/(auth)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';

export default function AuthLayout() {
  const router = useRouter();

  // Common back button handler for all screens
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // If can't go back, go to landing page
      router.replace('/');
    }
  };

  // Common back button component
  const BackButton = () => (
    <TouchableOpacity 
      onPress={handleBackPress}
      style={{ padding: 8 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Better touch area
    >
      <Ionicons
        name="arrow-back"
        size={24}
        color={Colors.surface}
      />
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.surface,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center', // Center the title
        contentStyle: {
          backgroundColor: Colors.background,
        },
        animation: 'slide_from_right',
        // Apply back button to all screens by default
        headerLeft: () => <BackButton />,
      }}
    >
      {/* LOGIN SCREEN */}
      <Stack.Screen
        name="login"
        options={{
          title: 'Sign In',
          headerShown: true,
          // Customize if needed, but inherits headerLeft from screenOptions
        }}
      />

      {/* PROVIDER REGISTRATION SCREEN */}
      <Stack.Screen
        name="register-provider"
        options={{
          title: 'Provider Registration',
          headerStyle: {
            backgroundColor: Colors.secondary, // Different color for provider
          },
          // Inherits headerLeft from screenOptions
        }}
      />

      {/* CUSTOMER REGISTRATION SCREEN */}
      <Stack.Screen
        name="register-customer"
        options={{
          title: 'Customer Registration',
          // Inherits headerLeft and headerStyle from screenOptions
        }}
      />

      {/* FORGOT PASSWORD SCREEN - Add this if you have it */}
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Forgot Password',
          // Inherits headerLeft from screenOptions
        }}
      />
    </Stack>
  );
}