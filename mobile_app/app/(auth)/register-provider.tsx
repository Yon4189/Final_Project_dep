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
  Platform,
} from 'react-native';
import { api } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { Colors } from '../constants/Colors';
import { SERVICE_CATEGORIES } from '../constants/Services';

const ID_PHOTO_TYPES = ['Passport', 'Driver License', 'National ID', 'Kebele ID'];

export default function RegisterProvider() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
    catagoryID: '',
    service_city: '',
    password: '',
    password_confirmation: '',
    idPhotoType: '',
  });

  // State to hold binary file (Object for Mobile, File for Web)
  const [profilePicture, setProfilePicture] = useState<any>(null);
  const [idPhoto, setIdPhoto] = useState<any>(null);

  // Preview URIs for the UI
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
  const [idPhotoUri, setIdPhotoUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [cities, setCities] = useState<any[]>([]);

  React.useEffect(() => {
    fetchCities();
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
      quality: 0.5, // Critical to keep file size low
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      // 1. Set UI Preview
      if (type === 'profile') setProfilePictureUri(asset.uri);
      else setIdPhotoUri(asset.uri);

      // 2. Prepare Data for Laravel
      if (Platform.OS === 'web') {
        // WEB: Fetch the URI to convert it to a Blob/File
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const file = new File([blob], type === 'profile' ? 'profile.jpg' : 'id.jpg', { type: blob.type });

        if (type === 'profile') setProfilePicture(file);
        else setIdPhoto(file);
      } else {
        // ANDROID/IOS: Create the file object structure
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

    setLoading(true);

    try {
      const data = new FormData();

      // Append Text Data
      data.append('fullname', formData.fullname);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('catagoryID', formData.catagoryID || '');
      data.append('service_city', formData.service_city);
      data.append('idPhotoType', formData.idPhotoType);
      data.append('password', formData.password);
      data.append('password_confirmation', formData.password_confirmation);

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
        // 1. Show Alert
        Alert.alert('Success', 'Registration complete!');

        // 2. IMMEDIATE NAVIGATION
        router.replace('/(auth)/login');
      } else {
        Alert.alert('Error', response.message || 'Registration failed');
      }
    } catch (err: any) {
      console.log('UPLOAD ERROR:', err.message);
      Alert.alert('Error', err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderModalItem = (item: string, onSelect: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onSelect}>
      <Text style={styles.modalItemText}>{item}</Text>
    </TouchableOpacity>
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
          <Text style={styles.label}>Category <Text>*</Text></Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowCategoryModal(true)}>
            <Text style={formData.catagoryID ? styles.dropdownText : styles.dropdownPlaceholder}>
              {formData.catagoryID
                ? SERVICE_CATEGORIES.find(c => c.id.toString() === formData.catagoryID)?.name
                : "Select Service"}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service City <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowCityModal(true)}>
            <Text style={formData.service_city ? styles.dropdownText : styles.dropdownPlaceholder}>
              {formData.service_city || "Select City"}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
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
      <Modal visible={showCategoryModal} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Category</Text>
            <FlatList
              data={SERVICE_CATEGORIES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) =>
                renderModalItem(item.name, () => {
                  setFormData({ ...formData, catagoryID: item.id.toString() });
                  setShowCategoryModal(false);
                })
              }
            />
            <AppButton title="Close" onPress={() => setShowCategoryModal(false)} variant="outline" />
          </View>
        </View>
      </Modal>

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
                renderModalItem(item.name || item, () => {
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
});