// app/(auth)/register-provider.tsx
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
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
import { ThemeColors } from '../constants/Colors';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { launchGoogleOAuth } from '../services/googleAuth.service';

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

// ─── Component ────────────────────────────────────────────────────────────────
export default function RegisterProviderScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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

  // ID Card — front and back are both required
  const [idPhotoFront, setIdPhotoFront] = useState<any>(null);
  const [idPhotoFrontUri, setIdPhotoFrontUri] = useState<string | null>(null);
  const [idPhotoBack, setIdPhotoBack] = useState<any>(null);
  const [idPhotoBackUri, setIdPhotoBackUri] = useState<string | null>(null);

  // Certificates / work documents — optional, multiple
  const [certificates, setCertificates] = useState<{ file: any; uri: string; name: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
    try {
      const resp = await api.get<any>('/cities');
      if (resp.success && resp.data) {
        setCities(Array.isArray(resp.data) ? resp.data : []);
      }
    } catch (err) {
      console.log('Error fetching cities:', err);
    }
  };

  const fetchServiceCategories = async () => {
    setLoadingCategories(true);
    setCategoriesError(null);

    try {
      const resp = await api.get<any>('/categories');
      if (resp.success && resp.data) {
        let categoriesData = [];
        if (Array.isArray(resp.data)) {
          categoriesData = resp.data;
        } else if (resp.data.data && Array.isArray(resp.data.data)) {
          categoriesData = resp.data.data;
        } else {
          categoriesData = Object.values(resp.data).filter(item =>
            typeof item === 'object' && item !== null
          );
        }
        setServiceCategories(categoriesData);
      } else {
        setCategoriesError('No categories found');
        setServiceCategories([]);
      }
    } catch (err: any) {
      setCategoriesError(err.message || t('auth.categoryLoadError', 'Failed to load categories'));
      setServiceCategories([]);
      Alert.alert(t('common.warning', 'Warning'), t('auth.categoryLoadError', 'Could not load categories. Please try again later.'));
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { accessToken, userInfo, error } = await launchGoogleOAuth();
      if (error === 'cancelled') return;
      if (error || !accessToken) {
        Alert.alert('Error', error || 'Google sign-in failed.');
        return;
      }
      // Pre-fill name and email from Google
      setFormData(prev => ({
        ...prev,
        fullname: userInfo?.name || prev.fullname,
        email: userInfo?.email || prev.email,
      }));
      Alert.alert(
        t('auth.googleLinked', 'Google Account Linked!'),
        t('auth.googleProviderPrompt', 'Your info has been pre-filled from Google. Please complete the remaining fields (phone, city, services, ID) to finish registration.'),
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
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
      Alert.alert(t('common.info', 'Info'), t('auth.minOneService', 'You need at least one service offering.'));
    }
  };

  const updateServiceOffering = (index: number, field: keyof ServiceOffering, value: string) => {
    setServiceOfferings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'categoryId') {
        const category = serviceCategories.find(c => String(c.catagoryID) === String(value) || String((c as any).id) === String(value));
        if (category) updated[index].categoryName = category.name;
      }
      return updated;
    });
  };

  const pickImage = async (type: 'profile' | 'idFront' | 'idBack') => {
    if (type === 'profile') {
      // Profile picture: let user choose camera or gallery
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('auth.permissionNeeded', 'Permission needed'), t('auth.cameraRollPermission', 'Please grant camera roll permissions'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1]}` : 'image/jpeg';
        setProfilePictureUri(asset.uri);
        setProfilePicture({ uri: asset.uri, name: filename, type: mimeType });
      }
    } else {
      // ID card front/back: camera only for security
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('auth.cameraPermissionTitle', 'Camera Permission Required'),
          t('auth.cameraPermissionMsg', 'Camera access is required to photograph your ID card for verification.')
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 2],
        quality: 0.7,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'id.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1]}` : 'image/jpeg';
        const file = { uri: asset.uri, name: filename, type: mimeType };
        if (type === 'idFront') { setIdPhotoFrontUri(asset.uri); setIdPhotoFront(file); }
        else if (type === 'idBack') { setIdPhotoBackUri(asset.uri); setIdPhotoBack(file); }
      }
    }
  };

  const pickCertificate = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('auth.permissionNeeded', 'Permission needed'), t('auth.cameraRollPermission', 'Please grant camera roll permissions'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() || 'certificate.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : 'image/jpeg';
      const file = { uri: asset.uri, name: filename, type: mimeType };
      setCertificates(prev => [...prev, { file, uri: asset.uri, name: filename }]);
    }
  };

  const removeCertificate = (index: number) => {
    setCertificates(prev => prev.filter((_, i) => i !== index));
  };

  const registerProvider = async () => {
    if (!formData.fullname || !formData.email || !formData.phone || !formData.service_city || !formData.idPhotoType) {
      Alert.alert(t('common.error', 'Error'), t('auth.fillRequiredFields', 'Please fill all required fields.'));
      return;
    }
    if (!idPhotoFront) {
      Alert.alert(t('common.error', 'Error'), t('auth.uploadIdFront', 'Please upload the front side of your ID card.'));
      return;
    }
    if (!idPhotoBack) {
      Alert.alert(t('common.error', 'Error'), t('auth.uploadIdBack', 'Please upload the back side of your ID card.'));
      return;
    }

    // Client-side validation
    const phoneRegex = /^(09|07)[0-9]{8}$/;
    if (!phoneRegex.test(formData.phone)) {
      Alert.alert(t('auth.invalidPhoneTitle', 'Invalid Phone'), t('validation.invalidPhone', 'Phone number must start with 09 or 07 and be 10 digits long.'));
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      Alert.alert(t('auth.weakPassword', 'Weak Password'), t('auth.weakPasswordInstruction', 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.'));
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      Alert.alert(t('auth.passwordMismatch', 'Password Mismatch'), t('validation.passwordsDoNotMatch', 'Passwords do not match.'));
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, val]) => data.append(key, val));
      
      // Ensure catagoryID is sent at the root level (Backend requirement)
      if (serviceOfferings.length > 0 && serviceOfferings[0].categoryId) {
        data.append('catagoryID', serviceOfferings[0].categoryId);
      }

      const servicesToSend = serviceOfferings.map(s => ({
        categoryId: s.categoryId,
        serviceName: s.serviceName,
        basePrice: parseFloat(s.basePrice),
        description: s.description || ''
      }));
      data.append('services', JSON.stringify(servicesToSend));
      
      if (profilePicture) data.append('profilePicture', profilePicture as any);
      
      // Map front ID to 'idPhoto' (Required by backend)
      if (idPhotoFront) data.append('idPhoto', idPhotoFront as any);
      
      // Map back ID to 'idPhotoBack' (Required by backend)
      if (idPhotoBack) data.append('idPhotoBack', idPhotoBack as any);
      
      // Append certificates (optional)
      certificates.forEach((cert, index) => {
        data.append(`certificates[${index}]`, cert.file as any);
      });

      const response = await api.post<any>('/provider/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.success || response.status === 'success') {
        router.replace('/login');
      } else {
        setRegistrationSuccess(true);
      }
    } catch (err: any) {
      console.log('Registration Error Details:', err);
      
      // Better error message extraction for validation failures
      let errorMessage = err.message || "Failed to register.";
      
      if (err.errors) {
        const firstErrorKey = Object.keys(err.errors)[0];
        const firstErrorMessages = err.errors[firstErrorKey];
        if (Array.isArray(firstErrorMessages) && firstErrorMessages.length > 0) {
          errorMessage = firstErrorMessages[0];
        }
      }
      
      Alert.alert(t('auth.registrationError', 'Registration Error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        <Text style={styles.successTitle}>{t("auth.registrationSubmitted", "Registration Submitted!")}</Text>
        <Text style={styles.successSubtitle}>
          {t("auth.applicationUnderReview", "Your application is under review. We'll notify you once your account is verified.")}
        </Text>
        <AppButton
          title={t("auth.goToLogin", "Go to Login")}
          onPress={() => router.replace('/login')}
          fullWidth
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  const renderModalItem = (item: string | any, onSelect: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onSelect}>
      <Text style={styles.modalItemText}>
        {typeof item === 'string' ? item : item.name || item.cityName || item}
      </Text>
    </TouchableOpacity>
  );

  const renderServiceCategoryModal = (index: number) => (
    <Modal visible={showServiceCategoryModal === index} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("auth.chooseServiceCategory", "Choose Service Category")}</Text>
            <TouchableOpacity onPress={() => setShowServiceCategoryModal(null)}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          {loadingCategories ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ margin: 40 }} />
          ) : (
            <FlatList
              data={serviceCategories}
              keyExtractor={(item) => item.catagoryID?.toString() || Math.random().toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    updateServiceOffering(index, 'categoryId', (item.catagoryID || (item as any).id).toString());
                    updateServiceOffering(index, 'categoryName', item.name);
                    setShowServiceCategoryModal(null);
                  }}
                >
                  <View style={styles.categoryItem}>
                    {item.icon && <Text style={styles.categoryIcon}>{item.icon}</Text>}
                    <Text style={styles.modalItemText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
          <AppButton title={t("common.cancel", "Cancel")} onPress={() => setShowServiceCategoryModal(null)} variant="outline" style={{ marginTop: 10 }} />
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{t("auth.providerRegistration", "Provider Registration")}</Text>
          <Text style={styles.subtitle}>{t("auth.joinAsProvider", "Join as a service provider")}</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.uploadContainer}>
            <Text style={styles.label}>{t("auth.profilePicture", "Profile Picture")} <Text style={styles.optional}>{t("auth.optional", "(Optional)")}</Text></Text>
            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('profile')}>
              {profilePictureUri ? <Image source={{ uri: profilePictureUri }} style={styles.profileImage} /> : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={40} color={colors.text.secondary} />
                  <Text style={styles.imagePlaceholderText}>{t("auth.uploadPhoto", "Upload Photo")}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <AppInput label={t("auth.fullName", "Full Name")} value={formData.fullname} onChangeText={(t) => setFormData({ ...formData, fullname: t })} placeholder={t("auth.fullNamePlaceholder", "John Doe")} required />
          <AppInput label={t("auth.email", "Email")} value={formData.email} onChangeText={(t) => setFormData({ ...formData, email: t })} placeholder={t("login.emailPlaceholder", "email@example.com")} autoCapitalize="none" keyboardType="email-address" required />

          {/* Google Pre-fill — placed right after email */}
          <View style={styles.googleDivider}>
            <View style={styles.googleDividerLine} />
            <Text style={styles.googleDividerText}>{t('auth.orContinueWith', 'or continue with')}</Text>
            <View style={styles.googleDividerLine} />
          </View>
          <TouchableOpacity
            style={[styles.googleButton, (loading || googleLoading) && { opacity: 0.6 }]}
            onPress={handleGoogleSignIn}
            disabled={loading || googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#DB4437" />
            ) : (
              <Ionicons name="logo-google" size={20} color="#DB4437" />
            )}
            <Text style={styles.googleButtonText}>
              {googleLoading ? t('login.signingIn', 'Please wait...') : t('auth.continueWithGoogle', 'Continue with Google')}
            </Text>
          </TouchableOpacity>

          <AppInput label={t("auth.phoneNumber", "Phone Number")} value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t.replace(/[^0-9]/g, '') })} placeholder="0912345678" keyboardType="phone-pad" maxLength={10} required />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("auth.serviceCity", "Service City")} <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowCityModal(true)}>
              <Text style={formData.service_city ? styles.dropdownText : styles.dropdownPlaceholder}>{formData.service_city || t("auth.selectServiceCity", "Select your service city")}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.servicesSection}>
            <Text style={styles.sectionTitle}>{t("auth.servicesYouOffer", "Services You Offer")} <Text style={styles.required}>*</Text></Text>
            {serviceOfferings.map((offering, index) => (
              <View key={index} style={styles.serviceCard}>
                <View style={styles.serviceCardHeader}>
                  <Text style={styles.serviceCardTitle}>{t("auth.serviceLabel", "Service #")}{index + 1}</Text>
                  {serviceOfferings.length > 1 && <TouchableOpacity onPress={() => removeServiceOffering(index)}><Ionicons name="close-circle" size={24} color={colors.error} /></TouchableOpacity>}
                </View>
                <TouchableOpacity style={styles.dropdown} onPress={() => setShowServiceCategoryModal(index)}>
                  <Text style={offering.categoryId ? styles.dropdownText : styles.dropdownPlaceholder}>{offering.categoryName || t("auth.selectCategory", "Select a category")}</Text>
                  <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
                <AppInput label={t("auth.serviceName", "Service Name")} value={offering.serviceName} onChangeText={(t) => updateServiceOffering(index, 'serviceName', t)} placeholder={t("auth.egPlumbing", "e.g., Plumbing")} required />
                <AppInput label={t("auth.serviceDescription", "Service Description")} value={offering.description} onChangeText={(t) => updateServiceOffering(index, 'description', t)} placeholder={t("auth.serviceDescPlaceholder", "Briefly describe the service")} multiline />
                <AppInput label={t("auth.basePrice", "Base Price (ETB)")} value={offering.basePrice} onChangeText={(t) => updateServiceOffering(index, 'basePrice', t.replace(/[^0-9]/g, ''))} placeholder="1000" keyboardType="numeric" required />
              </View>
            ))}
            <TouchableOpacity style={styles.addServiceButton} onPress={addServiceOffering}>
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.addServiceText}>{t("auth.addAnotherService", "Add Another Service")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("auth.idDocumentType", "ID Document Type")} <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowIdTypeModal(true)}>
              <Text style={formData.idPhotoType ? styles.dropdownText : styles.dropdownPlaceholder}>{formData.idPhotoType || t("auth.selectIdType", "Select ID type")}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* ID Card — Front & Back (required) */}
          <View style={styles.uploadContainer}>
            <Text style={styles.label}>
              {t('auth.idCardPhoto', 'ID Card Photos')} <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.uploadHint}>{t('auth.idBothSides', 'Upload both the front and back of your ID card')}</Text>

            <View style={styles.idPhotoRow}>
              {/* Front */}
              <TouchableOpacity style={styles.idHalfPicker} onPress={() => pickImage('idFront')}>
                {idPhotoFrontUri ? (
                  <Image source={{ uri: idPhotoFrontUri }} style={styles.idHalfImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color={colors.primary} />
                    <Text style={styles.imagePlaceholderText}>{t('auth.frontSide', 'Front Side')}</Text>
                    <Text style={styles.uploadHint}>{t('auth.tapToCapture', 'Tap to take photo')}</Text>
                  </View>
                )}
                {idPhotoFrontUri && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Back */}
              <TouchableOpacity style={styles.idHalfPicker} onPress={() => pickImage('idBack')}>
                {idPhotoBackUri ? (
                  <Image source={{ uri: idPhotoBackUri }} style={styles.idHalfImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color={colors.primary} />
                    <Text style={styles.imagePlaceholderText}>{t('auth.backSide', 'Back Side')}</Text>
                    <Text style={styles.uploadHint}>{t('auth.tapToCapture', 'Tap to take photo')}</Text>
                  </View>
                )}
                {idPhotoBackUri && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Certificates & Documents — optional */}
          <View style={styles.uploadContainer}>
            <Text style={styles.label}>
              {t('auth.certificates', 'Certificates & Work Documents')}{' '}
              <Text style={styles.optional}>{t('auth.optional', '(Optional)')}</Text>
            </Text>
            <Text style={styles.uploadHint}>
              {t('auth.certificatesHint', 'Upload any relevant certifications, licenses, or work documents')}
            </Text>

            {/* Uploaded certificates list */}
            {certificates.map((cert, index) => (
              <View key={index} style={styles.certItem}>
                <Image source={{ uri: cert.uri }} style={styles.certThumb} />
                <Text style={styles.certName} numberOfLines={1}>{cert.name}</Text>
                <TouchableOpacity onPress={() => removeCertificate(index)} style={styles.certRemove}>
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addCertButton} onPress={pickCertificate}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.addCertText}>
                {certificates.length === 0
                  ? t('auth.addCertificate', 'Add Certificate or Document')
                  : t('auth.addAnother', 'Add Another')}
              </Text>
            </TouchableOpacity>
          </View>

          <AppInput label={t("auth.password", "Password")} value={formData.password} onChangeText={(t) => setFormData({ ...formData, password: t })} secureTextEntry showPasswordToggle={true} placeholder={t("auth.minCharacters", "Minimum 8 characters")} required />
          <AppInput label={t("auth.confirmPassword", "Confirm Password")} value={formData.password_confirmation} onChangeText={(t) => setFormData({ ...formData, password_confirmation: t })} secureTextEntry showPasswordToggle={true} placeholder={t("auth.reenterPasswordPlaceholder", "Re-enter password")} required />

          <AppButton title={t("auth.registerAsProviderBtn", "Register as Provider")} onPress={registerProvider} loading={loading} disabled={loading} fullWidth style={{ marginTop: 12 }} />

          <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/login')}>
            <Text style={styles.loginText}>{t("auth.alreadyHaveAccount", "Already have an account?")} <Text style={styles.loginLinkText}>{t("auth.signIn", "Sign In")}</Text></Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showIdTypeModal} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("auth.selectIdTypeModal", "Select ID Type")}</Text>
                <TouchableOpacity onPress={() => setShowIdTypeModal(false)}><Ionicons name="close" size={24} color={colors.text.secondary} /></TouchableOpacity>
              </View>
              <FlatList data={ID_PHOTO_TYPES} keyExtractor={(item) => item} renderItem={({ item }) => renderModalItem(item, () => { setFormData({ ...formData, idPhotoType: item }); setShowIdTypeModal(false); })} />
              <AppButton title={t("common.cancel", "Cancel")} onPress={() => setShowIdTypeModal(false)} variant="outline" style={{ marginTop: 10 }} />
            </View>
          </View>
        </Modal>

        <Modal visible={showCityModal} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("auth.selectServiceCityModal", "Select Service City")}</Text>
                <TouchableOpacity onPress={() => setShowCityModal(false)}><Ionicons name="close" size={24} color={colors.text.secondary} /></TouchableOpacity>
              </View>
              <FlatList data={cities} keyExtractor={(item) => (item.cityID || item.id || Math.random()).toString()} renderItem={({ item }) => renderModalItem(item.name || item, () => { setFormData({ ...formData, service_city: item.name || item }); setShowCityModal(false); })} />
              <AppButton title={t("common.cancel", "Cancel")} onPress={() => setShowCityModal(false)} variant="outline" style={{ marginTop: 10 }} />
            </View>
          </View>
        </Modal>

        {serviceOfferings.map((_, index) => renderServiceCategoryModal(index))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text.primary, marginTop: 20, textAlign: 'center' },
  successSubtitle: { fontSize: 16, color: colors.text.secondary, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 },
  header: { padding: 30, backgroundColor: colors.surface, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text.primary },
  subtitle: { fontSize: 16, color: colors.text.secondary, marginTop: 4 },
  formContainer: { padding: 20, margin: 15, backgroundColor: colors.surface, borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8 },
  required: { color: colors.error },
  optional: { color: colors.text.secondary, fontSize: 12, fontWeight: '400' },
  dropdown: { backgroundColor: colors.background, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  dropdownPlaceholder: { color: colors.text.secondary },
  dropdownText: { color: colors.text.primary, fontSize: 16 },
  uploadContainer: { marginBottom: 20 },
  imagePicker: { width: '100%', height: 150, borderRadius: 10, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', overflow: 'hidden', backgroundColor: colors.background },
  idImagePicker: { width: '100%', height: 200, borderRadius: 10, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', overflow: 'hidden', backgroundColor: colors.background },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  idImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  imagePlaceholderText: { marginTop: 8, color: colors.text.secondary, fontSize: 14, fontWeight: '500' },
  uploadHint: { fontSize: 12, color: colors.text.secondary, marginBottom: 10, marginTop: -4 },
  idPhotoRow: { flexDirection: 'row' as const, gap: 12 },
  idHalfPicker: {
    flex: 1,
    height: 150,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed' as const,
    overflow: 'hidden' as const,
    backgroundColor: colors.background,
    position: 'relative' as const,
  },
  idHalfImage: { width: '100%', height: '100%', resizeMode: 'cover' as const },
  checkBadge: {
    position: 'absolute' as const,
    bottom: 6,
    right: 6,
    backgroundColor: colors.surface,
    borderRadius: 11,
  },
  certItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  certThumb: { width: 48, height: 48, borderRadius: 6, resizeMode: 'cover' as const },
  certName: { flex: 1, marginHorizontal: 10, fontSize: 13, color: colors.text.primary },
  certRemove: { padding: 4 },
  addCertButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed' as const,
    marginTop: 8,
    backgroundColor: colors.background,
  },
  addCertText: { color: colors.primary, fontSize: 14, fontWeight: '600' as const },
  servicesSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 12 },
  serviceCard: { backgroundColor: colors.background, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  serviceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  serviceCardTitle: { fontSize: 16, fontWeight: '600', color: colors.primary },
  addServiceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed', marginTop: 8, backgroundColor: colors.background },
  addServiceText: { color: colors.primary, fontSize: 16, fontWeight: '600', marginLeft: 8 },
  loginLink: { alignItems: "center", marginTop: 20 },
  loginText: { color: colors.text.secondary, fontSize: 14 },
  loginLinkText: { color: colors.primary, fontWeight: "600" },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: colors.text.primary },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemText: { fontSize: 16, color: colors.text.primary },
  categoryItem: { flexDirection: 'row', alignItems: 'center' },
  categoryIcon: { fontSize: 20, marginRight: 10 },
  categoryDescription: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.text.secondary, fontSize: 14 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, color: colors.text.secondary, fontSize: 16 },
  errorText: { marginTop: 12, color: colors.error, fontSize: 14, textAlign: 'center' },
  retryButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  googleButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#DB4437',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.surface,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#DB4437',
  },
  googleDivider: { flexDirection: 'row' as const, alignItems: 'center' as const, marginVertical: 12 },
  googleDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  googleDividerText: { marginHorizontal: 10, color: colors.text.secondary, fontSize: 13 },
});