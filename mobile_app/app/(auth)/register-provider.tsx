// app/(auth)/register-provider.tsx
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';

// Ignore specific warnings if needed

const ID_PHOTO_TYPES = ['Passport', 'Driver License', 'National ID', 'Kebele ID'];

// Interface for service category from database
interface ServiceCategory {
  catagoryID: string;
  name: string;
  description?: string;
  icon?: string;
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

  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [serviceOfferings, setServiceOfferings] = useState<ServiceOffering[]>([
    { categoryId: '', categoryName: '', serviceName: '', basePrice: '', description: '' }
  ]);

  const [profilePicture, setProfilePicture] = useState<any>(null);
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
  const [idPhoto, setIdPhoto] = useState<any>(null);
  const [idPhotoUri, setIdPhotoUri] = useState<string | null>(null);
  const [credentialPhoto, setCredentialPhoto] = useState<any>(null);
  const [credentialPhotoUri, setCredentialPhotoUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showServiceCategoryModal, setShowServiceCategoryModal] = useState<number | null>(null);
  const [cities, setCities] = useState<any[]>([]);

  useEffect(() => {
    fetchCities();
    fetchServiceCategories();
  }, []);

  const fetchCities = async () => {
    setLoadingCities(true);
    try {
      const resp = await api.get<any>('/cities');
      console.log('Cities response:', resp);
      if (resp.success && resp.data) {
        setCities(Array.isArray(resp.data) ? resp.data : []);
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
    setCategoriesError(null);

    try {
      const resp = await api.get<any>('/categories');
      console.log('Categories API response:', resp);

      if (resp.success && resp.data) {
        let categoriesData = [];

        if (Array.isArray(resp.data)) {
          categoriesData = resp.data;
        } else if (resp.data.data && Array.isArray(resp.data.data)) {
          categoriesData = resp.data.data;
        } else if ((resp as any).categories && Array.isArray((resp as any).categories)) {
          categoriesData = (resp as any).categories;
        } else {
          categoriesData = Object.values(resp.data).filter(item =>
            typeof item === 'object' && item !== null
          );
        }

        setServiceCategories(categoriesData);
        console.log(`Loaded ${categoriesData.length} categories`);
      } else {
        setCategoriesError('No categories found');
        setServiceCategories([]);
      }
    } catch (err: any) {
      console.log('Error fetching service categories:', err);
      setCategoriesError(err.message || 'Failed to load categories');
      setServiceCategories([]);

      Alert.alert(
        'Warning',
        'Could not load service categories. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  const addServiceOffering = () => {
    setServiceOfferings([
      ...serviceOfferings,
      { categoryId: '', categoryName: '', serviceName: '', basePrice: '', description: '' },
    ]);
  };




  const removeServiceOffering = (index: number) => {
    if (serviceOfferings.length > 1) {
      const updated = [...serviceOfferings];
      updated.splice(index, 1);
      setServiceOfferings(updated);
    } else {
      Alert.alert('Info', 'You need at least one service offering.');
    }
  };

  const updateServiceOffering = (index: number, field: keyof ServiceOffering, value: string) => {
    setServiceOfferings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'categoryId') {
        console.log('Updating categoryId to:', value);
        const category = serviceCategories.find(c => String(c.catagoryID) === String(value) || String((c as any).id) === String(value));
        if (category) {
          updated[index].categoryName = category.name;
        }
      }

      return updated;
    });
  };

  const pickImage = async (type: 'profile' | 'id' | 'credential') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted' && Platform.OS !== 'web') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [3, 2],
      quality: 0.5,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      if (type === 'profile') setProfilePictureUri(asset.uri);
      else if (type === 'id') setIdPhotoUri(asset.uri);
      else setCredentialPhotoUri(asset.uri);

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const file = new File([blob], type === 'profile' ? 'profile.jpg' : type === 'id' ? 'id.jpg' : 'credential.jpg', { type: blob.type });

        if (type === 'profile') setProfilePicture(file);
        else if (type === 'id') setIdPhoto(file);
        else setCredentialPhoto(file);
      } else {
        const filename = asset.uri.split('/').pop() || 'upload.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

        const mobileFile = {
          uri: asset.uri,
          name: filename,
          type: mimeType,
        };

        if (type === 'profile') setProfilePicture(mobileFile);
        else if (type === 'id') setIdPhoto(mobileFile);
        else setCredentialPhoto(mobileFile);
      }
    }
  };

  const validatePhoneNumber = (phone: string) => /^(09|07)[0-9]{8}$/.test(phone);
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => validatePhoneNumber(phone);

  const validateServiceOfferings = () => {
    for (let i = 0; i < serviceOfferings.length; i++) {
      const offering = serviceOfferings[i];
      if (!offering.categoryId) {
        const msg = `Service #${i + 1}: Please select a category`;
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
        return false;
      }
      if (!offering.serviceName.trim()) {
        const msg = `Service #${i + 1}: Please enter service name`;
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
        return false;
      }
      if (!offering.basePrice.trim() || isNaN(Number(offering.basePrice)) || Number(offering.basePrice) <= 0) {
        const msg = `Service #${i + 1}: Please enter a valid base price`;
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
        return false;
      }
    }
    return true;
  };

  const registerProvider = async () => {
    if (!formData.fullname || !formData.email || !formData.phone || !formData.service_city || !formData.idPhotoType || !profilePicture || !idPhoto || !credentialPhoto) {
      Alert.alert('Error', 'Please fill all fields, select an ID type, and upload all required images including the business license.');
      return;
    }

    if (!validatePhoneNumber(formData.phone)) {
      Alert.alert('Error', 'Invalid phone number format. Phone must be 10 digits starting with 09 or 07');
      return;
    }

    if (formData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      Alert.alert('Error', 'Passwords do not match');
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

      data.append('fullname', formData.fullname);
      data.append('email', formData.email);
      data.append('phone', formData.phone.replace(/[^0-9]/g, ''));
      data.append('service_city', formData.service_city);
      data.append('idPhotoType', formData.idPhotoType);
      data.append('password', formData.password);
      data.append('password_confirmation', formData.password_confirmation);

      const servicesToSend = serviceOfferings.map(s => ({
        categoryId: s.categoryId,
        serviceName: s.serviceName,
        basePrice: parseFloat(s.basePrice),
        description: s.description || ''
      }));

      data.append('services', JSON.stringify(servicesToSend));
      if (servicesToSend.length > 0) {
        data.append('catagoryID', servicesToSend[0].categoryId);
      }
      console.log('Services being sent:', servicesToSend);

      if (profilePicture) {
        data.append('profilePicture', profilePicture);
      }
      if (idPhoto) {
        data.append('idPhoto', idPhoto);
      }
      if (credentialPhoto) {
        data.append('credentialPhoto', credentialPhoto);
      }

      console.log('Sending registration request...');

      const response = await api.post<any>('/provider/register', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        timeout: 60000, // 60 seconds timeout for file uploads
      });

      console.log('Registration response:', response);

      if (response.success || response.status === 'success') {
        console.log('Provider registration success: Redirecting to login...');
        setTimeout(() => {
          router.replace('/login');
        }, 100);
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

      let errorMessage = "Registration failed. Please try again.";

      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const errorList = [];
        for (let key in errors) {
          errorList.push(`${key}: ${errors[key].join(', ')}`);
        }
        errorMessage = errorList.join('\n');
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert('Registration Error', errorMessage);
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
  const renderModalItem = (item: string | any, onSelect: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onSelect}>
      <Text style={styles.modalItemText}>
        <Text>{typeof item === 'string' ? item : item.name || item.cityName || item}</Text>
      </Text>
    </TouchableOpacity>
  );

  const renderServiceCategoryModal = (index: number) => (
    <Modal visible={showServiceCategoryModal === index} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              <Text>Choose Service Category</Text>
            </Text>
            <TouchableOpacity onPress={() => setShowServiceCategoryModal(null)}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {loadingCategories ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>
                <Text>Loading categories...</Text>
              </Text>
            </View>
          ) : categoriesError ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
              <Text style={styles.errorText}>{categoriesError}</Text>
              <TouchableOpacity onPress={fetchServiceCategories} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : serviceCategories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={Colors.text.secondary} />
              <Text style={styles.emptyText}>
                <Text>No categories available</Text>
              </Text>
            </View>
          ) : (
            <FlatList
              data={serviceCategories}
              keyExtractor={(item) => item.catagoryID?.toString() || (item as any).id?.toString() || Math.random().toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    const id = (item as any).catagoryID || item.catagoryID || (item as any).id;
                    updateServiceOffering(index, 'categoryId', id?.toString() || '');
                    updateServiceOffering(index, 'categoryName', item.name);
                    setShowServiceCategoryModal(null);
                  }}
                >
                  <View style={styles.categoryItem}>
                    {item.icon && <Text style={styles.categoryIcon}>{item.icon}</Text>}
                    <Text style={styles.modalItemText}>{item.name}</Text>
                  </View>
                  {item.description && (
                    <Text style={styles.categoryDescription}>{item.description}</Text>
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}

          <AppButton
            title="Cancel"
            onPress={() => setShowServiceCategoryModal(null)}
            variant="outline"
            style={styles.modalButton}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text>Provider Registration</Text>
        </Text>
        <Text style={styles.subtitle}>
          <Text>Join as a service provider</Text>
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Profile Picture Section */}
        <View style={styles.uploadContainer}>
          <Text style={styles.label}>
            <Text>Profile Picture </Text><Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('profile')}>
            {profilePictureUri ? (
              <Image source={{ uri: profilePictureUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={40} color={Colors.text.secondary} />
                <Text style={styles.imagePlaceholderText}>
                  <Text>Upload Photo</Text>
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <AppInput
          label="Full Name"
          value={formData.fullname}
          onChangeText={(t: string) => setFormData({ ...formData, fullname: t })}
          placeholder="John Doe"
          required
        />

        <AppInput
          label="Email"
          value={formData.email}
          onChangeText={(t: string) => setFormData({ ...formData, email: t })}
          placeholder="email@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          required
        />

        <AppInput
          label="Phone Number"
          value={formData.phone}
          onChangeText={(t: string) => {
            const cleaned = t.replace(/[^0-9]/g, '');
            if (cleaned.length <= 10) {
              setFormData({ ...formData, phone: cleaned });
            }
          }}
          placeholder="0912345678"
          keyboardType="phone-pad"
          maxLength={10}
          required
        />
        <Text style={styles.hintText}>
          <Text>10 digits starting with 09 or 07</Text>
        </Text>

        {/* Service City Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Text>Service City </Text><Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowCityModal(true)}>
            <Text style={formData.service_city ? styles.dropdownText : styles.dropdownPlaceholder}>
              <Text>{formData.service_city || "Select your service city"}</Text>
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Service Offerings Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>
            <Text>Services You Offer </Text><Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.sectionSubtitle}>
            <Text>Add at least one service you provide</Text>
          </Text>
          {serviceOfferings.map((offering, index) => (
            <View key={index} style={styles.serviceCard}>
              <View style={styles.serviceCardHeader}>
                <Text style={styles.serviceCardTitle}>
                  <Text>Service #{index + 1}</Text>
                </Text>
                {serviceOfferings.length > 1 && (
                  <TouchableOpacity onPress={() => removeServiceOffering(index)}>
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <Text>Category </Text><Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dropdown]}
                  onPress={() => setShowServiceCategoryModal(index)}
                >
                  <Text style={offering.categoryId ? styles.dropdownText : styles.dropdownPlaceholder}>
                    <Text>{offering.categoryName || "Select a category"}</Text>
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <AppInput
                label="Service Name"
                value={offering.serviceName}
                onChangeText={(t: string) => updateServiceOffering(index, 'serviceName', t)}
                placeholder="e.g., Plumbing"
                required
              />

              <AppInput
                label="Base Price (ETB)"
                value={offering.basePrice}
                onChangeText={(t: string) => {
                  const numeric = t.replace(/[^0-9]/g, '');
                  updateServiceOffering(index, 'basePrice', numeric);
                }}
                placeholder="1000"
                keyboardType="numeric"
                required
              />

              <AppInput
                label="Description (Optional)"
                value={offering.description}
                onChangeText={(t: string) => updateServiceOffering(index, 'description', t)}
                placeholder="Describe this service..."
                multiline
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addServiceButton} onPress={addServiceOffering}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
            <Text style={styles.addServiceText}>
              <Text>Add Another Service</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* ID Document Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Text>ID Document Type </Text><Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowIdTypeModal(true)}>
            <Text style={formData.idPhotoType ? styles.dropdownText : styles.dropdownPlaceholder}>
              <Text>{formData.idPhotoType || "Select ID type"}</Text>
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* ID Photo Upload */}
        <View style={styles.uploadContainer}>
          <Text style={styles.label}>
            <Text>ID Card Photo </Text><Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.idImagePicker} onPress={() => pickImage('id')}>
            {idPhotoUri ? (
              <Image source={{ uri: idPhotoUri }} style={styles.idImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="id-card-outline" size={40} color={Colors.text.secondary} />
                <Text style={styles.imagePlaceholderText}>
                  <Text>Upload ID Card</Text>
                </Text>
                <Text style={styles.imageHintText}>
                  <Text>Passport, Driver License, or National ID</Text>
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Credential Photo Upload */}
        <View style={styles.uploadContainer}>
          <Text style={styles.label}>
            <Text>Business License/Certificate </Text><Text style={styles.required}>*</Text>
            <Text>what shall I do </Text><Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.idImagePicker} onPress={() => pickImage('credential')}>
            {credentialPhotoUri ? (
              <Image source={{ uri: credentialPhotoUri }} style={styles.idImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="document-attach-outline" size={40} color={Colors.text.secondary} />
                <Text style={styles.imagePlaceholderText}>
                  <Text>Upload License/Certificate</Text>
                </Text>
                <Text style={styles.imageHintText}>
                  <Text>Required to verify your business</Text>
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <AppInput
          label="Password"
          value={formData.password}
          onChangeText={(t: string) => setFormData({ ...formData, password: t })}
          secureTextEntry
          placeholder="Minimum 8 characters"
          required
        />

        <AppInput
          label="Confirm Password"
          value={formData.password_confirmation}
          onChangeText={(t: string) => setFormData({ ...formData, password_confirmation: t })}
          secureTextEntry
          placeholder="Re-enter password"
          required
        />

        <AppButton
          title="Register as Provider"
          onPress={registerProvider}
          loading={loading}
          disabled={loading}
          fullWidth
          style={styles.registerButton}
        />

        {/* Login Link */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => {
            console.log("Navigating to login");
            router.push('/login');
          }}
        >
          <Text style={styles.loginText}>
            <Text>Already have an account? </Text><Text style={styles.loginLinkText}>Sign In</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => {
            console.log("Navigating to login");
            router.push('/login');
          }}
        >
          <Text style={styles.loginText}>
            <Text>Need help? </Text><Text style={styles.loginLinkText}>Contact Support</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* ID Type Modal */}
      <Modal visible={showIdTypeModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select ID Type</Text>
              <TouchableOpacity onPress={() => setShowIdTypeModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ID_PHOTO_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderModalItem(item, () => {
                  setFormData({ ...formData, idPhotoType: item });
                  setShowIdTypeModal(false);
                })
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* City Modal */}
      <Modal visible={showCityModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            {cities.length > 0 ? (
              <FlatList
                data={cities}
                keyExtractor={(item) => item.cityID?.toString() || item.id?.toString() || Math.random().toString()}
                renderItem={({ item }) =>
                  renderModalItem(item.name || item, () => {
                    setFormData({ ...formData, service_city: item.name || item });
                    setShowCityModal(false);
                  })
                }
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>No cities available</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Service Category Modal - Rendered for each service offering */}
      {serviceOfferings.map((_, index) => renderServiceCategoryModal(index))}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 20,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  header: {
    padding: 30,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 4
  },
  formContainer: {
    padding: 20,
    margin: 15,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8
  },
  required: {
    color: Colors.error
  },
  hintText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: -15,
    marginBottom: 15,
    marginLeft: 5
  },
  dropdown: {
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  dropdownPlaceholder: {
    color: Colors.text.secondary
  },
  dropdownText: {
    color: Colors.text.primary,
    fontSize: 16,
  },
  uploadContainer: {
    marginBottom: 20
  },
  imagePicker: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  idImagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  idImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  imageHintText: {
    marginTop: 4,
    color: Colors.text.secondary,
    fontSize: 12,
  },
  servicesSection: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  serviceCard: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary
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
    marginTop: 8,
    backgroundColor: Colors.background,
  },
  addServiceText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  registerButton: {
    marginTop: 20,
    marginBottom: 15
  },
  loginLink: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  loginText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  loginLinkText: {
    color: Colors.primary,
    fontWeight: "600"
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%"
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text.primary
  },
  modalButton: {
    marginTop: 15,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text.primary
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  categoryDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    marginTop: 12,
    color: Colors.text.secondary,
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});