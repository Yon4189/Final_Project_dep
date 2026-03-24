import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import AppInput from '../../components/AppInput';
import { API_BASE_URL } from '../config/api';
import { useRouter } from 'expo-router';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(''); // This will store the 60-char token automatically
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: New Password
  const [loading, setLoading] = useState(false);

  // STEP 1: Request Reset
  const handleRequestLink = async () => {
    if (!email) return Alert.alert("Error", "Please enter your email");
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/forgot-password`, { email });
      
      if (response.data.success) {
        Alert.alert(
          "Email Sent", 
          "We found your account. Please check your email for the verification code and enter it below."
        );
        setStep(2);
      } else {
        Alert.alert("Error", response.data.message || "Email not found");
      }
    } catch (error: any) {
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Update Password using the stored token
  const handleResetPassword = async () => {
    if (token.length !== 6) {
      return Alert.alert("Error", "Please enter the 6-digit verification code");
    }
    if (password.length < 8) {
      return Alert.alert("Error", "Password must be at least 8 characters");
    }
    if (password !== passwordConfirmation) {
      return Alert.alert("Error", "Passwords do not match");
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/reset-password`, {
        email: email,
        token: token, // This is the 60-char token we caught in Step 1
        password: password,
        password_confirmation: passwordConfirmation,
      });

      if (response.data.success) {
        Alert.alert("Success", "Your password has been changed!", [
          { text: "Login Now", onPress: () => router.replace('/(auth)/login') }
        ]);
      } else {
        Alert.alert("Error", response.data.message || "Invalid or expired session");
      }
    } catch (error: any) {
      Alert.alert("Error", "Reset failed. Please try again.");
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={styles.title}>{step === 1 ? "Forgot Password" : "Set New Password"}</Text>
      
      {step === 1 ? (
        <View style={styles.card}>
          <AppInput
            label="Email Address"
            placeholder="Enter your registered email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={handleRequestLink} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Email</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>6-Digit Verification Code</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter the code sent to your email" 
            value={token} 
            onChangeText={setToken} 
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
          />

          <AppInput
            label="New Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            showPasswordToggle={true}
          />
          
          <AppInput
            label="Confirm Password"
            placeholder="Repeat new password"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            showPasswordToggle={true}
          />

          <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Password</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
             <Text style={styles.backText}>Change Email</Text>
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 20, 
    justifyContent: 'center', 
    backgroundColor: '#F5F7FA',
    paddingBottom: 40,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 30, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 16, backgroundColor: '#FAFAFA' },
  button: { backgroundColor: '#0A84FF', padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backButton: { marginTop: 20, alignItems: 'center' },
  backText: { color: '#0A84FF', fontSize: 14, fontWeight: '500' }
});