// app/(auth)/register-customer.tsx
import { Platform } from 'react-native';
import { api } from "../services/api";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useMemo } from "react";
import * as ImagePicker from 'expo-image-picker';
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
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { ThemeColors } from "../constants/Colors";
import { LOCATIONS } from "../constants/Services";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "../context/ThemeContext";

// Define City interface
interface City {
  id: number;
  name: string;
  cityID?: number;
}

export default function RegisterCustomerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    location: "",
    password: "",
    password_confirmation: "",
    profilePicture: null as any,
  });

  const [loading, setLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    setCitiesLoading(true);
    try {
      const resp = await api.get<any>('/cities');
      if (resp.success && resp.data) {
        let citiesData = [];
        if (Array.isArray(resp.data)) {
          citiesData = resp.data;
        } else if (resp.data.data && Array.isArray(resp.data.data)) {
          citiesData = resp.data.data;
        } else if (typeof resp.data === 'object' && resp.data !== null) {
          citiesData = Object.values(resp.data).filter(item =>
            typeof item === 'object' && item !== null
          );
        }
        setCities(citiesData as City[]);
      }
    } catch (err) {
      console.log('Error fetching cities:', err);
    } finally {
      setCitiesLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('auth.permissionNeeded', 'Permission needed'), t('auth.cameraRollPermission', 'Please grant camera roll permissions'));
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
      const filename = asset.uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      setFormData({
        ...formData,
        profilePicture: { uri: asset.uri, name: filename, type }
      });
      setValidationErrors(prev => ({ ...prev, profilePicture: '' }));
    }
  };

  const validatePhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return {
      isValid: /^(09|07)[0-9]{8}$/.test(cleaned),
      cleaned: cleaned
    };
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.fullname.trim()) errors.fullname = t("validation.fullNameRequired", "Full name is required");
    if (!formData.email.trim()) errors.email = t("validation.emailRequired", "Email is required");
    if (!formData.phone.trim()) {
      errors.phone = t("validation.phoneRequired", "Phone number is required");
    } else {
      const { isValid } = validatePhoneNumber(formData.phone);
      if (!isValid) errors.phone = t("validation.invalidPhone", "Invalid Ethiopian phone format");
    }
    if (!formData.location) errors.location = t("validation.locationRequired", "Location is required");
    if (!formData.password) errors.password = t("validation.passwordRequired", "Password is required");
    if (formData.password !== formData.password_confirmation) errors.password_confirmation = t("validation.passwordsDoNotMatch", "Passwords do not match");
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    const { cleaned: cleanedPhone } = validatePhoneNumber(formData.phone);
    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('fullname', formData.fullname.trim());
      formDataToSend.append('email', formData.email.trim().toLowerCase());
      formDataToSend.append('phone', cleanedPhone);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('password_confirmation', formData.password_confirmation);
      formDataToSend.append('location', formData.location);

      if (formData.profilePicture?.uri) {
        formDataToSend.append('profilePicture', formData.profilePicture as any);
      }

      const response = await api.post<any>('/customer/register', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response?.success || response?.status === 'success') {
        router.replace("/login");
      } else {
        Alert.alert(t("auth.registrationFailed", "Registration Failed"), response?.message || t("auth.somethingWentWrong", "Something went wrong."));
      }
    } catch (err: any) {
      Alert.alert(t("auth.registrationError", "Registration Error"), err.message || t("auth.failedToRegister", "Failed to register."));
    } finally {
      setLoading(false);
    }
  };

  const renderModalItem = (item: string | any, onSelect: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onSelect}>
      <Text style={styles.modalItemText}>
        {typeof item === 'string' ? item : item.name || item.cityName || ""}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("auth.createCustomerAccount", "Create Customer Account")}</Text>
          <Text style={styles.subtitle}>{t("auth.joinKeywords", "Join thousands of satisfied customers")}</Text>
        </View>

        <View style={styles.formContainer}>
          <AppInput label={t("auth.fullName", "Full Name")} value={formData.fullname} onChangeText={(t) => setFormData({ ...formData, fullname: t })} placeholder={t("auth.enterFullName", "Enter your full name")} required error={validationErrors.fullname} />
          <AppInput label={t("auth.email", "Email")} value={formData.email} onChangeText={(t) => setFormData({ ...formData, email: t })} placeholder={t("auth.enterEmail", "Enter your email")} keyboardType="email-address" autoCapitalize="none" required error={validationErrors.email} />
          <AppInput label={t("auth.phoneNumber", "Phone Number")} value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t.replace(/[^0-9]/g, '') })} placeholder="0912345678" keyboardType="phone-pad" maxLength={10} required error={validationErrors.phone} />
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("auth.yourLocation", "Your Location")} <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={[styles.dropdown, validationErrors.location && styles.dropdownError]} onPress={() => setShowLocationModal(true)}>
              <Text style={formData.location ? styles.dropdownText : styles.dropdownPlaceholder}>{formData.location || t("auth.selectLocation", "Select your current location")}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
            {validationErrors.location && <Text style={styles.errorText}>{validationErrors.location}</Text>}
          </View>

          <AppInput label={t("auth.password", "Password")} value={formData.password} onChangeText={(t) => setFormData({ ...formData, password: t })} placeholder={t("auth.minCharacters", "Minimum 8 characters")} secureTextEntry showPasswordToggle required error={validationErrors.password} />
          <AppInput label={t("auth.confirmPassword", "Confirm Password")} value={formData.password_confirmation} onChangeText={(t) => setFormData({ ...formData, password_confirmation: t })} placeholder={t("auth.reenterPassword", "Re-enter your password")} secureTextEntry showPasswordToggle required error={validationErrors.password_confirmation} />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("auth.profilePictureOptional", "Profile Picture (Optional)")}</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? <Image source={{ uri: imageUri }} style={styles.profileImage} /> : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={40} color={colors.text.secondary} />
                  <Text style={styles.imagePlaceholderText}>{t("auth.tapToUpload", "Tap to upload photo")}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <AppButton title={t("auth.createAccount", "Create Account")} onPress={handleRegister} loading={loading} fullWidth style={styles.registerButton} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} /><Text style={styles.dividerText}>{t("auth.or", "OR")}</Text><View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/register-provider")}>
            <Text style={styles.linkText}>{t("auth.wantToOfferServices", "Want to offer services?")} <Text style={styles.linkHighlight}>{t("auth.registerAsProvider", "Register as Provider")}</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.push("/login")}>
            <Text style={styles.loginText}>{t("auth.alreadyHaveAccount", "Already have an account?")} <Text style={styles.loginLinkText}>{t("auth.signIn", "Sign In")}</Text></Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showLocationModal} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("auth.selectYourLocation", "Select Your Location")}</Text>
                <TouchableOpacity onPress={() => setShowLocationModal(false)}><Ionicons name="close" size={24} color={colors.text.secondary} /></TouchableOpacity>
              </View>
              <FlatList
                data={LOCATIONS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => renderModalItem(item, () => {
                  setFormData({ ...formData, location: item });
                  setShowLocationModal(false);
                })}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: { padding: 30, backgroundColor: colors.primary, alignItems: "center", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  title: { fontSize: 28, fontWeight: "bold", color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  formContainer: { padding: 20, marginTop: -20, marginHorizontal: 15, backgroundColor: colors.surface, borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text.primary, marginBottom: 8 },
  required: { color: colors.error },
  dropdown: { backgroundColor: colors.background, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdownError: { borderColor: colors.error },
  dropdownPlaceholder: { fontSize: 16, color: colors.text.secondary },
  dropdownText: { fontSize: 16, color: colors.text.primary },
  errorText: { fontSize: 12, color: colors.error, marginTop: 4, marginLeft: 5 },
  imagePicker: { width: '100%', height: 150, borderRadius: 10, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', overflow: 'hidden', backgroundColor: colors.background },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  imagePlaceholderText: { marginTop: 8, color: colors.text.secondary, fontSize: 14, fontWeight: '500' },
  registerButton: { marginTop: 20, marginBottom: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 10, color: colors.text.secondary, fontSize: 14 },
  linkButton: { padding: 15, alignItems: "center", marginBottom: 10, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  linkText: { color: colors.text.secondary, fontWeight: "500", fontSize: 14 },
  linkHighlight: { color: colors.primary, fontWeight: "600" },
  loginLink: { alignItems: "center", marginTop: 10, marginBottom: 20 },
  loginText: { color: colors.text.secondary, fontSize: 14 },
  loginLinkText: { color: colors.primary, fontWeight: "600" },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: colors.text.primary },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemText: { fontSize: 16, color: colors.text.primary },
});