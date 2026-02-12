import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';

export default function AuthLayout() {
  const router = useRouter(); // ✅ FIX: create router instance

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.text.light,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    >
      {/* LOGIN */}
      <Stack.Screen
        name="login"
        options={{
          title: 'Sign In',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.replace('/')}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={Colors.text.light}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* REGISTER PROVIDER */}
      <Stack.Screen
        name="register-provider"
        options={{
          title: 'Provider Registration',
          headerStyle: {
            backgroundColor: Colors.secondary,
          },
        }}
      />

      {/* REGISTER CUSTOMER */}
      <Stack.Screen
        name="register-customer"
        options={{
          title: 'Customer Registration',
        }}
      />
    </Stack>
  );
}
