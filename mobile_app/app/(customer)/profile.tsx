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
import { ThemeColors } from '@/app/constants/Colors';
import {
  useProfile,
  useUpdateProfile,
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '../../hooks/useCustomerQueries';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { customerService } from '../services/customer.service';
import { useCustomerStore } from '../store/customerStore';

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
  const { data: notificationSettings, isLoading: isLoadingNotifications } = useNotificationSettings();
  const updateNotifications = useUpdateNotificationSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<any>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  if (isLoading || isLoadingNotifications) {
    return <LoadingSpinner />;
  }

  const notifications = notificationSettings ?? {
    email: true,
    push: true,
    sms: false,
    marketing: false,
    booking_updates: true,
    payment_updates: true,
    promotional_offers: false,
  };

  const handleNotificationToggle = (key: string, value: boolean) => {
    updateNotifications.mutate({ ...notifications, [key]: value });
  };

  const fields: EditableField[] = [
    { key: 'fullname', label: t('auth.fullName', 'Full Name'), value: profile?.fullname || profile?.name || '', icon: 'person-outline' },
    { key: 'email', label: t('auth.emailAddress', 'Email Address'), value: profile?.email || '', icon: 'mail-outline', type: 'email' },
    { key: 'phone', label: t('auth.phoneNumber', 'Phone Number'), value: profile?.phone || '', icon: 'call-outline', type: 'phone' },
  ];

  const handleEdit = () => {
    setEditedProfile({ ...profile });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(editedProfile);
      setIsEditing(false);
      Alert.alert(t('common.success', 'Success'), t('profile.updateSuccess', 'Profile updated successfully'));
    } catch {
      Alert.alert(t('common.error', 'Error'), t('profile.updateError', 'Failed to update profile'));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({});
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingImage(true);
      try {
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('image', {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: `profile_${Date.now()}.jpg`,
        } as any);

        await customerService.uploadProfileImage(formData);
        Alert.alert(t('common.success', 'Success'), t('profile.pictureUpdated', 'Profile picture updated'));
      } catch {
        Alert.alert(t('common.error', 'Error'), 'Failed to upload image');
      } finally {
        setUploadingImage(false);
      }
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
          onPress: async () => {
            await api.clearAll();
            useCustomerStore.getState().reset();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const renderField = (field: EditableField) => (
    <View key={field.key} style={styles.fieldContainer}>
      <View style={styles.fieldLabelRow}>
        <Ionicons name={field.icon} size={18} color={colors.primary} />
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

  const renderNavItem = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
    danger = false
  ) => (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.navLeft}>
        <Ionicons name={icon} size={22} color={danger ? colors.error : colors.text.secondary} />
        <Text style={[styles.navLabel, danger && { color: colors.error }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
    </TouchableOpacity>
  );

  const renderToggle = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value: boolean,
    onToggle: (v: boolean) => void,
    disabled = false
  ) => (
    <View style={styles.navItem}>
      <View style={styles.navLeft}>
        <Ionicons name={icon} size={22} color={colors.text.secondary} />
        <Text style={styles.navLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
        disabled={disabled}
      />
    </View>
  );

  const profileImageUri = profile?.profilePicture || profile?.profileImage;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickImage} activeOpacity={0.8}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={48} color={colors.surface} />
              </View>
            )}
            <View style={styles.cameraBtn}>
              {uploadingImage
                ? <ActivityIndicator size="small" color={colors.surface} />
                : <Ionicons name="camera" size={16} color={colors.surface} />}
            </View>
          </TouchableOpacity>

          <Text style={styles.headerName}>{profile?.fullname || profile?.name || '—'}</Text>
          <Text style={styles.headerEmail}>{profile?.email || ''}</Text>

          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <TouchableOpacity style={styles.btnOutline} onPress={handleCancel}>
                  <Text style={styles.btnOutlineText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={handleSave}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending
                    ? <ActivityIndicator size="small" color={colors.surface} />
                    : <Text style={styles.btnPrimaryText}>{t('common.save', 'Save')}</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.btnPrimary} onPress={handleEdit}>
                <Ionicons name="pencil" size={16} color={colors.surface} />
                <Text style={styles.btnPrimaryText}>{t('profile.editProfile', 'Edit Profile')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Personal Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.personalInfo', 'Personal Information')}</Text>
          <View style={styles.card}>
            {fields.map(renderField)}
          </View>
        </View>

        {/* ── Account Settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.accountSettings', 'Account Settings')}</Text>
          <View style={styles.card}>
            {renderNavItem('lock-closed-outline', t('profile.changePassword', 'Change Password'), () => router.push('/(customer)/change-password'))}
            {renderNavItem('location-outline', t('profile.manageAddresses', 'Manage Addresses'), () => router.push('/(customer)/saved-addresses'))}
            {renderNavItem('card-outline', t('profile.paymentMethods', 'Payment Methods'), () => Alert.alert('Coming Soon', 'Payment methods coming soon.'))}
          </View>
        </View>

        {/* ── Appearance ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.appearance', 'Appearance')}</Text>
          <View style={styles.card}>
            {renderToggle('moon-outline', t('profile.darkMode', 'Dark Mode'), isDark, (v) => setTheme(v ? 'dark' : 'light'))}
          </View>
        </View>

        {/* ── Notifications ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.notifications', 'Notifications')}</Text>
          <View style={styles.card}>
            {renderToggle('mail-outline', t('profile.emailNotifications', 'Email Notifications'), notifications.email, (v) => handleNotificationToggle('email', v), updateNotifications.isPending)}
            {renderToggle('notifications-outline', t('profile.pushNotifications', 'Push Notifications'), notifications.push, (v) => handleNotificationToggle('push', v), updateNotifications.isPending)}
            {renderToggle('chatbubble-outline', t('profile.smsNotifications', 'SMS Notifications'), notifications.sms, (v) => handleNotificationToggle('sms', v), updateNotifications.isPending)}
            {renderToggle('calendar-outline', t('profile.bookingUpdates', 'Booking Updates'), notifications.booking_updates, (v) => handleNotificationToggle('booking_updates', v), updateNotifications.isPending)}
            {renderToggle('card-outline', t('profile.paymentUpdates', 'Payment Updates'), notifications.payment_updates, (v) => handleNotificationToggle('payment_updates', v), updateNotifications.isPending)}
            {renderToggle('megaphone-outline', t('profile.promotionalOffers', 'Promotional Offers'), notifications.promotional_offers, (v) => handleNotificationToggle('promotional_offers', v), updateNotifications.isPending)}
            {renderToggle('pricetag-outline', t('profile.marketing', 'Marketing'), notifications.marketing, (v) => handleNotificationToggle('marketing', v), updateNotifications.isPending)}
          </View>
        </View>

        {/* ── Support ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.support', 'Support')}</Text>
          <View style={styles.card}>
            {renderNavItem('help-circle-outline', t('profile.helpCenter', 'Help Center'), () => Alert.alert('Coming Soon', 'Help center coming soon.'))}
            {renderNavItem('chatbubble-outline', t('profile.contactSupport', 'Contact Support'), () => Alert.alert('Coming Soon', 'Support chat coming soon.'))}
            {renderNavItem('document-text-outline', t('profile.terms', 'Terms & Conditions'), () => router.push('/(customer)/terms'))}
            {renderNavItem('shield-outline', t('profile.privacy', 'Privacy Policy'), () => router.push('/(customer)/privacy'))}
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={styles.logoutText}>{t('common.logout', 'Logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },

  // Header
  header: {
    backgroundColor: colors.primary,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  headerName: { fontSize: 20, fontWeight: '700', color: colors.surface, marginBottom: 2 },
  headerEmail: { fontSize: 13, color: colors.surface + 'cc', marginBottom: 16 },
  headerActions: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  btnPrimaryText: { color: colors.surface, fontSize: 14, fontWeight: '600' },
  btnOutline: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  btnOutlineText: { color: colors.surface + 'cc', fontSize: 14 },

  // Sections
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Fields
  fieldContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  fieldLabel: { fontSize: 12, color: colors.text.secondary },
  fieldValue: { fontSize: 15, color: colors.text.primary, paddingLeft: 2 },
  fieldInput: {
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Nav items
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navLabel: { fontSize: 15, color: colors.text.primary },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: colors.error },
});
