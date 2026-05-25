import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import AppInput from '../../components/AppInput';
import { API_BASE_URL } from '../config/api';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../constants/Colors";

export default function ForgotPassword() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [email, setEmail] = useState('');
  const [token, setToken] = useState(''); // This will store the 6-digit code
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: New Password
  const [loading, setLoading] = useState(false);

  // STEP 1: Request Reset
  const handleRequestLink = async () => {
    if (!email) return Alert.alert(t("auth.error", "Error"), t("validation.enterEmail", "Please enter your email"));
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/forgot-password`, { email }, {
        headers: { 'ngrok-skip-browser-warning': '69420' }
      });
      
      if (response.data.success) {
        Alert.alert(
          t("auth.emailSent", "Email Sent"), 
          t("auth.checkEmailCode", "We found your account. Please check your email for the verification code and enter it below.")
        );
        setStep(2);
      } else {
        Alert.alert(t("auth.error", "Error"), response.data.message || t("auth.emailNotFound", "Email not found"));
      }
    } catch (error: any) {
      Alert.alert(t("auth.error", "Error"), t("auth.serverConnectionFailed", "Server connection failed."));
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Update Password using the entered code
  const handleResetPassword = async () => {
    if (token.length !== 6) {
      return Alert.alert(t("auth.error", "Error"), t("validation.enterCode", "Please enter the 6-digit verification code"));
    }
    if (password.length < 8) {
      return Alert.alert(t("auth.error", "Error"), t("validation.passwordLength", "Password must be at least 8 characters"));
    }
    if (password !== passwordConfirmation) {
      return Alert.alert(t("auth.error", "Error"), t("validation.passwordsDoNotMatch", "Passwords do not match"));
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/reset-password`, {
        email: email,
        token: token,
        password: password,
        password_confirmation: passwordConfirmation,
      }, {
        headers: { 'ngrok-skip-browser-warning': '69420' }
      });

      if (response.data.success) {
        Alert.alert(t("auth.success", "Success"), t("auth.passwordChanged", "Your password has been changed!"), [
          { text: t("auth.loginNow", "Login Now"), onPress: () => router.replace('/(auth)/login') }
        ]);
      } else {
        Alert.alert(t("auth.error", "Error"), response.data.message || t("auth.invalidSession", "Invalid or expired session"));
      }
    } catch (error: any) {
      Alert.alert(t("auth.error", "Error"), t("auth.resetFailed", "Reset failed. Please try again."));
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
        style={styles.outerContainer}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={styles.title}>{step === 1 ? t("auth.forgotPassword", "Forgot Password") : t("auth.setNewPassword", "Set New Password")}</Text>
      
      {step === 1 ? (
        <View style={styles.card}>
          <AppInput
            label={t("auth.emailAddress", "Email Address")}
            placeholder={t("auth.enterRegisteredEmail", "Enter your registered email")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={handleRequestLink} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("auth.verifyEmail", "Verify Email")}</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>{t("auth.verificationCode", "6-Digit Verification Code")}</Text>
          <TextInput 
            style={styles.input} 
            placeholder={t("auth.enterVerificationCode", "Enter the code sent to your email")} 
            value={token} 
            onChangeText={setToken} 
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
            placeholderTextColor={colors.text.secondary}
          />

          <AppInput
            label={t("auth.newPassword", "New Password")}
            placeholder={t("auth.atLeast8Chars", "At least 8 characters")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            showPasswordToggle={true}
          />
          
          <AppInput
            label={t("auth.confirmPassword", "Confirm Password")}
            placeholder={t("auth.repeatNewPassword", "Repeat new password")}
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            showPasswordToggle={true}
          />

          <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("auth.updatePassword", "Update Password")}</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
             <Text style={styles.backText}>{t("auth.changeEmail", "Change Email")}</Text>
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: colors.background },
  container: { 
    flexGrow: 1, 
    padding: 20, 
    justifyContent: 'center', 
    backgroundColor: colors.background,
    paddingBottom: 40,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text.primary, marginBottom: 30, textAlign: 'center' },
  card: { backgroundColor: colors.surface, padding: 20, borderRadius: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 16, backgroundColor: colors.background, color: colors.text.primary },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backButton: { marginTop: 20, alignItems: 'center' },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '500' }
});