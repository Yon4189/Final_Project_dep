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
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/app/constants/Colors';
import { useProviderStore } from '@/app/store/providerStore';
import { useUpdateProfile } from '@/hooks/useProviderQueries';
import AppButton from '@/components/AppButton';

export default function DocumentsScreen() {
  const router = useRouter();
  const { profile } = useProviderStore();
  const updateProfileMutation = useUpdateProfile();
  
  const [uploading, setUploading] = useState<string | null>(null);

  const handlePickDocument = async (type: 'business_license' | 'insurance_certificate') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload documents.');
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
      Alert.alert('Success', 'Document uploaded successfully.');
    } catch (error: any) {
      console.error('Upload error detail:', error);
      const serverMessage = error.responseData?.message || error.message;
      Alert.alert('Upload Failed', `Error: ${serverMessage}. Please check if the file is an image or PDF and under 4MB.`);
    } finally {
      setUploading(null);
    }
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
              {isUploaded ? 'Uploaded' : 'Action Required'}
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
              source={{ uri: `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/${profile[type]}` }} 
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
                {isUploaded ? 'Update Document' : 'Upload Document'}
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
        <Text style={styles.title}>Verification Documents</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Please upload clear copies of your legal documents to maintain your verified status and visibility to customers.
          </Text>
        </View>

        {renderDocCard(
          'Business License',
          'business_license',
          'A valid municipal or trade license allowing you to operate your business.',
          'business'
        )}

        {renderDocCard(
          'Insurance Certificate',
          'insurance_certificate',
          'Proof of professional liability or general business insurance.',
          'shield-checkmark'
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Our compliance team will review your documents within 24-48 hours of upload.
          </Text>
        </View>
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
    paddingTop: 60,
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
  footer: {
    marginTop: 10,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
