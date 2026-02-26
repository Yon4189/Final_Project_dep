import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────
const ID_PHOTO_TYPES = ['Passport', 'Driver License', 'National ID', 'Kebele ID'];

  // ─── Types ────────────────────────────────────────────────────────────────────
  interface ServiceCategory {
  catagoryID: string;
  name: string;
  description?: string;
  }

interface ServiceOffering {
  categoryId: string;
  categoryName: string;
  serviceName: string;
  basePrice: string;
  description: string;
  }

interface City {
  cityID?: string;
  id?: string;
  name: string;
  }

// ─── Component ────────────────────────────────────────────────────────────────
export default function RegisterProviderScreen() {
  const router = useRouter();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
    service_city: '',
    password: '',
    password_confirmation: '',
    idPhotoType: '',
  });

  // ── Image state ─────────────────────────────────────────────────────────────
  const [profilePicture, setProfilePicture] = useState<any>(null);
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
  const [idPhoto, setIdPhoto] = useState<any>(null);
  const [idPhotoUri, setIdPhotoUri] = useState<string | null>(null);

  // ── Categories & cities ─────────────────────────────────────────────────────
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // ── Service offerings ───────────────────────────────────────────────────────
  const [serviceOfferings, setServiceOfferings] = useState<ServiceOffering[]>([
    { categoryId: '', categoryName: '', serviceName: '', basePrice: '', description: '' },
  ]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [showServiceCategoryModal, setShowServiceCategoryModal] = useState<number | null>(null);

  // ── Fetch data on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchCities();
    fetchServiceCategories();
  }, []);

  const fetchCities = async () => {
    setLoadingCities(true);
    try {
      const response = await api.get<any>('/cities');
      // Handle different response structures
      if (response.data && Array.isArray(response.data)) {
        setCities(response.data);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setCities(response.data.data);
      } else if (response.data && response.data.cities && Array.isArray(response.data.cities)) {
        setCities(response.data.cities);
      } else {
        console.log('Unexpected cities response format:', response);
        setCities([]);
      }
    } catch (err) {
      console.log('Error fetching cities:', err);
      Alert.alert('Warning', 'Could not load cities. Please try again later.');
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchServiceCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await api.get<any>('/categories');
      // Handle different response structures
      if (response.data && Array.isArray(response.data)) {
        setServiceCategories(response.data);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setServiceCategories(response.data.data);
      } else if (response.data && response.data.categories && Array.isArray(response.data.categories)) {
        setServiceCategories(response.data.categories);
      } else {
        console.log('Unexpected categories response format:', response);
        setServiceCategories([]);
      }
    } catch (err) {
      console.log('Error fetching categories:', err);
      Alert.alert('Warning', 'Could not load service categories. Please try again later.');
    } finally {
      setLoadingCategories(false);
    }
  };

  // ── Image picker ─────────────────────────────────────────────────────────────
  const pickImage = async (type: 'profile' | 'id') => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [3, 2],
        quality: 0.5,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Update preview URI
        if (type === 'profile') {
          setProfilePictureUri(asset.uri);
        } else {
          setIdPhotoUri(asset.uri);
        }

        // Build file object for FormData (works on both mobile and web)
        const filename = asset.uri.split('/').pop() || (type === 'profile' ? 'profile.jpg' : 'id.jpg');
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

        const fileObject = {
          uri: asset.uri,
          name: filename,
          type: mimeType,
        };

        if (type === 'profile') {
          setProfilePicture(fileObject);
        } else {
          setIdPhoto(fileObject);
        }
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // ── Service offering helpers ─────────────────────────────────────────────────
  const addServiceOffering = () => {
    setServiceOfferings([
      ...serviceOfferings,
      { categoryId: '', categoryName: '', serviceName: '', basePrice: '', description: '' },
    ]);
  };

  
  // Add this temporary test function
const testApiConnection = async () => {
  try {
    console.log('Testing API connection...');
    const response = await api.get('/test'); // or any simple endpoint
    console.log('API test response:', response);
    Alert.alert('API Test', 'Connection successful!');
  } catch (error) {
    console.log('API test error:', error);
    Alert.alert('API Test', 'Connection failed!');
  }
};

