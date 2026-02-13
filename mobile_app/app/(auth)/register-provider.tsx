// app/(auth)/register-provider.tsx
import * as ImagePicker from 'expo-image-picker';
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
import { API_BASE_URL } from '../config/api';

import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { Colors} from '../constants/Colors';
import { BANKS, LOCATIONS, SERVICE_CATEGORIES } from '../constants/Services';

export default function RegisterProvider() {
  const router = useRouter();

  // ---------- STATE ----------
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    bankName: '',
    accountNumber: '',
    location: '',
    serviceCategory: '',
    services: [] as string[],
    password: '',
    confirmPassword: '',
  });

  const [idCardImage, setIdCardImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // ---------- PICK IMAGE ----------
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 2],
      quality: 1,
    });

    if (!result.canceled) {
      setIdCardImage(result.assets[0].uri);
    }
  };

  // ---------- REGISTER PROVIDER ----------
  const registerProvider = async () => {
    const errors: string[] = [];

    if (!formData.fullName) errors.push('Full Name');
    if (!formData.email) errors.push('Email');
    if (!formData.phone) errors.push('Phone Number');
    if (!formData.bankName) errors.push('Bank Name');
    if (!formData.accountNumber) errors.push('Account Number');
    if (!formData.location) errors.push('Location');
    if (!formData.serviceCategory) errors.push('Service Category');
    if (formData.services.length === 0) errors.push('At least one Service');
    if (!formData.password) errors.push('Password');
    if (!idCardImage) errors.push('ID Card');

    if (errors.length > 0) {
      Alert.alert('Error', `Please fill all required fields:\n${errors.join(', ')}`);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.fullName);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('bankName', formData.bankName);
      data.append('accountNumber', formData.accountNumber);
      data.append('location', formData.location);
      data.append('serviceCategory', formData.serviceCategory);
      data.append('services', JSON.stringify(formData.services));
      data.append('password', formData.password);

      if (idCardImage) {
        const filename = idCardImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image`;
        data.append('idCard', {
          uri: idCardImage,
          name: filename,
          type,
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/register-provider`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: data,
      });

      const resJson = await response.json();

      if (response.ok) {
        Alert.alert('Success', resJson.message || 'Registered successfully');
        router.push('/(auth)/login');
      } else {
        Alert.alert('Error', resJson.message || 'Registration failed');
      }
    } catch (error) {
      console.log('API ERROR:', error);
      Alert.alert('Error', 'Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  // ---------- MODAL ITEM ----------
  const renderModalItem = (item: string, onSelect: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onSelect}>
      <Text style={styles.modalItemText}>{item}</Text>
    </TouchableOpacity>
  );

  // ---------- RENDER ----------
  return (
    <ScrollView style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <Text style={styles.title}>Service Provider Registration</Text>
        <Text style={styles.subtitle}>Join our network of professionals</Text>
      </View>

      {/* form */}
      <View style={styles.formContainer}>
        <AppInput
          label="Full Name"
          value={formData.fullName}
          onChangeText={(t) => setFormData({ ...formData, fullName: t })}
          placeholder="Enter your full name"
          required
        />
        <AppInput
          label="Email"
          value={formData.email}
          onChangeText={(t) => setFormData({ ...formData, email: t })}
          placeholder="Enter your email"
          keyboardType="email-address"
          required
        />
        <AppInput
          label="Phone Number"
          value={formData.phone}
          onChangeText={(t) => setFormData({ ...formData, phone: t })}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          required
        />

        {/* ID Card Upload */}
        <View style={styles.uploadContainer}>
          <Text style={styles.label}>
            ID Card Upload <Text>*</Text>
          </Text>
          <AppButton
            title={idCardImage ? 'Change Image' : 'Upload ID Card'}
            onPress={pickImage}
            variant="outline"
            fullWidth
          />
          {idCardImage && (
            <Text style={styles.imageUploadedText}>✓ Image uploaded successfully</Text>
          )}
        </View>

        {/* Add dropdowns for Bank, Location, Service Category here */}

        {/* Password */}
        <AppInput
          label="Password"
          value={formData.password}
          onChangeText={(t) => setFormData({ ...formData, password: t })}
          placeholder="Enter password"
          secureTextEntry
          required
        />
        <AppInput
          label="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(t) => setFormData({ ...formData, confirmPassword: t })}
          placeholder="Confirm password"
          secureTextEntry
          required
        />

        <AppButton
          title="Register as Provider"
          onPress={registerProvider}
          loading={loading}
          variant="secondary"
          fullWidth
          style={styles.registerButton}
        />
      </View>

      {/* Keep your modals for Location, Bank, Service Category */}
    </ScrollView>
  );
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 25, backgroundColor: Colors.surface, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary },
  subtitle: { fontSize: 14, color: Colors.text.secondary, marginTop: 5 },
  formContainer: { padding: 20, margin: 15, backgroundColor: Colors.surface, borderRadius: 15 },
  uploadContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '500', color: Colors.text.primary, marginBottom: 5 },
  imageUploadedText: { color: Colors.success, marginTop: 5 },
  registerButton: { marginTop: 20 },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalItemText: { fontSize: 16 },
});
