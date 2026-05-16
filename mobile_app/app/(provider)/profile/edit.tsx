// app/(provider)/profile/edit.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/app/context/ThemeContext';
import { ThemeColors } from '@/app/constants/Colors';
import { useProviderQueries } from '@/hooks/useProviderQueries';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { api } from '@/app/services/api';
import { API_BASE_URL } from '@/app/config/api';

const ID_PHOTO_TYPES = ['Passport', 'Driver License', 'National ID', 'Kebele ID'];

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const { profile, updateProfile, isLoading } = useProviderQueries();
  
  const [form, setForm] = useState({
    businessName: '',
    bio: '',
    phone: '',
    email: '',
    yearsExperience: '',
    hourlyRate: '',
    service_city: '',
    idPhotoType: '',
  });

  const [cities, setCities] = useState<any[]>([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [pendingPhotoType, setPendingPhotoType] = useState<'idFront' | 'idBack' | null>(null);

  const [idPhotoFront, setIdPhotoFront] = useState<any>(null);
  const [idPhotoFrontUri, setIdPhotoFrontUri] = useState<string | null>(null);
  const [idPhotoBack, setIdPhotoBack] = useState<any>(null);
  const [idPhotoBackUri, setIdPhotoBackUri] = useState<string | null>(null);

  useEffect(() => {
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
    fetchCities();
  }, []);

  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName || profile.fullname || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        email: profile.email || '',
        yearsExperience: String(profile.yearsExperience || ''),
        hourlyRate: String(profile.hourlyRate || ''),
        service_city: profile.service_city || '',
        idPhotoType: profile.idPhotoType || '',
      });
      
      const apiBaseUrl = API_BASE_URL.replace('/api', '');
      if (profile.idPhoto) {
        setIdPhotoFrontUri(profile.idPhoto.startsWith('http') ? profile.idPhoto : `${apiBaseUrl}/${profile.idPhoto}`);
      }
      if (profile.idPhotoBack) {
        setIdPhotoBackUri(profile.idPhotoBack.startsWith('http') ? profile.idPhotoBack : `${apiBaseUrl}/${profile.idPhotoBack}`);
      }
    }
  }, [profile]);

  const openPhotoPicker = (type: 'idFront' | 'idBack') => {
    setPendingPhotoType(type);
    setShowPhotoSourceModal(true);
  };

  const pickImage = async (type: 'idFront' | 'idBack', source: 'camera' | 'gallery') => {
    setShowPhotoSourceModal(false);

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('auth.cameraPermissionTitle', 'Camera Permission Required'),
          t('auth.cameraPermissionMsg', 'Camera access is required to photograph your ID card for verification.')
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 2],
        quality: 0.8,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'id.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1]}` : 'image/jpeg';
        const file = { uri: asset.uri, name: filename, type: mimeType };
        if (type === 'idFront') { setIdPhotoFrontUri(asset.uri); setIdPhotoFront(file); }
        else { setIdPhotoBackUri(asset.uri); setIdPhotoBack(file); }
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('auth.permissionNeeded', 'Permission Needed'), t('auth.cameraRollPermission', 'Please grant camera roll permissions'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        else { setIdPhotoBackUri(asset.uri); setIdPhotoBack(file); }
      }
    }
  };

  const handleSave = async () => {
    if (!form.businessName || !form.phone || !form.service_city || !form.idPhotoType) {
      Alert.alert(t('common.error', 'Error'), t('profile.fillRequired', 'Please fill all required fields (Name, Phone, City, ID Type).'));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('fullname', form.businessName);
      formData.append('bio', form.bio);
      formData.append('phone', form.phone);
      formData.append('email', form.email);
      formData.append('service_city', form.service_city);
      formData.append('idPhotoType', form.idPhotoType);
      
      // Send these so they don't get lost, though they might not be updated by this specific API payload
      if (form.yearsExperience) formData.append('yearsExperience', form.yearsExperience);
      if (form.hourlyRate) formData.append('hourlyRate', form.hourlyRate);

      if (idPhotoFront) formData.append('idPhoto', idPhotoFront as any);
      if (idPhotoBack) formData.append('idPhotoBack', idPhotoBack as any);

      await updateProfile.mutateAsync(formData as any);
      // onSuccess in mutation hook will handle the back navigation or alert
    } catch (error) {
      // onError in mutation hook will handle the error alert
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  const renderModalItem = (item: string | any, onSelect: () => void) => (
    <TouchableOpacity style={styles.modalItem} onPress={onSelect}>
      <Text style={styles.modalItemText}>
        {typeof item === 'string' ? item : item.name || item.cityName || item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.editTitle', 'Edit Profile')}</Text>
          <Text style={styles.subtitle}>
            {t('profile.editSubtitle', 'Update your business information and contact details.')}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.businessNameLabel', 'Business/Full Name *')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('profile.businessNamePlaceholder', 'Your business name')}
              value={form.businessName}
              onChangeText={(text) => setForm({ ...form, businessName: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.bioLabel', 'Professional Bio')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('profile.bioPlaceholder', 'Tell customers about your expertise')}
              multiline
              numberOfLines={4}
              value={form.bio}
              onChangeText={(text) => setForm({ ...form, bio: text })}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>{t('profile.yearsExperienceLabel', 'Experience (Years)')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('profile.years', 'Years')}
                keyboardType="numeric"
                value={form.yearsExperience}
                onChangeText={(text) => setForm({ ...form, yearsExperience: text })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>{t('profile.hourlyRateLabel', 'Hourly Rate (ETB)')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('profile.rate', 'Rate')}
                keyboardType="numeric"
                value={form.hourlyRate}
                onChangeText={(text) => setForm({ ...form, hourlyRate: text })}
              />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('profile.contactInfo', 'Contact Info')}</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.phone', 'Phone Number *')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.phoneNumber', 'Enter phone number')}
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.email', 'Email Address')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.enterEmail', 'Enter email')}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.serviceCity', 'Service City')} *</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowCityModal(true)}>
              <Text style={form.service_city ? styles.dropdownText : styles.dropdownPlaceholder}>{form.service_city || t("auth.selectServiceCity", "Select your service city")}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>


        </View>

        <Text style={styles.sectionTitle}>{t('auth.idDocument', 'ID Document')}</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.idDocumentType', 'ID Document Type')} *</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowIdTypeModal(true)}>
              <Text style={form.idPhotoType ? styles.dropdownText : styles.dropdownPlaceholder}>{form.idPhotoType || t("auth.selectIdType", "Select ID type")}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.uploadContainer}>
            <Text style={styles.label}>
              {t('auth.idCardPhoto', 'ID Card Photos')} *
            </Text>
            <Text style={styles.uploadHint}>{t('auth.idBothSides', 'Upload both the front and back of your ID card')}</Text>

            <View style={styles.idPhotoRow}>
              {/* Front */}
              <TouchableOpacity style={styles.idHalfPicker} onPress={() => openPhotoPicker('idFront')}>
                {idPhotoFrontUri ? (
                  <Image source={{ uri: idPhotoFrontUri }} style={styles.idHalfImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color={colors.primary} />
                    <Text style={styles.imagePlaceholderText}>{t('auth.frontSide', 'Front Side')}</Text>
                    <Text style={styles.imagePlaceholderHint}>{t('auth.tapToCapture', 'Tap to capture')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Back */}
              <TouchableOpacity style={styles.idHalfPicker} onPress={() => openPhotoPicker('idBack')}>
                {idPhotoBackUri ? (
                  <Image source={{ uri: idPhotoBackUri }} style={styles.idHalfImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color={colors.primary} />
                    <Text style={styles.imagePlaceholderText}>{t('auth.backSide', 'Back Side')}</Text>
                    <Text style={styles.imagePlaceholderHint}>{t('auth.tapToCapture', 'Tap to capture')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>{t('profile.saveChanges', 'Save Changes')}</Text>
          <Ionicons name="save-outline" size={20} color={colors.surface} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <Modal visible={showCityModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("auth.selectServiceCityModal", "Select Service City")}</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}><Ionicons name="close" size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            <FlatList data={cities} keyExtractor={(item) => (item.cityID || item.id || Math.random()).toString()} renderItem={({ item }) => renderModalItem(item.name || item, () => { setForm({ ...form, service_city: item.name || item }); setShowCityModal(false); })} />
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCityModal(false)}><Text style={styles.modalCancelText}>{t("common.cancel", "Cancel")}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showIdTypeModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("auth.selectIdTypeModal", "Select ID Type")}</Text>
              <TouchableOpacity onPress={() => setShowIdTypeModal(false)}><Ionicons name="close" size={24} color={colors.text.secondary} /></TouchableOpacity>
            </View>
            <FlatList data={ID_PHOTO_TYPES} keyExtractor={(item) => item} renderItem={({ item }) => renderModalItem(item, () => { setForm({ ...form, idPhotoType: item }); setShowIdTypeModal(false); })} />
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowIdTypeModal(false)}><Text style={styles.modalCancelText}>{t("common.cancel", "Cancel")}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Photo Source Picker */}
      <Modal visible={showPhotoSourceModal} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('auth.selectPhotoSource', 'Select Photo Source')}</Text>
              <TouchableOpacity onPress={() => setShowPhotoSourceModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.photoSourceHint}>{t('auth.chooseIdPhotoSource', 'Choose how to get your ID photo.')}</Text>

            <TouchableOpacity
              style={styles.photoSourceOption}
              onPress={() => pendingPhotoType && pickImage(pendingPhotoType, 'camera')}
            >
              <View style={styles.photoSourceIcon}>
                <Ionicons name="camera" size={28} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.photoSourceLabel}>{t('auth.camera', 'Camera')}</Text>
                <Text style={styles.photoSourceSub}>Take a photo now</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoSourceOption}
              onPress={() => pendingPhotoType && pickImage(pendingPhotoType, 'gallery')}
            >
              <View style={styles.photoSourceIcon}>
                <Ionicons name="images-outline" size={28} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.photoSourceLabel}>{t('auth.gallery', 'Gallery')}</Text>
                <Text style={styles.photoSourceSub}>Choose from photo library</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowPhotoSourceModal(false)}>
              <Text style={styles.modalCancelText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingTop: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text.primary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.text.secondary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 12, marginTop: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 8 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, height: 48, fontSize: 15, color: colors.text.primary },
  textArea: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  dropdown: { backgroundColor: colors.background, paddingHorizontal: 12, height: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dropdownPlaceholder: { color: colors.text.secondary, fontSize: 15 },
  dropdownText: { color: colors.text.primary, fontSize: 15 },
  uploadContainer: { marginBottom: 10 },
  uploadHint: { fontSize: 12, color: colors.text.secondary, marginBottom: 10, marginTop: -4 },
  idPhotoRow: { flexDirection: 'row', gap: 12 },
  idHalfPicker: { flex: 1, height: 120, borderRadius: 10, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', overflow: 'hidden', backgroundColor: colors.background },
  idHalfImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  imagePlaceholderText: { marginTop: 8, color: colors.text.secondary, fontSize: 12, fontWeight: '500' },
  saveButton: { backgroundColor: colors.primary, height: 52, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10 },
  saveButtonText: { color: colors.surface, fontSize: 16, fontWeight: 'bold' },
  cancelButton: { height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: colors.text.secondary, fontSize: 15 },
  modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: colors.text.primary },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemText: { fontSize: 16, color: colors.text.primary },
  modalCancelButton: { marginTop: 20, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: colors.text.primary },
  imagePlaceholderHint: { fontSize: 11, color: colors.text.secondary, marginTop: 2 },
  photoSourceHint: { fontSize: 13, color: colors.text.secondary, marginBottom: 16 },
  photoSourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  photoSourceIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  photoSourceLabel: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  photoSourceSub: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
});