// Add a test button temporarily in your render (near the register button)
<AppButton
  title="Test API"
  onPress={testApiConnection}
  fullWidth
  style={{ marginTop: 10, backgroundColor: 'orange' }}
/>

  const removeServiceOffering = (index: number) => {
    if (serviceOfferings.length > 1) {
      const updated = [...serviceOfferings];
      updated.splice(index, 1);
      setServiceOfferings(updated);
    } else {
      Alert.alert('Info', 'You need at least one service offering.');
    }
  };

  const updateServiceOffering = (
    index: number,
    field: keyof ServiceOffering,
    value: string
  ) => {
    const updated = [...serviceOfferings];
    updated[index] = { ...updated[index], [field]: value };
    setServiceOfferings(updated);
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validatePhone = (phone: string) => /^(09|07)[0-9]{8}$/.test(phone);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateServiceOfferings = (): boolean => {
    for (let i = 0; i < serviceOfferings.length; i++) {
      const o = serviceOfferings[i];
      if (!o.categoryId) {
        Alert.alert('Validation Error', `Service #${i + 1}: Please select a category.`);
        return false;
      }
      if (!o.serviceName.trim()) {
        Alert.alert('Validation Error', `Service #${i + 1}: Please enter a service name.`);
        return false;
      }
      if (!o.basePrice.trim()) {
        Alert.alert('Validation Error', `Service #${i + 1}: Please enter a base price.`);
        return false;
      }
      const price = Number(o.basePrice);
      if (isNaN(price) || price <= 0) {
        Alert.alert('Validation Error', `Service #${i + 1}: Please enter a valid positive number for base price.`);
        return false;
      }
    }
    return true;
  };

  // ── Registration ─────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    console.log('=== REGISTRATION BUTTON CLICKED ===');
    console.log('Form data:', formData);
    console.log('Service offerings:', serviceOfferings);
    console.log('Has profile picture:', !!profilePicture);
    console.log('Has ID photo:', !!idPhoto);

    // Basic field validation
    if (!formData.fullname.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address.');
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (!formData.phone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number.');
      return;
    }

    if (!validatePhone(formData.phone)) {
      Alert.alert('Validation Error', 'Phone number must start with 09 or 07 and be 10 digits.');
      return;
    }

    if (!formData.service_city) {
      Alert.alert('Validation Error', 'Please select your service city.');
      return;
    }

    if (!formData.idPhotoType) {
      Alert.alert('Validation Error', 'Please select your ID document type.');
      return;
    }

    if (!formData.password) {
      Alert.alert('Validation Error', 'Please enter a password.');
      return;
    }

    if (formData.password.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters.');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    if (!idPhoto) {
      Alert.alert('Validation Error', 'Please upload your ID card photo.');
      return;
    }

    if (!validateServiceOfferings()) return;

    // Build FormData
    setLoading(true);

    try {
      const data = new FormData();

      // Append text fields
      data.append('fullname', formData.fullname.trim());
      data.append('email', formData.email.trim().toLowerCase());
      data.append('phone', formData.phone.trim());
      data.append('service_city', formData.service_city);
      data.append('idPhotoType', formData.idPhotoType);
      data.append('password', formData.password);
      data.append('password_confirmation', formData.password_confirmation);

      // Services as JSON string
      const servicesJson = JSON.stringify(
        serviceOfferings.map((s) => ({
          categoryId: s.categoryId,
          serviceName: s.serviceName.trim(),
          basePrice: parseFloat(s.basePrice),
          description: s.description.trim() || '',
        }))
      );
      data.append('services', servicesJson);

      // Append images with proper structure for React Native
      if (profilePicture) {
        data.append('profilePicture', profilePicture as any);
      }

      if (idPhoto) {
        data.append('idPhoto', idPhoto as any);
      }

      // Log what we're sending (for debugging)
      console.log('Sending registration request...');
      console.log('Form fields:', {
        fullname: formData.fullname,
        email: formData.email,
        phone: formData.phone,
        service_city: formData.service_city,
        idPhotoType: formData.idPhotoType,
        servicesCount: serviceOfferings.length,
        hasProfilePicture: !!profilePicture,
        hasIdPhoto: !!idPhoto,
      });

      const response = await api.post('/provider/register', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        timeout: 60000, // 60 seconds timeout for file uploads
      });

      console.log('Registration response:', response);

      // Handle different response structures
      if (response.data && response.data.success) {
        setRegistrationSuccess(true);
        Alert.alert(
          'Success!',
          'Your registration has been submitted successfully. You will be notified once your account is verified.'
        );
      } else if (response.data && response.data.message) {
        // Server returned a message but no success flag
        if (response.data.message.includes('success') || response.data.message.includes('submitted')) {
          setRegistrationSuccess(true);
        } else {
          Alert.alert('Registration Status', response.data.message);
        }
      } else {
        // Assume success if we got a 2xx response
        setRegistrationSuccess(true);
        Alert.alert(
          'Success!',
          'Your registration has been submitted successfully. You will be notified once your account is verified.'
        );
      }
    } catch (err: any) {
      console.log('Registration error:', err);
      
      // Handle different types of errors
      let errorMessage = 'Failed to register. Please try again.';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        console.log('Error response data:', err.response.data);
        console.log('Error response status:', err.response.status);
        
        if (err.response.status === 422) {
          // Validation errors
          if (err.response.data && err.response.data.errors) {
            const errors = err.response.data.errors;
            const errorList = Object.values(errors).flat().join('\n');
            errorMessage = `Validation failed:\n${errorList}`;
          } else if (err.response.data && err.response.data.message) {
            errorMessage = err.response.data.message;
          } else {
            errorMessage = 'Please check your input and try again.';
          }
        } else if (err.response.status === 413) {
          errorMessage = 'Images are too large. Please compress your images and try again.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = `Server error (${err.response.status}). Please try again.`;
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.log('No response received');
        errorMessage = 'No response from server. Please check your internet connection.';
      } else if (err.message) {
        // Something happened in setting up the request
        if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ────────────────────────────────────────────────────────────
  if (registrationSuccess) {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={80} color={Colors.success || '#4CAF50'} />
        <Text style={styles.successTitle}>Registration Submitted!</Text>
        <Text style={styles.successSubtitle}>
          Your application is under review. We'll notify you once your account is verified.
        </Text>
        <AppButton
          title="Go to Login"
          onPress={() => router.replace('/(auth)/login')}
          fullWidth
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const renderModalItem = (label: string, onSelect: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onSelect}>
      <Text style={styles.modalItemText}>{label}</Text>
    </TouchableOpacity>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        style={styles.container} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Service Provider Registration</Text>
          <Text style={styles.subtitle}>Join our network of professionals</Text>
        </View>

        <View style={styles.formContainer}>

          {/* ── Profile Picture ── */}
          <View style={styles.uploadContainer}>
            <Text style={styles.label}>
              Profile Picture <Text style={styles.optional}>(Optional)</Text>
            </Text>
            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('profile')}>
              {profilePictureUri ? (
                <Image source={{ uri: profilePictureUri }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera" size={36} color={Colors.text?.secondary || '#666'} />
                  <Text style={styles.imagePlaceholderText}>Tap to upload</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Full Name ── */}
          <AppInput
            label="Full Name"
            value={formData.fullname}
            onChangeText={(t: string) => setFormData({ ...formData, fullname: t })}
            placeholder="Enter your full name"
            required
          />

          {/* ── Email ── */}
          <AppInput
            label="Email"
            value={formData.email}
            onChangeText={(t: string) => setFormData({ ...formData, email: t })}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            required
          />

          {/* ── Phone ── */}
          <AppInput
            label="Phone Number"
            value={formData.phone}
            onChangeText={(t: string) => setFormData({ ...formData, phone: t })}
            placeholder="09XXXXXXXX or 07XXXXXXXX"
            keyboardType="phone-pad"
            maxLength={10}
            required
          />

          {/* ── Service City ── */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Service City <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={styles.dropdown} 
              onPress={() => setShowCityModal(true)}
              disabled={loadingCities}
            >
              <Text style={formData.service_city ? styles.dropdownText : styles.dropdownPlaceholder}>
                {formData.service_city || (loadingCities ? 'Loading cities...' : 'Select City')}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* ── Services Offered ── */}
          <View style={styles.servicesSection}>
            <Text style={styles.sectionTitle}>
              Services You Offer <Text style={styles.required}>*</Text>
            </Text>

            {serviceOfferings.map((offering, index) => (
              <View key={index} style={styles.serviceCard}>
                {/* Card header */}
                <View style={styles.serviceCardHeader}>
                  <Text style={styles.serviceCardTitle}>Service #{index + 1}</Text>
                  {serviceOfferings.length > 1 && (
                    <TouchableOpacity onPress={() => removeServiceOffering(index)}>
                      <Ionicons name="close-circle" size={24} color={Colors.error || '#f44336'} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Category selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Category <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowServiceCategoryModal(index)}
                    disabled={loadingCategories}
                  >
                    <Text
                      style={offering.categoryId ? styles.dropdownText : styles.dropdownPlaceholder}
                    >
                      {offering.categoryName || (loadingCategories ? 'Loading categories...' : 'Select Category')}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                </View>

                <AppInput
                  label="Service Name"
                  value={offering.serviceName}
                  onChangeText={(t: string) => updateServiceOffering(index, 'serviceName', t)}
                  placeholder="e.g., Pipe Leak Repair"
                  required
                />

                <AppInput
                  label="Base Price (ETB)"
                  value={offering.basePrice}
                  onChangeText={(t: string) => updateServiceOffering(index, 'basePrice', t)}
                  placeholder="e.g., 500"
                  keyboardType="numeric"
                  required
                />

                <AppInput
                  label="Description (optional)"
                  value={offering.description}
                  onChangeText={(t: string) => updateServiceOffering(index, 'description', t)}
                  placeholder="Briefly describe this service..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            ))}

            {/* Add service button */}
            <TouchableOpacity style={styles.addServiceButton} onPress={addServiceOffering}>
              <Ionicons name="add-circle-outline" size={24} color={Colors.primary || '#007AFF'} />
              <Text style={styles.addServiceText}>Add Another Service</Text>
            </TouchableOpacity>
          </View>

          {/* ── ID Photo Type ── */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              ID Document Type <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowIdTypeModal(true)}>
              <Text style={formData.idPhotoType ? styles.dropdownText : styles.dropdownPlaceholder}>
                {formData.idPhotoType || 'Select ID Type'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* ── ID Card Upload ── */}
          <View style={styles.uploadContainer}>
            <Text style={styles.label}>
              ID Card Photo <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity style={styles.idImagePicker} onPress={() => pickImage('id')}>
              {idPhotoUri ? (
                <Image source={{ uri: idPhotoUri }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="id-card" size={36} color={Colors.text?.secondary || '#666'} />
                  <Text style={styles.imagePlaceholderText}>Tap to upload ID card</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Password ── */}
          <AppInput
            label="Password"
            value={formData.password}
            onChangeText={(t: string) => setFormData({ ...formData, password: t })}
            placeholder="Minimum 8 characters"
            secureTextEntry
            required
          />

          {/* ── Confirm Password ── */}
          <AppInput
            label="Confirm Password"
            value={formData.password_confirmation}
            onChangeText={(t: string) => setFormData({ ...formData, password_confirmation: t })}
            placeholder="Repeat your password"
            secureTextEntry
            required
          />

          {/* ── Register Button ── */}
          <AppButton
            title={loading ? "Registering..." : "Register as Provider"}
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            fullWidth
            style={styles.registerButton}
          />

          {/* ── Login link ── */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/(auth)/login')}
            disabled={loading}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkText}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* ──────────────── MODALS ──────────────── */}

        {/* City Modal */}
        <Modal
          visible={showCityModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCityModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select City</Text>
              {loadingCities ? (
                <ActivityIndicator size="large" color={Colors.primary || '#007AFF'} style={styles.modalLoader} />
              ) : (
                <FlatList
                  data={cities}
                  keyExtractor={(item, index) => 
                    item.cityID?.toString() || item.id?.toString() || item.name || index.toString()
                  }
                  renderItem={({ item }) =>
                    renderModalItem(item.name, () => {
                      setFormData({ ...formData, service_city: item.name });
                      setShowCityModal(false);
                    })
                  }
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No cities available</Text>
                  }
                  style={styles.modalList}
                />
              )}
              <AppButton
                title="Cancel"
                onPress={() => setShowCityModal(false)}
                variant="outline"
                fullWidth
              />
            </View>
          </View>
        </Modal>

        {/* ID Type Modal */}
        <Modal
          visible={showIdTypeModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowIdTypeModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select ID Type</Text>
              <FlatList
                data={ID_PHOTO_TYPES}
                keyExtractor={(item) => item}
                renderItem={({ item }) =>
                  renderModalItem(item, () => {
                    setFormData({ ...formData, idPhotoType: item });
                    setShowIdTypeModal(false);
                  })
                }
                style={styles.modalList}
              />
              <AppButton
                title="Cancel"
                onPress={() => setShowIdTypeModal(false)}
                variant="outline"
                fullWidth
              />
            </View>
          </View>
        </Modal>

        {/* Service Category Modal */}
        <Modal
          visible={showServiceCategoryModal !== null}
          animationType="slide"
          transparent
          onRequestClose={() => setShowServiceCategoryModal(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Category</Text>
              {loadingCategories ? (
                <ActivityIndicator size="large" color={Colors.primary || '#007AFF'} style={styles.modalLoader} />
              ) : (
                <FlatList
                  data={serviceCategories}
                  keyExtractor={(item) => item.catagoryID?.toString() || Math.random().toString()}
                  renderItem={({ item }) =>
                    renderModalItem(item.name, () => {
                      if (showServiceCategoryModal !== null) {
                        updateServiceOffering(showServiceCategoryModal, 'categoryId', item.catagoryID);
                        updateServiceOffering(showServiceCategoryModal, 'categoryName', item.name);
                      }
                      setShowServiceCategoryModal(null);
                    })
                  }
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No categories available</Text>
                  }
                  style={styles.modalList}
                />
              )}
              <AppButton
                title="Cancel"
                onPress={() => setShowServiceCategoryModal(null)}
                variant="outline"
                fullWidth
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background || '#f5f5f5',
  },
  header: {
    padding: 25,
    backgroundColor: Colors.surface || '#ffffff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border || '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text?.primary || '#333333',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text?.secondary || '#666666',
    marginTop: 5,
  },
  formContainer: {
    padding: 20,
    margin: 15,
    backgroundColor: Colors.surface || '#ffffff',
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text?.primary || '#333333',
    marginBottom: 8,
  },
  required: {
    color: Colors.error || '#f44336',
  },
  optional: {
    color: Colors.text?.secondary || '#666666',
    fontSize: 12,
    fontWeight: 'normal',
  },
  dropdown: {
    backgroundColor: Colors.background || '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border || '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: Colors.text?.secondary || '#666666',
  },
  dropdownText: {
    fontSize: 15,
    color: Colors.text?.primary || '#333333',
  },
  dropdownArrow: {
    fontSize: 11,
    color: Colors.text?.secondary || '#666666',
  },
  uploadContainer: {
    marginBottom: 20,
  },
  imagePicker: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border || '#e0e0e0',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  idImagePicker: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border || '#e0e0e0',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background || '#f5f5f5',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: Colors.text?.secondary || '#666666',
    fontSize: 12,
  },
  // Services section
  servicesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text?.primary || '#333333',
    marginBottom: 12,
  },
  serviceCard: {
    backgroundColor: Colors.background || '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border || '#e0e0e0',
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary || '#007AFF',
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary || '#007AFF',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addServiceText: {
    color: Colors.primary || '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Buttons & links
  registerButton: {
    marginTop: 20,
    marginBottom: 16,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginText: {
    color: Colors.text?.secondary || '#666666',
    fontSize: 14,
  },
  loginLinkText: {
    color: Colors.primary || '#007AFF',
    fontWeight: '600',
  },
  // Modals
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface || '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text?.primary || '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border || '#e0e0e0',
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text?.primary || '#333333',
  },
  modalLoader: {
    marginVertical: 30,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.text?.secondary || '#666666',
    padding: 20,
  },
  // Success screen
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: Colors.background || '#f5f5f5',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text?.primary || '#333333',
    marginTop: 20,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.text?.secondary || '#666666',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
});