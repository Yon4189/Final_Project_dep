// app/(customer)/profile.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, ThemeColors } from '@/app/constants/Colors';
import { useProfile, useUpdateProfile } from '../../hooks/useCustomerQueries';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';

interface EditableField {
  key: string;
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  type?: 'text' | 'email' | 'phone';
}

export default function CustomerProfile() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, setTheme, colors } = useTheme();
  
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const fields: EditableField[] = [
    { key: 'name', label: t('auth.fullName', 'Full Name'), value: profile?.name || '', icon: 'person-outline' },
    { key: 'email', label: t('auth.emailAddress', 'Email Address'), value: profile?.email || '', icon: 'mail-outline', type: 'email' },
    { key: 'phone', label: t('auth.phoneNumber', 'Phone Number'), value: profile?.phone || '', icon: 'call-outline', type: 'phone' },
  ];

  const handleEdit = () => {
    setEditedProfile(profile);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(editedProfile);
      setIsEditing(false);
      Alert.alert(t('common.success', 'Success'), t('profile.updateSuccess', 'Profile updated successfully'));
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('profile.updateError', 'Failed to update profile'));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({});
  };

  const handleChangePassword = () => {
    router.push('/(customer)/change-password');
  };

  const handleManageLocations = () => {
    router.push('/(customer)/locations');
  };
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploadingImage(true);
      // Upload image to server
      setTimeout(() => {
        setUploadingImage(false);
        Alert.alert(t('common.success', 'Success'), t('profile.pictureUpdated', 'Profile picture updated'));
      }, 1500);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('common.logout', 'Logout'),
      t('auth.confirmLogout', 'Are you sure you want to logout?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('common.logout', 'Logout'), 
          style: 'destructive',
          onPress: () => {
            // Clear auth token and navigate to login
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const renderEditableField = (field: EditableField) => (
    <View key={field.key} style={styles.fieldContainer}>
      <View style={styles.fieldLabelContainer}>
        <Ionicons name={field.icon} size={20} color={colors.primary} />
        <Text style={styles.fieldLabel}>{field.label}</Text>
      </View>
      
      {isEditing ? (
        <TextInput
          style={styles.fieldInput}
          value={editedProfile[field.key] || ''}
          onChangeText={(text) => setEditedProfile({ ...editedProfile, [field.key]: text })}
          keyboardType={field.type === 'email' ? 'email-address' : field.type === 'phone' ? 'phone-pad' : 'default'}
          autoCapitalize="none"
          placeholderTextColor={colors.text.secondary}
        />
      ) : (
        <Text style={styles.fieldValue}>{field.value || t('profile.notSet', 'Not set')}</Text>
      )}
    </View>
  );

  const renderSettingItem = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={22} color={colors.text.secondary} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {rightElement || (
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + (insets.top > 0 ? 10 : 40) }]}>
          <View style={styles.headerTop}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: profile?.profileImage || 'https://via.placeholder.com/120' }}
                style={styles.profileImage}
              />
              <TouchableOpacity style={styles.editImageButton} onPress={handlePickImage}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="camera" size={20} color={colors.surface} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={handleSave}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('common.save', 'Save')}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Ionicons name="pencil" size={18} color={colors.surface} />
                <Text style={styles.editButtonText}>{t('profile.editProfile', 'Edit Profile')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.personalInfo', 'Personal Information')}</Text>
          <View style={styles.sectionContent}>
            {fields.map(renderEditableField)}
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.accountSettings', 'Account Settings')}</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem('lock-closed-outline', t('profile.changePassword', 'Change Password'), handleChangePassword)}
            {renderSettingItem('location-outline', t('profile.manageAddresses', 'Manage Addresses'), handleManageLocations)}
            {renderSettingItem('card-outline', t('profile.paymentMethods', 'Payment Methods'), () => Alert.alert('Coming Soon', 'Payment methods are not available yet.'))}
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.appearance', 'Appearance')}</Text>
          <View style={styles.sectionContent}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="moon-outline" size={22} color={colors.text.secondary} />
                <Text style={styles.settingLabel}>{t('profile.darkMode', 'Dark Mode')}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.notifications', 'Notifications')}</Text>
          <View style={styles.sectionContent}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="mail-outline" size={22} color={colors.text.secondary} />
                <Text style={styles.settingLabel}>{t('profile.emailNotifications', 'Email Notifications')}</Text>
              </View>
              <Switch
                value={notifications.email}
                onValueChange={(value) => setNotifications({ ...notifications, email: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={22} color={colors.text.secondary} />
                <Text style={styles.settingLabel}>{t('profile.pushNotifications', 'Push Notifications')}</Text>
              </View>
              <Switch
                value={notifications.push}
                onValueChange={(value) => setNotifications({ ...notifications, push: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="chatbubble-outline" size={22} color={colors.text.secondary} />
                <Text style={styles.settingLabel}>{t('profile.smsNotifications', 'SMS Notifications')}</Text>
              </View>
              <Switch
                value={notifications.sms}
                onValueChange={(value) => setNotifications({ ...notifications, sms: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.support', 'Support')}</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem('help-circle-outline', t('profile.helpCenter', 'Help Center'), () => Alert.alert('Coming Soon', 'Help center is not available yet.'))}
            {renderSettingItem('chatbubble-outline', t('profile.contactSupport', 'Contact Support'), () => Alert.alert('Coming Soon', 'Support chat is not available yet.'))}
            {renderSettingItem('document-text-outline', t('profile.terms', 'Terms & Conditions'), () => Alert.alert('Coming Soon', 'Terms page is not available yet.'))}
            {renderSettingItem('shield-outline', t('profile.privacy', 'Privacy Policy'), () => Alert.alert('Coming Soon', 'Privacy policy page is not available yet.'))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={styles.logoutText}>{t('common.logout', 'Logout')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: colors.primary,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
  },
  headerTop: {
    alignItems: 'center',
    width: '100%',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    color: colors.surface,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  fieldContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    marginLeft: 8,
    fontSize: 13,
    color: colors.text.secondary,
  },
  fieldValue: {
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 4,
  },
  fieldInput: {
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    marginLeft: 12,
    fontSize: 15,
    color: colors.text.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: colors.error,
  },
  bottomPadding: {
    height: 40,
  },
});