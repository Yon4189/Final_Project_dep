// app/(auth)/login.tsx
import { api } from "../services/api";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<"customer" | "provider">("customer");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    // Validation
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const endpoint = userType === "customer" ? "/customer/login" : "/provider/login";

      console.log(` Attempting ${userType} login at ${endpoint}`);
      console.log(` Email: ${formData.email}`);

      // Make the API request
      const response = await api.post<any>(endpoint, {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      console.log(' Login response received:', JSON.stringify(response, null, 2));

      // Check if login was successful
      if (response && response.success === true) {
        const responseData = response.data || {};
        const token = responseData.token;

        if (token) {
          console.log(' Token received, storing securely...');

          // Store tokens based on user type
          if (userType === 'provider') {
            await api.setProviderToken(token, responseData.refresh_token);
            console.log(' Provider token stored');
          } else {
            await api.setCustomerToken(token, responseData.refresh_token);
            console.log(' Customer token stored');
          }

          // Store user data
          const userData = {
            id: responseData.customerID || responseData.providerID,
            fullname: responseData.fullname,
            email: responseData.email,
            phone: responseData.phone,
            profilePicture: responseData.profilePicture,
            service_city: responseData.service_city,
            location: responseData.location,
            user_type: userType,
          };

          await api.setUserData(userData);
          console.log('👤 User data stored:', userData.email);

          // Navigate to appropriate dashboard
          if (userType === "provider") {
            console.log(' Navigating to provider dashboard');
            router.replace("/(provider)/dashboard");
          } else {
            console.log(' Navigating to customer dashboard');
            router.replace("/(customer)/dashboard");
          }
        } else {
          console.error(' No token in response');
          Alert.alert("Error", "Invalid server response: No token received");
        }
      } else {
        // Handle unsuccessful login
        const errorMessage = response?.message || "Login failed. Please try again.";
        console.error(' Login failed:', errorMessage);
        Alert.alert("Login Failed", errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Handle different error types
      let errorMessage = "Login failed. Please try again.";
      let errorTitle = "Login Error";

      if (error.response) {
        // The request was made and the server responded with a status code
        errorTitle = `Error ${error.response.status}`;

        // Check for specific pending approval case
        if (error.response.data?.message?.toLowerCase().includes('pending admin approval')) {
          errorTitle = "Account Pending Approval";
          errorMessage = "Your provider account is currently pending admin approval. You will be notified once your account is approved. Please check back later.";

          // Show a custom alert with additional options
          Alert.alert(
            "Account Pending Approval",
            "Your provider account is awaiting admin approval. You'll receive a notification once your account is approved.\n\nWould you like to contact support for more information?",
            [
              {
                text: "Contact Support",
                onPress: () => {
                  // You can implement contact support functionality here
                  // For example, open email, phone, or support chat
                  Linking.openURL('mailto:support@yourapp.com');
                }
              },
              {
                text: "OK",
                style: "default"
              }
            ]
          );
          setLoading(false);
          return;
        }

        // Try to get the error message from the response data
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          }
        } else {
          // Fallback messages based on status code
          switch (error.response.status) {
            case 400:
              errorMessage = "Invalid request. Please check your input.";
              break;
            case 401:
              errorMessage = "Invalid email or password. Please try again.";
              break;
            case 403:
              errorMessage = "Access forbidden. Please check your account status.";
              break;
            case 404:
              errorMessage = "Login service not found. Please ensure the server is running.";
              break;
            case 422:
              errorMessage = "Validation error. Please check your input.";
              break;
            case 500:
              errorMessage = "Server error. Please try again later.";
              break;
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = "No response from server. Please check your internet connection.";
        errorTitle = "Network Error";
      } else {
        // Something happened in setting up the request
        errorMessage = error.message || "An unexpected error occurred";
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Rest of your component remains the same...
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
      >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
      </View>

      <View style={styles.formContainer}>
        {/* User Type Selection */}
        <View style={styles.userTypeContainer}>
          <TouchableOpacity
            style={[
              styles.userTypeBtn,
              userType === "customer" && styles.userTypeBtnActive,
            ]}
            onPress={() => setUserType("customer")}
            disabled={loading}
          >
            <Ionicons
              name="person-outline"
              size={24}
              color={userType === "customer" ? "#FFFFFF" : Colors.primary}
            />
            <Text
              style={[
                styles.userTypeText,
                userType === "customer" && styles.userTypeTextActive,
              ]}
            >
              Customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.userTypeBtn,
              userType === "provider" && styles.userTypeBtnActive,
            ]}
            onPress={() => setUserType("provider")}
            disabled={loading}
          >
            <Ionicons
              name="construct-outline"
              size={24}
              color={userType === "provider" ? "#FFFFFF" : Colors.primary}
            />
            <Text
              style={[
                styles.userTypeText,
                userType === "provider" && styles.userTypeTextActive,
              ]}
            >
              Provider
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email Input */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputWithIcon}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
            <View style={{ flex: 1 }}>
              <AppInput
                label="Email"
                value={formData.email}
                onChangeText={(text: string) => setFormData({ ...formData, email: text })}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                required
              //  editable={!loading}
              />
            </View>
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputWithIcon}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
            <View style={{ flex: 1 }}>
              <AppInput
                label="Password"
                value={formData.password}
                onChangeText={(text: string) => setFormData({ ...formData, password: text })}
                placeholder="Enter your password"
                secureTextEntry
                showPasswordToggle={true}
                required
              //editable={!loading}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => router.push("/(auth)/forgot-password")}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <AppButton
          title={loading ? "Signing In..." : "Sign In"}
          onPress={handleLogin}
          loading={loading}
          fullWidth
          disabled={loading}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Authenticating...</Text>
          </View>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.registerTitle}>Don't have an account?</Text>

        <AppButton
          title="Register as Customer"
          onPress={() => router.push("/(auth)/register-customer")}
          variant="outline"
          fullWidth
          style={styles.registerButton}
          disabled={loading}
        />

        <AppButton
          title="Register as Service Provider"
          onPress={() => router.push("/(auth)/register-provider")}
          variant="outline"
          fullWidth
          style={styles.registerButton}
          disabled={loading}
        />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 5,
  },
  formContainer: {
    padding: 20,
    marginHorizontal: 15,
    backgroundColor: Colors.surface,
    borderRadius: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  userTypeContainer: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 5,
    marginBottom: 25,
  },
  userTypeBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  userTypeBtnActive: {
    backgroundColor: Colors.primary,
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.secondary,
  },
  userTypeTextActive: {
    color: "#FFFFFF",
  },
  inputWrapper: {
    marginBottom: 15,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 10,
    marginTop: 20,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: 15,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  registerTitle: {
    textAlign: "center",
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 15,
    fontWeight: "600",
  },
  registerButton: {
    marginBottom: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});