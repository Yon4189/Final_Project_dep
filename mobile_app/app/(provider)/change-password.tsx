// app/(provider)/change-password.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { api } from '../services/api';

export default function ChangePassword() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.current_password) {
      newErrors.current_password = 'Current password is required';
    }

    if (!formData.new_password) {
      newErrors.new_password = 'New password is required';
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/.test(formData.new_password)) {
      newErrors.new_password = 'Password must contain uppercase, lowercase and number';
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password';
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/provider/profile/password', {
        current_password: formData.current_password,
        new_password: formData.new_password,
        new_password_confirmation: formData.confirm_password,
      });

      if (response.success) {
        Alert.alert(
          'Success',
          'Your password has been changed successfully',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      
      let errorMessage = 'Failed to change password. Please try again.';
      
      if (error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        const errorList = [];
        for (let key in serverErrors) {
          errorList.push(serverErrors[key].join(', '));
        }
        errorMessage = errorList.join('\n');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return 0;
    
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25; // Special characters
    
    return Math.min(strength, 100);
  };

  const passwordStrength = getPasswordStrength(formData.new_password);
  
  const getStrengthColor = () => {
    if (passwordStrength < 50) return Colors.error;
    if (passwordStrength < 75) return Colors.warning;
    return Colors.success;
  };

  const getStrengthText = () => {
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Medium';
    if (passwordStrength < 100) return 'Strong';
    return 'Very Strong';
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
            <Text style={styles.infoText}>
              Choose a strong password that you don't use for other accounts
            </Text>
          </View>

          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.passwordContainer}>
              <AppInput
                value={formData.current_password}
                onChangeText={(text) => {
                  setFormData({ ...formData, current_password: text });
                  setErrors({ ...errors, current_password: '' });
                }}
                placeholder="Enter your current password"
                secureTextEntry={!showCurrentPassword}
                error={errors.current_password}
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.text.secondary} />}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons 
                  name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={Colors.text.secondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <AppInput
                value={formData.new_password}
                onChangeText={(text) => {
                  setFormData({ ...formData, new_password: text });
                  setErrors({ ...errors, new_password: '' });
                }}
                placeholder="Enter new password"
                secureTextEntry={!showNewPassword}
                error={errors.new_password}
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.text.secondary} />}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons 
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={Colors.text.secondary} 
                />
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {formData.new_password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarContainer}>
                  <View 
                    style={[
                      styles.strengthBar, 
                      { 
                        width: `${passwordStrength}%`,
                        backgroundColor: getStrengthColor()
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
                  {getStrengthText()}
                </Text>
              </View>
            )}

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Password must contain:</Text>
              <View style={styles.requirementItem}>
                <Ionicons 
                  name={formData.new_password.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={formData.new_password.length >= 8 ? Colors.success : Colors.text.secondary} 
                />
                <Text style={styles.requirementText}>At least 8 characters</Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons 
                  name={/[A-Z]/.test(formData.new_password) ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={/[A-Z]/.test(formData.new_password) ? Colors.success : Colors.text.secondary} 
                />
                <Text style={styles.requirementText}>At least one uppercase letter</Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons 
                  name={/[a-z]/.test(formData.new_password) ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={/[a-z]/.test(formData.new_password) ? Colors.success : Colors.text.secondary} 
                />
                <Text style={styles.requirementText}>At least one lowercase letter</Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons 
                  name={/[0-9]/.test(formData.new_password) ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={/[0-9]/.test(formData.new_password) ? Colors.success : Colors.text.secondary} 
                />
                <Text style={styles.requirementText}>At least one number</Text>
              </View>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.passwordContainer}>
              <AppInput
                value={formData.confirm_password}
                onChangeText={(text) => {
                  setFormData({ ...formData, confirm_password: text });
                  setErrors({ ...errors, confirm_password: '' });
                }}
                placeholder="Re-enter new password"
                secureTextEntry={!showConfirmPassword}
                error={errors.confirm_password}
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.text.secondary} />}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={Colors.text.secondary} 
                />
              </TouchableOpacity>
            </View>

            {/* Password Match Indicator */}
            {formData.confirm_password.length > 0 && (
              <View style={styles.matchContainer}>
                <Ionicons 
                  name={formData.new_password === formData.confirm_password ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={formData.new_password === formData.confirm_password ? Colors.success : Colors.error} 
                />
                <Text style={[
                  styles.matchText,
                  { color: formData.new_password === formData.confirm_password ? Colors.success : Colors.error }
                ]}>
                  {formData.new_password === formData.confirm_password ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <AppButton
              title="Change Password"
              onPress={handleChangePassword}
              loading={loading}
              disabled={loading}
              style={styles.changeButton}
            />
          </View>

          {/* Security Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Security Tips:</Text>
            <View style={styles.tipItem}>
              <Ionicons name="shield-outline" size={16} color={Colors.primary} />
              <Text style={styles.tipText}>Use a unique password for this account</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="shield-outline" size={16} color={Colors.primary} />
              <Text style={styles.tipText}>Don't share your password with anyone</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="shield-outline" size={16} color={Colors.primary} />
              <Text style={styles.tipText}>Change your password regularly</Text>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  content: {
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10,
    padding: 4,
  },
  strengthContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginRight: 8,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
    width: 70,
    textAlign: 'right',
    paddingLeft: 0,
  },
  requirementsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementText: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  matchText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  changeButton: {
    flex: 2,
  },
  tipsContainer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipText: {
    marginLeft: 10,
    fontSize: 13,
    color: Colors.text.secondary,
    flex: 1,
  },
});
