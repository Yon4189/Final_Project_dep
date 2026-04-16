import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/app/context/ThemeContext';
import { ThemeColors } from '@/app/constants/Colors';
import { API_BASE_URL } from '@/app/config/api';
import { useProviderStore } from '@/app/store/providerStore';
import { useUpdateProfile } from '@/hooks/useProviderQueries';
import { Certification } from '@/app/types/provider.types';
import AppButton from '@/components/AppButton';
import AppInput from '@/components/AppInput';

export default function CertificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const { profile } = useProviderStore();
  const updateProfileMutation = useUpdateProfile();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [certName, setCertName] = useState('');
  const [certImage, setCertImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const certifications: Certification[] = profile?.certifications || [];

  const handleAddCert = () => {
    setEditingCert(null);
    setCertName('');
    setCertImage(null);
    setModalVisible(true);
  };

  const handleEditCert = (cert: Certification) => {
    setEditingCert(cert);
    setCertName(cert.name);
    setCertImage(cert.image ?? null);
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(t('profile.permissionRequired', 'Permission Required'), t('profile.photoLibraryPermission', 'Please allow access to your photo library.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setCertImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!certName.trim()) {
      Alert.alert(t('common.error', 'Error'), t('profile.fillRequired', 'Please enter certification name.'));
      return;
    }

    setIsSubmitting(true);
    try {
      let updatedCerts: Certification[] = [...certifications];
      
      if (editingCert) {
        updatedCerts = updatedCerts.map(c => 
          c.id === editingCert.id ? { ...c, name: certName, image: certImage } : c
        );
      } else {
        updatedCerts.push({
          id: Date.now().toString(),
          name: certName,
          image: certImage
        });
      }

      // In a real app, you'd upload the image first if it's a new URI
      // For now, we'll send it as a JSON string to the backend which handles JSON
      // NOTE: Our backend updateProfile handles file uploads for specific fields, 
      // but for array items like these, a more complex multipart would be needed or 
      // uploading files separately then updating the JSON.
      // To keep it simple and within the current implementation plan, we will 
      // update the JSON fields.
      
      const formData = new FormData();
      formData.append('certifications', JSON.stringify(updatedCerts));

      await updateProfileMutation.mutateAsync(formData);
      setModalVisible(false);
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('profile.updateError', 'Failed to save certification.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t('profile.certificationsTitle', 'Delete Certification'),
      t('profile.deleteCertConfirm', 'Are you sure you want to remove this certification?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('profile.delete', 'Delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedCerts = certifications.filter(c => c.id !== id);
              const formData = new FormData();
              formData.append('certifications', JSON.stringify(updatedCerts));
              await updateProfileMutation.mutateAsync(formData);
            } catch (error) {
              Alert.alert(t('common.error', 'Error'), t('profile.updateError', 'Failed to delete certification.'));
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.certificationsTitle', 'Certifications')}</Text>
        <TouchableOpacity onPress={handleAddCert} style={styles.addButton}>
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {certifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={80} color={colors.border} />
            <Text style={styles.emptyStateTitle}>{t('profile.noCertsTitle', 'No Certifications Yet')}</Text>
            <Text style={styles.emptyStateText}>
              {t('profile.noCertsDesc', 'Add professional certifications, awards, or training certificates to showcase your expertise.')}
            </Text>
            <AppButton 
              title={t('profile.addFirstCert', 'Add Your First Certification')} 
              onPress={handleAddCert}
              style={styles.emptyStateButton}
            />
          </View>
        ) : (
          certifications.map((cert) => (
            <View key={cert.id} style={styles.certCard}>
              <View style={styles.certImageContainer}>
                {cert.image ? (
                  <Image
                    source={{ uri: cert.image.startsWith('http') ? cert.image : `${API_BASE_URL.replace('/api', '')}/${cert.image}` }}
                    style={styles.certImage}
                  />
                ) : (
                  <View style={styles.certPlaceholder}>
                    <Ionicons name="document-text-outline" size={32} color={colors.border} />
                  </View>
                )}
              </View>
              <View style={styles.certInfo}>
                <Text style={styles.certName}>{cert.name}</Text>
                <View style={styles.certActions}>
                  <TouchableOpacity onPress={() => handleEditCert(cert)} style={styles.actionButton}>
                    <Text style={styles.actionText}>{t('profile.edit', 'Edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(cert.id)} style={styles.actionButton}>
                    <Text style={[styles.actionText, { color: colors.error }]}>{t('profile.delete', 'Delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCert ? t('profile.editCertification', 'Edit Certification') : t('profile.addCertification', 'Add Certification')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <AppInput
                label={t('profile.certNameLabel', 'Certification Name')}
                value={certName}
                onChangeText={setCertName}
                placeholder={t('profile.certNamePlaceholder', 'e.g. Certified Professional Handyman')}
                required
              />

              <Text style={styles.label}>{t('profile.certImageLabel', 'Certificate Image (Optional)')}</Text>
              <TouchableOpacity style={styles.imageSelector} onPress={handlePickImage}>
                {certImage ? (
                  <Image source={{ uri: certImage }} style={styles.selectedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={32} color={colors.text.secondary} />
                    <Text style={styles.imagePlaceholderText}>{t('profile.clickToUpload', 'Click to upload photo')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <AppButton 
                title={t('common.cancel', 'Cancel')} 
                onPress={() => setModalVisible(false)} 
                variant="outline"
                style={styles.footerButton}
              />
              <AppButton 
                title={t('profile.saveChanges', 'Save Changes')} 
                onPress={handleSave} 
                loading={isSubmitting}
                style={styles.footerButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 100, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, justifyContent: 'space-between' },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
  addButton: { padding: 4 },
  scrollContent: { padding: 20, flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary, marginTop: 20, marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22, marginBottom: 30 },
  emptyStateButton: { width: '100%' },
  certCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: colors.border },
  certImageContainer: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.background },
  certImage: { width: '100%', height: '100%' },
  certPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  certInfo: { flex: 1, marginLeft: 16 },
  certName: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: 8 },
  certActions: { flexDirection: 'row', gap: 16 },
  actionButton: { paddingVertical: 4 },
  actionText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  modalBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8, marginTop: 10 },
  imageSelector: { width: '100%', height: 180, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 20 },
  selectedImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { fontSize: 14, color: colors.text.secondary, marginTop: 8 },
  modalFooter: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  footerButton: { flex: 1 },
});
