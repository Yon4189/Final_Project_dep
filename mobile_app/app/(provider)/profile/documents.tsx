import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/app/constants/Colors';
import { API_BASE_URL } from '@/app/config/api';
import { useProviderStore } from '@/app/store/providerStore';
import { useUpdateProfile } from '@/hooks/useProviderQueries';
import { Certification } from '@/app/types/provider.types';
import AppButton from '@/components/AppButton';
import AppInput from '@/components/AppInput';
import { Modal, TextInput } from 'react-native';

export default function DocumentsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile } = useProviderStore();
  const updateProfileMutation = useUpdateProfile();
  
  const [uploading, setUploading] = useState<string | null>(null);
  
  // Certification management state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [certName, setCertName] = useState('');
  const [certImage, setCertImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const certifications: Certification[] = profile?.certifications || [];

  const handlePickDocument = async (type: 'business_license' | 'insurance_certificate') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(t('profile.permissionRequired', 'Permission Required'), t('profile.photoLibraryPermission', 'Please allow access to your photo library to upload documents.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadFile(result.assets[0].uri, type);
    }
  };

  const uploadFile = async (uri: string, type: string) => {
    setUploading(type);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'document.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : `image`;

      formData.append(type, {
        uri,
        name: filename,
        type: fileType,
      } as any);

      await updateProfileMutation.mutateAsync(formData);
      Alert.alert(t('common.success', 'Success'), t('profile.docUploaded', 'Document uploaded successfully.'));
    } catch (error: any) {
      console.error('Upload error detail:', error);
      const serverMessage = error.responseData?.message || error.message;
      Alert.alert(t('profile.uploadFailed', 'Upload Failed'), `${t('common.error', 'Error')}: ${serverMessage}. ${t('profile.uploadFailedAdvice', 'Please check if the file is an image or PDF and under 4MB.')}`);
    } finally {
      setUploading(null);
    }
  };

  // Certification handlers
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

  const handlePickCertImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
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

  const handleSaveCert = async () => {
    if (!certName.trim()) {
      Alert.alert(t('common.error', 'Error'), t('profile.fillRequired', 'Please enter certification name.'));
      return;
    }
    setIsSubmitting(true);
    try {
      let updatedCerts: Certification[] = [...certifications];
      if (editingCert) {
        updatedCerts = updatedCerts.map(c => c.id === editingCert.id ? { ...c, name: certName, image: certImage } : c);
      } else {
        updatedCerts.push({ id: Date.now().toString(), name: certName, image: certImage });
      }
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

  const handleDeleteCert = (id: string) => {
    Alert.alert(
      t('profile.certificationsTitle', 'Delete Certification'),
      t('profile.deleteCertConfirm', 'Are you sure you want to remove this certification?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('profile.delete', 'Delete'), style: 'destructive', onPress: async () => {
          try {
            const updatedCerts = certifications.filter(c => c.id !== id);
            const formData = new FormData();
            formData.append('certifications', JSON.stringify(updatedCerts));
            await updateProfileMutation.mutateAsync(formData);
          } catch (error) {
            Alert.alert(t('common.error', 'Error'), t('profile.updateError', 'Failed to delete certification.'));
          }
        }}
      ]
    );
  };

  const renderDocCard = (
    title: string, 
    type: 'business_license' | 'insurance_certificate', 
    description: string,
    icon: keyof typeof Ionicons.glyphMap
  ) => {
    const isUploaded = !!profile?.[type];
    const isUploading = uploading === type;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: isUploaded ? Colors.success + '20' : Colors.primary + '20' }]}>
            <Ionicons name={icon} size={24} color={isUploaded ? Colors.success : Colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardStatus}>
              {isUploaded ? t('profile.uploaded', 'Uploaded') : t('profile.actionRequired', 'Action Required')}
            </Text>
          </View>
          {isUploaded && (
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          )}
        </View>

        <Text style={styles.cardDescription}>{description}</Text>

        {isUploaded && profile?.[type] && (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: `${API_BASE_URL.replace('/api', '')}/${profile[type]}` }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          </View>
        )}

        <TouchableOpacity 
          style={[styles.uploadButton, isUploaded && styles.uploadButtonSecondary]}
          onPress={() => handlePickDocument(type)}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color={Colors.surface} size="small" />
          ) : (
            <>
              <Ionicons 
                name={isUploaded ? "refresh-outline" : "cloud-upload-outline"} 
                size={20} 
                color={isUploaded ? Colors.primary : Colors.surface} 
              />
              <Text style={[styles.uploadButtonText, isUploaded && styles.uploadButtonTextSecondary]}>
                {isUploaded ? t('profile.updateDoc', 'Update Document') : t('profile.uploadDoc', 'Upload Document')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.docsAndCertsTitle', 'Documents & Certifications')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('auth.certificates', 'Certificates & Work Documents')}</Text>
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            {t('auth.certificatesHint', 'Upload any relevant certifications, licenses, or work documents')}
          </Text>
        </View>

        {/* Display specific documents if they exist, but as part of the list */}
        {profile?.business_license && (
          <View style={styles.certCard}>
            <View style={styles.certIconContainer}>
              <Image 
                source={{ uri: `${API_BASE_URL.replace('/api', '')}/${profile.business_license}` }} 
                style={styles.certImage} 
              />
            </View>
            <View style={styles.certInfo}>
              <Text style={styles.certName}>{t('profile.businessLicense', 'Business License')}</Text>
              <View style={styles.certActions}>
                <TouchableOpacity onPress={() => handlePickDocument('business_license')}>
                  <Text style={styles.certActionText}>{t('profile.update', 'Update')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {profile?.insurance_certificate && (
          <View style={styles.certCard}>
            <View style={styles.certIconContainer}>
              <Image 
                source={{ uri: `${API_BASE_URL.replace('/api', '')}/${profile.insurance_certificate}` }} 
                style={styles.certImage} 
              />
            </View>
            <View style={styles.certInfo}>
              <Text style={styles.certName}>{t('profile.insuranceCertificate', 'Insurance Certificate')}</Text>
              <View style={styles.certActions}>
                <TouchableOpacity onPress={() => handlePickDocument('insurance_certificate')}>
                  <Text style={styles.certActionText}>{t('profile.update', 'Update')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {certifications.map((cert) => (
          <View key={cert.id} style={styles.certCard}>
            <View style={styles.certIconContainer}>
              {cert.image ? (
                <Image 
                  source={{ uri: cert.image.startsWith('http') ? cert.image : `${API_BASE_URL.replace('/api', '')}/${cert.image}` }} 
                  style={styles.certImage} 
                />
              ) : (
                <Ionicons name="ribbon-outline" size={24} color={Colors.primary} />
              )}
            </View>
            <View style={styles.certInfo}>
              <Text style={styles.certName}>{cert.name}</Text>
              <View style={styles.certActions}>
                <TouchableOpacity onPress={() => handleEditCert(cert)}>
                  <Text style={styles.certActionText}>{t('profile.edit', 'Edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteCert(cert.id)}>
                  <Text style={[styles.certActionText, { color: Colors.error }]}>{t('profile.delete', 'Delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addCertButton} onPress={handleAddCert}>
          <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
          <Text style={styles.addCertText}>
            {certifications.length === 0
              ? t('auth.addCertificate', 'Add Certificate or Document')
              : t('auth.addAnother', 'Add Another')}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('profile.complianceNotice', 'Our compliance team will review your documents within 24-48 hours of upload.')}
          </Text>
        </View>

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
                  {editingCert ? t('profile.editDocument', 'Edit Document') : t('profile.addDocument', 'Add Document')}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <AppInput
                  label={t('profile.docNameLabel', 'Document Name')}
                  value={certName}
                  onChangeText={setCertName}
                  placeholder={t('profile.docNamePlaceholder', 'e.g. Business License, Insurance, or Certification')}
                  required
                />

                <Text style={styles.label}>{t('profile.docImageLabel', 'Document Image (Optional)')}</Text>
                <TouchableOpacity style={styles.imageSelector} onPress={handlePickCertImage}>
                  {certImage ? (
                    <Image source={{ uri: certImage }} style={styles.selectedImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={Colors.text.secondary} />
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
                  onPress={handleSaveCert} 
                  loading={isSubmitting}
                  style={styles.footerButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  scrollContent: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '10',
    padding: 15,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  cardStatus: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  previewContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#F1F3F5',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  uploadButtonText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  uploadButtonTextSecondary: {
    color: Colors.primary,
  },
  addCertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginTop: 8,
    backgroundColor: Colors.surface,
  },
  addCertText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyCerts: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyCertsText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  certCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  certIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  certImage: {
    width: '100%',
    height: '100%',
  },
  certInfo: {
    flex: 1,
    marginLeft: 12,
  },
  certName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  certActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  certActionText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
    marginTop: 10,
  },
  imageSelector: {
    width: '100%',
    height: 180,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
});
