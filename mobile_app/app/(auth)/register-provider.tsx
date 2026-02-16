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
  Image,
} from 'react-native';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { Colors} from '../constants/Colors';
import { BANKS, LOCATIONS, SERVICE_CATEGORIES } from '../constants/Services';

// ID Photo Types
const ID_PHOTO_TYPES = ['Passport', 'Driver License', 'National ID', 'Kebele ID'];

export default function RegisterProvider() {
  const router = useRouter();

  // ---------- STATE ----------
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
   // service_city: '',
    catagoryID: '',
    password: '',
    password_confirmation: '',
    idPhotoType: '',
  });

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
  
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [idPhotoUri, setIdPhotoUri] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);

  // ---------- PICK IMAGE ----------
  const pickProfilePicture = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setProfilePictureUri(asset.uri);
      
      const filename = asset.uri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      setProfilePicture({
        uri: asset.uri,
        name: filename,
        type: type,
      } as any);
    }
  };

  const pickIdPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setIdPhotoUri(asset.uri);
      
      const filename = asset.uri.split('/').pop() || 'id.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      setIdPhoto({
        uri: asset.uri,
        name: filename,
        type: type,
      } as any);
    }
  };

  // ---------- VALIDATE PHONE ----------
  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^(09|07)[0-9]{8}$/;
    return phoneRegex.test(phone);
  };

  // ---------- REGISTER PROVIDER ----------
  const registerProvider = async () => {
    // Validation
    const errors: string[] = [];

    if (!formData.fullname) errors.push('Full Name');
    if (!formData.email) errors.push('Email');
    if (!formData.phone) errors.push('Phone Number');
   // if (!formData.service_city) errors.push('City');
    if (!formData.catagoryID) errors.push('Service Category');
    if (!formData.idPhotoType) errors.push('ID Photo Type');
    if (!formData.password) errors.push('Password');
    if (!profilePicture) errors.push('Profile Picture');
    if (!idPhoto) errors.push('ID Photo');

    if (errors.length > 0) {
      Alert.alert('Error', `Please fill all required fields:\n${errors.join(', ')}`);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Phone validation
    if (!validatePhoneNumber(formData.phone)) {
      Alert.alert(
        'Error', 
        'Phone number must be 10 digits starting with 09 or 07 (e.g., 0912345678)'
      );
      return;
    }

    // Password validation
    if (formData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Append all fields matching Laravel controller
      formDataToSend.append('fullname', formData.fullname);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      //formDataToSend.append('service_city', formData.service_city);
      formDataToSend.append('catagoryID', formData.catagoryID);
      formDataToSend.append('idPhotoType', formData.idPhotoType);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('password_confirmation', formData.password_confirmation);

      // Append profile picture
      if (profilePicture) {
        formDataToSend.append('profilePicture', profilePicture as any);
      }

      // Append ID photo
      if (idPhoto) {
        formDataToSend.append('idPhoto', idPhoto as any);
      }

      // Log for debugging
      console.log('Sending provider registration data:');
      console.log('fullname:', formData.fullname);
      console.log('email:', formData.email);
      console.log('phone:', formData.phone);
     // console.log('service_city:', formData.service_city);
      console.log('catagoryID:', formData.catagoryID);
      console.log('idPhotoType:', formData.idPhotoType);
      console.log('profilePicture:', profilePicture ? 'Yes' : 'No');
      console.log('idPhoto:', idPhoto ? 'Yes' : 'No');

      const response = await axios.post(`${API_BASE_URL}/provider/register`, formDataToSend, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      const resData = response.data;

      if (response.status >= 200 && response.status < 300 && resData.success) {
        Alert.alert(
          'Registration Successful!',
          'Your account has been created successfully. Please wait for admin verification.',
          [
            {
              text: 'Login',
              onPress: () => router.replace('/(auth)/login')
            }
          ]
        );
      } else {
        Alert.alert('Error', resData.message || 'Registration failed');
      }
    } catch (err: any) {
      console.log('API ERROR:', err.response?.data || err.message);
      
      if (err.response && err.response.data) {
        const data = err.response.data;
        
        if (data.errors) {
          // Format validation errors
          let errorMessage = 'Please fix the following errors:\n';
          for (const field in data.errors) {
            errorMessage += `\n• ${field}: ${data.errors[field].join(', ')}`;
          }
          Alert.alert('Validation Error', errorMessage);
        } else {
          Alert.alert('Error', data.message || 'Registration failed');
        }
      } else {
        Alert.alert('Error', 'Could not connect to server');
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------- MODAL ITEM RENDER ----------
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
        {/* Profile Picture Upload */}
        <View style={styles.uploadContainer}>
          <Text style={styles.label}>
            Profile Picture <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickProfilePicture}>
            {profilePictureUri ? (
              <Image source={{ uri: profilePictureUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={40} color={Colors.text.secondary} />
                <Text style={styles.imagePlaceholderText}>Upload Profile Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.hintText}>Accepted: JPG, PNG, JPEG (Max 2MB)</Text>
        </View>

        {/* Full Name */}
        <AppInput
          label="Full Name"
          value={formData.fullname}
          onChangeText={(t) => setFormData({ ...formData, fullname: t })}
          placeholder="Enter your full name"
          required
        />

        {/* Email */}
        <AppInput
          label="Email"
          value={formData.email}
          onChangeText={(t) => setFormData({ ...formData, email: t })}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          required
        />

        {/* Phone */}
        <AppInput
          label="Phone Number"
          value={formData.phone}
          onChangeText={(t) => setFormData({ ...formData, phone: t })}
          placeholder="09XXXXXXXX or 07XXXXXXXX"
          keyboardType="phone-pad"
          maxLength={10}
          required
        />
        <Text style={styles.hintText}>Enter 10 digits starting with 09 or 07</Text>

       {/* {/* Location/City Selection }
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            City <Text >*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowLocationModal(true)}
          >
            <Text
              style={
                formData.service_city
                  ? styles.dropdownText
                  : styles.dropdownPlaceholder
              }
            >
              {formData.service_city || "Select City"}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>
*/}

        {/* Service Category Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Service Category <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text
              style={
                formData.catagoryID
                  ? styles.dropdownText
                  : styles.dropdownPlaceholder
              }
            >
              {formData.catagoryID 
                ? SERVICE_CATEGORIES.find(c => c.id.toString() === formData.catagoryID)?.name 
                : "Select Category"}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* ID Photo Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            ID Photo Type <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowIdTypeModal(true)}
          >
            <Text
              style={
                formData.idPhotoType
                  ? styles.dropdownText
                  : styles.dropdownPlaceholder
              }
            >
              {formData.idPhotoType || "Select ID Type"}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* ID Photo Upload */}
        <View style={styles.uploadContainer}>
          <Text style={styles.label}>
            ID Card Upload <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.idImagePicker} onPress={pickIdPhoto}>
            {idPhotoUri ? (
              <Image source={{ uri: idPhotoUri }} style={styles.idImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="id-card" size={40} color={Colors.text.secondary} />
                <Text style={styles.imagePlaceholderText}>Upload ID Card</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.hintText}>Accepted: JPG, JPEG, PNG (Max 2MB)</Text>
        </View>

        {/* Password */}
        <AppInput
          label="Password"
          value={formData.password}
          onChangeText={(t) => setFormData({ ...formData, password: t })}
          placeholder="Enter password (min. 8 characters)"
          secureTextEntry
          required
        />

        {/* Confirm Password */}
        <AppInput
          label="Confirm Password"
          value={formData.password_confirmation}
          onChangeText={(t) => setFormData({ ...formData, password_confirmation: t })}
          placeholder="Re-enter password"
          secureTextEntry
          required
        />

        {/* Register Button */}
        <AppButton
          title="Register as Provider"
          onPress={registerProvider}
          loading={loading}
          fullWidth
          style={styles.registerButton}
        />

        {/* Customer Registration Link */}
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/(auth)/register-customer')}
        >
          <Text style={styles.linkText}>
            Register as Customer instead
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginText}>
            Already have an account?{' '}
            <Text style={styles.loginLinkText}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Modal */}
      {/*<Modal
        visible={showLocationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select City</Text>
            <FlatList
              data={LOCATIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderModalItem(item, () => {
                  setFormData({ ...formData, service_city: item });
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
*/}
      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Service Category</Text>
            <FlatList
              data={SERVICE_CATEGORIES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) =>
                renderModalItem(item.name, () => {
                  setFormData({ ...formData, catagoryID: item.id.toString() });
                  setShowCategoryModal(false);
                })
              }
              style={styles.modalList}
            />
            <AppButton
              title="Cancel"
              onPress={() => setShowCategoryModal(false)}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* ID Photo Type Modal */}
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
    </ScrollView>
  );
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
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
    color: Colors.text.primary 
  },
  subtitle: { 
    fontSize: 14, 
    color: Colors.text.secondary, 
    marginTop: 5 
  },
  formContainer: { 
    padding: 20, 
    margin: 15, 
    backgroundColor: Colors.surface, 
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  uploadContainer: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: Colors.text.primary, 
    marginBottom: 8 
  },
  required: {
    color: Colors.error,
  },
  hintText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 5,
    marginLeft: 5,
  },
  dropdown: {
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  imagePicker: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  idImagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  idImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  imageUploadedText: { 
    color: Colors.success, 
    marginTop: 5 
  },
  registerButton: { 
    marginTop: 20,
    marginBottom: 15,
  },
  linkButton: {
    padding: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  linkText: {
    color: Colors.secondary,
    fontWeight: "600",
    fontSize: 14,
  },
  loginLink: {
    alignItems: "center",
    marginTop: 10,
  },
  loginText: {
    color: Colors.text.secondary,
  },
  loginLinkText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text.primary,
    marginBottom: 20,
    textAlign: "center",
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