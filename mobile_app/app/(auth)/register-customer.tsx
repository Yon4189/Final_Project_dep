import { api } from "../services/api";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import * as ImagePicker from 'expo-image-picker';
import { Platform } from "react-native";
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
} from "react-native";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { Colors } from "../constants/Colors";
import { LOCATIONS } from "../constants/Services";
import { Ionicons } from '@expo/vector-icons';

export default function RegisterCustomerScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    location: "",
    service_city: "",
    password: "",
    password_confirmation: "",
    profilePicture: null as any,
  });

  const [loading, setLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
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

  const pickImage = async () => {
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
      setImageUri(asset.uri);

      const fileName = asset.uri.split('/').pop() || 'photo.jpg';
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'jpg' || fileExtension === 'jpeg'
        ? 'image/jpeg'
        : fileExtension === 'png'
          ? 'image/png'
          : 'image/jpeg';

      setFormData({
        ...formData,
        profilePicture: {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        }
      });
    }
  };

  const validatePhoneNumber = (phone: string) => /^(09|07)[0-9]{8}$/.test(phone);

  const handleRegister = async () => {
    if (!formData.fullname) return Alert.alert("Error", "Full name is required");
    if (!formData.email) return Alert.alert("Error", "Email is required");
    if (!formData.phone) return Alert.alert("Error", "Phone number is required");
    if (!formData.location) return Alert.alert("Error", "Full address location is required");
    if (!formData.service_city) return Alert.alert("Error", "Service city is required");
    if (!formData.password) return Alert.alert("Error", "Password is required");
    if (!formData.password_confirmation) return Alert.alert("Error", "Please confirm your password");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return Alert.alert("Error", "Please enter a valid email address");

    if (!validatePhoneNumber(formData.phone)) return Alert.alert(
      "Error",
      "Phone number must be 10 digits starting with 09 or 07 (e.g., 0912345678)"
    );

    if (formData.password.length < 8) return Alert.alert("Error", "Password must be at least 8 characters long");
    if (formData.password !== formData.password_confirmation) return Alert.alert("Error", "Passwords do not match");

    try {
      setLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append('fullname', formData.fullname);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('password_confirmation', formData.password_confirmation);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('service_city', formData.service_city);

      if (formData.profilePicture?.uri) {
        if (Platform.OS === 'web') {
          const response = await fetch(formData.profilePicture.uri);
          const blob = await response.blob();
          const fileName = formData.profilePicture.uri.split('/').pop() || 'photo.jpg';
          const file = new File([blob], fileName, {
            type: formData.profilePicture.type || 'image/jpeg'
          });
          formDataToSend.append('profilePicture', file);
        } else {
          const fileToUpload = {
            uri: formData.profilePicture.uri,
            name: formData.profilePicture.name || 'photo.jpg',
            type: formData.profilePicture.type || 'image/jpeg',
          };
          formDataToSend.append('profilePicture', fileToUpload as any);
        }
      }

      const response = await api.post<any>(
        '/customer/register',
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.success) {
        setFormData({
          fullname: "",
          email: "",
          phone: "",
          location: "",
          service_city: "",
          password: "",
          password_confirmation: "",
          profilePicture: null,
        });
        setImageUri(null);
        router.push("/(auth)/login");
        Alert.alert(
          "Success",
          "Account created successfully. Please login to continue."
        );
      } else {
        Alert.alert("Error", response.message || "Registration failed");
      }
    } catch (err: any) {
      console.error('Registration error:', err.message);
      Alert.alert("Error", err.message || "Could not connect to server");
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
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Customer Registration</Text>
        <Text style={styles.subtitle}>Find trusted service providers</Text>
      </View>

      <View style={styles.formContainer}>
        <AppInput
          label="Full Name"
          value={formData.fullname}
          onChangeText={(text: string) => setFormData({ ...formData, fullname: text })}
          placeholder="Enter your full name"
          required
        />

        <AppInput
          label="Email"
          value={formData.email}
          onChangeText={(text: string) => setFormData({ ...formData, email: text })}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          required
        />

        <AppInput
          label="Phone Number"
          value={formData.phone}
          onChangeText={(text: string) => setFormData({ ...formData, phone: text })}
          placeholder="09XXXXXXXX or 07XXXXXXXX"
          keyboardType="phone-pad"
          maxLength={10}
          required
        />
        <Text style={styles.hintText}>Enter 10 digits starting with 09 or 07</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Location <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowLocationModal(true)}
          >
            <Text
              style={formData.location ? styles.dropdownText : styles.dropdownPlaceholder}
            >
              {formData.location || "Select Location"}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <AppInput
          label="Password"
          value={formData.password}
          onChangeText={(text: string) => setFormData({ ...formData, password: text })}
          placeholder="Enter password (min. 8 characters)"
          secureTextEntry
          required
        />

        <AppInput
          label="Confirm Password"
          value={formData.password_confirmation}
          onChangeText={(text: string) =>
            setFormData({ ...formData, password_confirmation: text })
          }
          placeholder="Re-enter password"
          secureTextEntry
          required
        />

        {/* Profile Picture */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Profile Picture (Optional)</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={40} color={Colors.text.secondary} />
                <Text style={styles.imagePlaceholderText}>Upload Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <AppButton
          title="Register as Customer"
          onPress={handleRegister}
          loading={loading}
          fullWidth
          style={styles.registerButton}
        />

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push("/(auth)/register-provider")}
        >
          <Text style={styles.linkText}>Register as Service Provider instead</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLinkText}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>

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

      <Modal
        visible={showCityModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCityModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Service City</Text>
            <FlatList
              data={cities}
              keyExtractor={(item) => item.cityID?.toString() || item.id?.toString() || item.name || item}
              renderItem={({ item }) =>
                renderModalItem(item.name || item, () => {
                  setFormData({ ...formData, service_city: item.name || item });
                  setShowCityModal(false);
                })
              }
              style={styles.modalList}
            />
            <AppButton
              title="Cancel"
              onPress={() => setShowCityModal(false)}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 25, backgroundColor: Colors.surface, alignItems: "center", borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 24, fontWeight: "bold", color: Colors.text.primary },
  subtitle: { fontSize: 14, color: Colors.text.secondary, marginTop: 5 },
  formContainer: { padding: 20, margin: 15, backgroundColor: Colors.surface, borderRadius: 15, elevation: 3 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text.primary, marginBottom: 8 },
  required: { color: Colors.error },
  hintText: { fontSize: 12, color: Colors.text.secondary, marginTop: -10, marginBottom: 15, marginLeft: 5 },
  dropdown: { backgroundColor: Colors.background, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdownPlaceholder: { fontSize: 16, color: Colors.text.secondary },
  dropdownText: { fontSize: 16, color: Colors.text.primary },
  dropdownArrow: { fontSize: 12, color: Colors.text.secondary },
  imagePicker: { width: '100%', height: 150, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  imagePlaceholderText: { marginTop: 8, color: Colors.text.secondary, fontSize: 14 },
  registerButton: { marginTop: 20, marginBottom: 15 },
  linkButton: { padding: 15, alignItems: "center", marginBottom: 10 },
  linkText: { color: Colors.secondary, fontWeight: "600", fontSize: 14 },
  loginLink: { alignItems: "center", marginTop: 10 },
  loginText: { color: Colors.text.secondary },
  loginLinkText: { color: Colors.primary, fontWeight: "600" },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: Colors.text.primary, marginBottom: 20, textAlign: "center" },
  modalList: { maxHeight: 400 },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalItemText: { fontSize: 16, color: Colors.text.primary },
});