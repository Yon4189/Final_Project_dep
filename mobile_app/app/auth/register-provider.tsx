

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
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
} from 'react-native';
import { api } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { Colors } from '../constants/Colors';

const ID_PHOTO_TYPES = ['Passport', 'Driver License', 'National ID', 'Kebele ID'];

// Interface for service category from database
interface ServiceCategory {
  catagoryID: string;
  name: string;
  description?: string;
}

// Interface for service offering
interface ServiceOffering {
  categoryId: string;
  categoryName: string;
  serviceName: string;
  basePrice: string;
  description: string;
}

export default function RegisterProvider() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
    service_city: '',
    password: '',
    password_confirmation: '',
    idPhotoType: '',
  });

  // State for service categories from database
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // State for service offerings
  const [serviceOfferings, setServiceOfferings] = useState<ServiceOffering[]>([
    { categoryId: '', categoryName: '', serviceName: '', basePrice: '', description: '' }
  ]);

  // State to hold binary file (Object for Mobile, File for Web)
  const [profilePicture, setProfilePicture] = useState<any>(null);
  const [idPhoto, setIdPhoto] = useState<any>(null);

  // Preview URIs for the UI
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
  const [idPhotoUri, setIdPhotoUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showServiceCategoryModal, setShowServiceCategoryModal] = useState<number | null>(null);
  const [cities, setCities] = useState<any[]>([]);

  // Fetch cities and service categories on mount
  useEffect(() => {
    fetchCities();
    fetchServiceCategories();
  }, []);

  const fetchCities = async () => {
    try {
      const resp = await api.get<any>('/cities');
      if (resp.success) {
        setCities(resp.data);
      }
    } catch (err) {
      console.log('Error fetching cities:', err);
    }
  };

  const fetchServiceCategories = async () => {
    setLoadingCategories(true);
    try {
      const resp = await api.get<any>('/categories');
      if (resp.success) {
        setServiceCategories(resp.data);
      } else {
        // Fallback to empty array if API fails
        setServiceCategories([]);
        Alert.alert('Warning', 'Could not load service categories');
      }
    } catch (err) {
      console.log('Error fetching service categories:', err);
      setServiceCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Handle service offering changes
  const addServiceOffering = () => {
    setServiceOfferings([
      ...serviceOfferings,
      { categoryId: '', categoryName: '', serviceName: '', basePrice: '', description: '' }
    ]);
  };

  const removeServiceOffering = (index: number) => {
    if (serviceOfferings.length > 1) {
      const updated = [...serviceOfferings];
      updated.splice(index, 1);
      setServiceOfferings(updated);
    }
  };

  const updateServiceOffering = (index: number, field: keyof ServiceOffering, value: string) => {
    const updated = [...serviceOfferings];
    updated[index] = { ...updated[index], [field]: value };

    // If updating categoryId, also update categoryName
    if (field === 'categoryId') {
      const category = serviceCategories.find(c => c.catagoryID === value);
      if (category) {
        updated[index].categoryName = category.name;
      }
    }

    setServiceOfferings(updated);
  };

  // ---------- HYBRID IMAGE PICKER ----------
  const pickImage = async (type: 'profile' | 'id') => {
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

      // Set UI Preview
      if (type === 'profile') setProfilePictureUri(asset.uri);
      else setIdPhotoUri(asset.uri);

      // Prepare Data for Laravel
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const file = new File([blob], type === 'profile' ? 'profile.jpg' : 'id.jpg', { type: blob.type });

        if (type === 'profile') setProfilePicture(file);
        else setIdPhoto(file);
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
        else setIdPhoto(mobileFile);
      }
    }
  };

  const validatePhoneNumber = (phone: string) => /^(09|07)[0-9]{8}$/.test(phone);

  // Validate service offerings
  const validateServiceOfferings = () => {
    for (let i = 0; i < serviceOfferings.length; i++) {
      const offering = serviceOfferings[i];
      if (!offering.categoryId) {
        Alert.alert('Error', `Service #${i + 1}: Please select a category`);
        return false;
      }
      if (!offering.serviceName.trim()) {
        Alert.alert('Error', `Service #${i + 1}: Please enter service name`);
        return false;
      }
      if (!offering.basePrice.trim() || isNaN(Number(offering.basePrice)) || Number(offering.basePrice) <= 0) {
        Alert.alert('Error', `Service #${i + 1}: Please enter a valid base price`);
        return false;
      }
    }
    return true;
  };

  // ---------- REGISTRATION LOGIC ----------
  const registerProvider = async () => {
    // Basic Validation
    if (!formData.fullname || !formData.email || !formData.phone || !formData.service_city || !profilePicture || !idPhoto) {
      Alert.alert('Error', 'Please fill all fields and upload both images.');
      return;
    }

    if (!validatePhoneNumber(formData.phone)) {
      Alert.alert('Error', 'Invalid phone number format.');
      return;
    }

    if (!validateServiceOfferings()) {
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();

      // Append Text Data
      data.append('fullname', formData.fullname);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('service_city', formData.service_city);
      data.append('idPhotoType', formData.idPhotoType);
      data.append('password', formData.password);
      data.append('password_confirmation', formData.password_confirmation);

      // Append Service Offerings as JSON
      data.append('services', JSON.stringify(serviceOfferings.map(s => ({
        categoryId: s.categoryId,
        serviceName: s.serviceName,
        basePrice: parseFloat(s.basePrice),
        description: s.description
      }))));

      // Append File Data
      data.append('profilePicture', profilePicture);
      data.append('idPhoto', idPhoto);

      const response = await api.post<any>('/provider/register', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        timeout: 45000,
      });

      if (response.success) {
        setRegistrationSuccess(true);
      } else {
        Alert.alert('Registration Failed', response.message || 'Something went wrong. Please try again.');
      }
    } catch (err: any) {
      console.log('UPLOAD ERROR:', err);
      // err.responseData is attached by api.ts interceptor with the full Laravel response
      const serverData = err?.responseData;
      if (serverData?.errors) {
        const fieldErrors = Object.values(serverData.errors).flat().join('\n');
        Alert.alert('Validation Error', fieldErrors);
      } else if (serverData?.message) {
        Alert.alert('Error', serverData.message);
      } else {
        Alert.alert('Connection Error', err.message || 'Could not reach the server. Please check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderModalItem = (item: string | any, onSelect: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onSelect}>
      <Text style={styles.modalItemText}>{typeof item === 'string' ? item : item.name || item}</Text>
    </TouchableOpacity>
  );

  const renderServiceCategoryModal = (index: number) => (
    <Modal visible={showServiceCategoryModal === index} animationType="fade" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choose Service Category</Text>
          {loadingCategories ? (
            <View style={styles.loadingContainer}>
              <Text>Loading categories...</Text>
            </View>
          ) : (
            <FlatList
              data={serviceCategories}
              keyExtractor={(item) => item.catagoryID.toString()}
              renderItem={({ item }) =>
                renderModalItem(item.name, () => {
                  updateServiceOffering(index, 'categoryId', item.catagoryID);
                  updateServiceOffering(index, 'categoryName', item.name);
                  setShowServiceCategoryModal(null);
                })
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No categories found</Text>
                </View>
              }
            />
          )}
          <AppButton title="Close" onPress={() => setShowServiceCategoryModal(null)} variant="outline" />
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Provider Registration</Text>
        <Text style={styles.subtitle}>Android & Web Compatible</Text>
      </View>

      <View style={styles.formContainer}>
        {/* Profile Picture Section */}
        <View style={styles.uploadContainer}>
          <Text style={styles.label}>Profile Picture <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('profile')}>
            {profilePictureUri ? (
              <Image source={{ uri: profilePictureUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={40} color={Colors.text.secondary} />
                <Text style={styles.imagePlaceholderText}>Upload Photo</Text>
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
          onChangeText={(t: string) => setFormData({ ...formData, phone: t })}
          placeholder="0911223344"
          keyboardType="phone-pad"
          maxLength={10}
          required
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service City <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowCityModal(true)}>
            <Text style={formData.service_city ? styles.dropdownText : styles.dropdownPlaceholder}>
              {formData.service_city || "Select City"}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Service Offerings Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Services You Offer <Text style={styles.required}>*</Text></Text>

          {serviceOfferings.map((offering, index) => (
            <View key={index} style={styles.serviceCard}>
              <View style={styles.serviceCardHeader}>
                <Text style={styles.serviceCardTitle}>Service #{index + 1}</Text>
                {serviceOfferings.length > 1 && (
                  <TouchableOpacity onPress={() => removeServiceOffering(index)}>
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowServiceCategoryModal(index)}
                >
                  <Text style={offering.categoryId ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {offering.categoryName || "Select Category"}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              <AppInput
                label="Service Name"
                value={offering.serviceName}
                onChangeText={(t: string) => updateServiceOffering(index, 'serviceName', t)}
                placeholder="e.g., Plumbing Repair"
                required
              />

              <AppInput
                label="Base Price (ETB)"
                value={offering.basePrice}
                onChangeText={(t: string) => updateServiceOffering(index, 'basePrice', t)}
                placeholder="1000"
                keyboardType="numeric"
                required
              />

              <AppInput
                label="Description"
                value={offering.description}
                onChangeText={(t: string) => updateServiceOffering(index, 'description', t)}
                placeholder="Describe this service..."
                multiline
              />

              {renderServiceCategoryModal(index)}
            </View>
          ))}

          <TouchableOpacity style={styles.addServiceButton} onPress={addServiceOffering}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
            <Text style={styles.addServiceText}>Add Another Service</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ID Document Type <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowIdTypeModal(true)}>
            <Text style={formData.idPhotoType ? styles.dropdownText : styles.dropdownPlaceholder}>
              {formData.idPhotoType || "Select ID Type"}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.uploadContainer}>
          <Text style={styles.label}>ID Card Photo <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.idImagePicker} onPress={() => pickImage('id')}>
            {idPhotoUri ? (
              <Image source={{ uri: idPhotoUri }} style={styles.idImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="id-card" size={40} color={Colors.text.secondary} />
                <Text style={styles.imagePlaceholderText}>Upload ID Card</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <AppInput
          label="Password"
          value={formData.password}
          onChangeText={(t: string) => setFormData({ ...formData, password: t })}
          secureTextEntry
          placeholder="Min 8 characters"
          required
        />

        <AppInput
          label="Confirm Password"
          value={formData.password_confirmation}
          onChangeText={(t: string) => setFormData({ ...formData, password_confirmation: t })}
          secureTextEntry
          placeholder="Repeat password"
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
      </View>

      {/* --- MODALS --- */}
      <Modal visible={showIdTypeModal} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose ID Type</Text>
            <FlatList
              data={ID_PHOTO_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderModalItem(item, () => {
                  setFormData({ ...formData, idPhotoType: item });
                  setShowIdTypeModal(false);
                })
              }
            />
            <AppButton title="Close" onPress={() => setShowIdTypeModal(false)} variant="outline" />
          </View>
        </View>
      </Modal>

      <Modal visible={showCityModal} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Service City</Text>
            <FlatList
              data={cities}
              keyExtractor={(item) => item.cityID?.toString() || item.id?.toString() || item.name || item}
              renderItem={({ item }) =>
                renderModalItem(item, () => {
                  setFormData({ ...formData, service_city: item.name || item });
                  setShowCityModal(false);
                })
              }
            />
            <AppButton title="Close" onPress={() => setShowCityModal(false)} variant="outline" />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 30, backgroundColor: Colors.surface, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text.primary },
  subtitle: { fontSize: 14, color: Colors.text.secondary, marginTop: 4 },
  formContainer: { padding: 20, margin: 15, backgroundColor: Colors.surface, borderRadius: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, marginBottom: 8 },
  required: { color: Colors.error },
  dropdown: {
    backgroundColor: Colors.background, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center"
  },
  dropdownPlaceholder: { color: Colors.text.secondary },
  dropdownText: { color: Colors.text.primary },
  dropdownArrow: { fontSize: 10, color: Colors.text.secondary },
  imagePicker: { width: '100%', height: 130, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', overflow: 'hidden' },
  idImagePicker: { width: '100%', height: 180, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  idImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  imagePlaceholderText: { marginTop: 8, color: Colors.text.secondary, fontSize: 12 },
  registerButton: { marginTop: 15 },
  uploadContainer: { marginBottom: 20 },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: "70%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  modalItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalItemText: { fontSize: 16 },
  loadingContainer: { padding: 20, alignItems: 'center' },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { color: Colors.text.secondary, fontSize: 14 },
  servicesSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 12 },
  serviceCard: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addServiceText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});