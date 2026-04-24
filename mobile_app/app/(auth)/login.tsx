// app/(auth)/login.tsx
import { api } from "../services/api";
import { useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
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
import { ThemeColors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { loginWithGoogleToken, loginWithGoogleTokenProvider, launchGoogleOAuth } from "../services/googleAuth.service";

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<"customer" | "provider">("customer");
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { accessToken, userInfo, error } = await launchGoogleOAuth();

      if (error === 'cancelled') return;
      if (error || !accessToken) {
        Alert.alert('Error', error || 'Google sign-in failed. Please try again.');
        return;
      }

      // Use access token as the token sent to backend
      const idToken = accessToken;

      if (userType === 'customer') {
        const loginRes = await loginWithGoogleToken(idToken);
        if (loginRes.success && loginRes.data) {
          await api.setCustomerToken(loginRes.data.token, undefined);
          await api.setUserData({
            id: loginRes.data.customerID,
            fullname: loginRes.data.fullname,
            email: loginRes.data.email,
            phone: loginRes.data.phone,
            profilePicture: loginRes.data.profilePicture,
            user_type: 'customer',
          });
          router.replace('/customer_dashboard');
        } else {
          Alert.alert('Error', loginRes.message || 'Google login failed');
        }
      } else {
        // Provider Google login
        const loginRes = await loginWithGoogleTokenProvider(idToken);
        if (loginRes.success && loginRes.data) {
          await api.setProviderToken(loginRes.data.token, undefined);
          await api.setUserData({
            id: loginRes.data.providerID,
            fullname: loginRes.data.fullname,
            email: loginRes.data.email,
            phone: loginRes.data.phone,
            profilePicture: loginRes.data.profilePicture,
            user_type: 'provider',
          });
          router.replace('/provider_dashboard');
        } else {
          Alert.alert('Error', loginRes.message || 'Google login failed for provider');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    // Validation
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert(t('common.error', 'Error'), t('login.validation.emailRequired', 'Email and password are required'));
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert(t('common.error', 'Error'), t('login.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert(t('common.error', 'Error'), t('login.passwordTooShort', 'Password must be at least 6 characters long'));
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

      console.log('Login response received:', JSON.stringify(response, null, 2));

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
            console.log('Customer token stored');
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
          console.log(' User data stored:', userData.email);

          if (userType === "provider") {
            console.log(' Navigating to provider dashboard');
            router.replace("/provider_dashboard");
          } else {
            console.log(' Navigating to customer dashboard');
            router.replace("/customer_dashboard");
          }
        } else {
          console.error(' No token in response');
          Alert.alert(t('common.error', 'Error'), t('login.serverError', 'Invalid server response: No token received'));
        }
      } else {
        // Handle unsuccessful login
        const errorMessage = response?.message || t('login.loginFailed', 'Login failed. Please try again.');
        console.error(' Login failed:', errorMessage);
        Alert.alert(t('login.loginFailed', 'Login Failed'), errorMessage);
      }
    } catch (error: any) {
      console.error(' Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Handle different error types
      let errorMessage = "Login failed. Please try again.";
      let errorTitle = "Login Error";

      if (error.response) {
        // The request was made and the server responded with a status code
        errorTitle = t('login.loginError', 'Login Error');

        // Check for specific pending approval case
        if (error.response.data?.message?.toLowerCase().includes('pending admin approval')) {
          errorTitle = t('login.pendingApproval', 'Account Pending Approval');
          errorMessage = t('login.pendingApprovalMessage', "Your provider account is currently pending admin approval. You will be notified once your account is approved. Please check back later.");

          // Show a custom alert with additional options
          Alert.alert(
            errorTitle,
            errorMessage + "\n\n" + t('login.contactSupportPrompt', "Would you like to contact support for more information?"),
            [
              {
                text: t('profile.contactSupport', "Contact Support"),
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
              errorMessage = t('login.serverError', "Invalid request. Please check your input.");
              break;
            case 401:
              errorMessage = t('login.invalidEmail', "Invalid email or password. Please try again.");
              break;
            case 403:
              errorMessage = t('login.serverError', "Access forbidden. Please check your account status.");
              break;
            case 404:
              errorMessage = t('login.serverError', "Login service not found. Please ensure the server is running.");
              break;
            case 422:
              errorMessage = t('login.serverError', "Validation error. Please check your input.");
              break;
            case 500:
              errorMessage = t('login.serverError', "Server error. Please try again later.");
              break;
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = t('login.noResponse', "No response from server. Please check your internet connection.");
        errorTitle = t('login.networkError', "Network Error");
      } else {
        // Something happened in setting up the request
        errorMessage = error.message || t('login.loginFailed', "An unexpected error occurred");
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.title}>{t('login.welcomeTitle')}</Text>
          <Text style={styles.subtitle}>{t('login.welcomeSubtitle')}</Text>
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
                color={userType === "customer" ? "#FFFFFF" : colors.primary}
              />
              <Text
                style={[
                  styles.userTypeText,
                  userType === "customer" && styles.userTypeTextActive,
                ]}
              >
                {t('landing.customerCardTitle')}
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
                color={userType === "provider" ? "#FFFFFF" : colors.primary}
              />
              <Text
                style={[
                  styles.userTypeText,
                  userType === "provider" && styles.userTypeTextActive,
                ]}
              >
                {t('landing.providerCardTitle')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputWithIcon}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('auth.email', 'Email')}
                  value={formData.email}
                  onChangeText={(text: string) => setFormData({ ...formData, email: text })}
                  placeholder={t('login.emailPlaceholder', "Enter your email")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  required
                />
              </View>
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputWithIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('auth.password', 'Password')}
                  value={formData.password}
                  onChangeText={(text: string) => setFormData({ ...formData, password: text })}
                  placeholder={t('login.passwordPlaceholder', "Enter your password")}
                  secureTextEntry
                  showPasswordToggle={true}
                  required
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push("/(auth)/forgot-password")}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>{t('login.forgotPassword')}</Text>
          </TouchableOpacity>

          <AppButton
            title={loading ? t('login.loggingIn') : t('login.loginButton')}
            onPress={handleLogin}
            loading={loading}
            fullWidth
            disabled={loading}
          />

          {/* Google Sign-In (both customer and provider) */}
          <TouchableOpacity
            style={[styles.googleButton, (loading || googleLoading) && { opacity: 0.6 }]}
            onPress={handleGoogleSignIn}
            disabled={loading || googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#DB4437" />
            ) : (
              <Ionicons name="logo-google" size={20} color="#DB4437" />
            )}
            <Text style={styles.googleButtonText}>
              {googleLoading ? t('login.signingIn', 'Signing in...') : t('login.continueWithGoogle', 'Continue with Google')}
            </Text>
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('login.authenticating', 'Authenticating...')}</Text>
            </View>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.or', 'OR')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.registerTitle}>{t('login.noAccount')}</Text>

          <AppButton
            title={t('landing.continueAsCustomer')}
            onPress={() => router.push("/(auth)/register-customer")}
            variant="outline"
            fullWidth
            style={styles.registerButton}
            disabled={loading}
          />

          <AppButton
            title={t('landing.continueAsProvider')}
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

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 100,
    paddingBottom: 40,
    backgroundColor: colors.surface,
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
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 5,
  },
  formContainer: {
    padding: 20,
    marginHorizontal: 15,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.primary,
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.secondary,
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
    color: colors.primary,
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
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: 15,
    color: colors.text.secondary,
    fontSize: 14,
  },
  registerTitle: {
    textAlign: "center",
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 15,
    fontWeight: "600",
  },
  registerButton: {
    marginBottom: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#DB4437',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    backgroundColor: colors.surface,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DB4437',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
