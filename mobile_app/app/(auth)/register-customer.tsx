// app/(auth)/register-customer.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';

import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { Colors } from '../constants/Colors';
import { LOCATIONS } from '../constants/Services';
export default function RegisterCustomerScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const handleRegister = () => {
    // Validation
    const errors = [];
    if (!formData.fullName) errors.push('Full Name');
    if (!formData.email) errors.push('Email');
    if (!formData.phone) errors.push('Phone Number');
    if (!formData.location) errors.push('Location');
    if (!formData.password) errors.push('Password');
    
    if (errors.length > 0) {
      Alert.alert('Error', `Please fill all required fields: ${errors.join(', ')}`);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Registration successful!');
      router.push('/(auth)/login');
    }, 1500);
  };

  const renderModalItem = (item: string, onSelect: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onSelect}>
      <Text style={styles.modalItemText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customer Registration</Text>
        <Text style={styles.subtitle}>Find trusted service providers</Text>
      </View>

      <View style={styles.formContainer}>
        {/* Full Name */}
        <AppInput
          label="Full Name"
          value={formData.fullName}
          onChangeText={(text) => setFormData({ ...formData, fullName: text })}
          placeholder="Enter your full name"
          required
        />

        {/* Email */}
        <AppInput
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          placeholder="Enter your email"
          keyboardType="email-address"
          required
        />

        {/* Phone */}
        <AppInput
          label="Phone Number"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          required
        />

        {/* Location Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Location <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowLocationModal(true)}
          >
            <Text style={formData.location ? styles.dropdownText : styles.dropdownPlaceholder}>
              {formData.location || 'Select Location'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Password */}
        <AppInput
          label="Password"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          placeholder="Enter password"
          secureTextEntry
          required
        />

        {/* Confirm Password */}
        <AppInput
          label="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
          placeholder="Confirm password"
          secureTextEntry
          required
        />

        {/* Register Button */}
        <AppButton
          title="Register as Customer"
          onPress={handleRegister}
          loading={loading}
          fullWidth
          style={styles.registerButton}
        />

        {/* Provider Registration Link */}
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/(auth)/register-provider')}
        >
          <Text style={styles.linkText}>
            Register as Service Provider instead
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLinkText}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <FlatList
              data={LOCATIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderModalItem(item, () => {
                  setFormData({ ...formData, location: item });
                  setShowLocationModal(false);
                })
              }
              style={styles.modalList}
            />
            <AppButton
              title="Cancel"
              onPress={() => setShowLocationModal(false)}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 25,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 5,
  },
  formContainer: {
    padding: 20,
    margin: 15,
    backgroundColor: Colors.surface,
    borderRadius: 15,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  dropdown: {
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  registerButton: {
    marginTop: 20,
    marginBottom: 15,
  },
  linkButton: {
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  linkText: {
    color: Colors.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    color: Colors.text.secondary,
  },
  loginLinkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
});