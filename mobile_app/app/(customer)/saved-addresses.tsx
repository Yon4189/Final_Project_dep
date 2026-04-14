// app/(customer)/saved-addresses.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { customerService } from '../services/customer.service';
import type { Location as UserLocation } from '../types/customer.types';

const MAX_ADDRESSES = 3;

export default function SavedAddresses() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserLocation | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    addressLine1: '',
    label: 'home' as 'home' | 'office' | 'other',
    customLabel: '',
    latitude: 0,
    longitude: 0,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await customerService.getLocations();
      if (response.success && response.data) {
        setAddresses(response.data);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      Alert.alert('Error', 'Failed to load saved addresses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAddresses();
  };


  const resetForm = () => {
    setFormData({
      addressLine1: '',
      label: 'home',
      customLabel: '',
      latitude: 0,
      longitude: 0,
    });
  };

  const handleAddAddress = () => {
    if (addresses.length >= MAX_ADDRESSES) {
      Alert.alert(
        'Address Limit Reached',
        `You can only save up to ${MAX_ADDRESSES} addresses. Please delete an existing address first.`
      );
      return;
    }
    resetForm();
    setShowAddModal(true);
  };

  const handleEditAddress = (address: UserLocation) => {
    setEditingAddress(address);
    setFormData({
      addressLine1: address.addressLine1 || '',
      label: (address.label as 'home' | 'office' | 'other') || 'home',
      customLabel: address.label === 'other' ? (address.addressLine1 || '') : '',
      latitude: address.latitude || 0,
      longitude: address.longitude || 0,
    });
    setShowEditModal(true);
  };

  const validateForm = () => {
    if (!formData.addressLine1.trim()) {
      Alert.alert('Error', 'Please enter an address');
      return false;
    }
    if (formData.label === 'other' && !formData.customLabel.trim()) {
      Alert.alert('Error', 'Please enter a custom label');
      return false;
    }
    return true;
  };

  const handleSaveAddress = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const addressData = {
        addressLine1: formData.addressLine1,
        city: '',
        state: '',
        postalCode: '',
        country: '',
        latitude: formData.latitude,
        longitude: formData.longitude,
        label: formData.label === 'other' ? formData.customLabel : formData.label,
        isPrimary: addresses.length === 0,
      };

      const response = await customerService.addLocation(addressData as any);
      
      if (response.success) {
        Alert.alert('Success', 'Address saved successfully');
        setShowAddModal(false);
        resetForm();
        fetchAddresses();
      } else {
        Alert.alert('Error', response.message || 'Failed to save address');
      }
    } catch (error: any) {
      console.error('Error saving address:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Saved Addresses</Text>
      <Text style={{ color: Colors.text.secondary }}>This feature is under development</Text>
    </View>
  );
}
