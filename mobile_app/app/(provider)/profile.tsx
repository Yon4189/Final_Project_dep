import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, ThemeColors } from '@/app/constants/Colors';
import { useProviderStore } from '@/app/store/providerStore';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatPhoneNumber } from '../utils/formatters';
import type { WorkingHours } from '../types/provider.types';
import { api } from '@/app/services/api';
import { API_BASE_URL } from '@/app/config/api';
import { useUpdateProfile } from '@/hooks/useProviderQueries';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function ProviderProfile() {
  const router = useRouter();
  const { isDark, setTheme, colors } = useTheme();
  
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const BADGES = React.useMemo(() => [
    { type: 'verified', label: 'Verified Professional', icon: 'checkmark-circle', color: colors.primary },
    { type: 'top_rated', label: 'Top Rated', icon: 'star', color: colors.warning },
    { type: 'expert', label: 'Expert', icon: 'trophy', color: colors.warning },
    { type: 'emergency', label: 'Emergency Service', icon: 'flash', color: colors.error },
    { type: 'insured', label: 'Fully Insured', icon: 'shield', color: colors.success },
  ], [colors]);

  const { profile, isLoading, loadProfile,stats, toggleAvailability } = useProviderStore();
  
  useEffect(() => {
    loadProfile();
  }, []);

  const updateProfileMutation = useUpdateProfile();
  const [uploading, setUploading] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(profile?.workingHours || null);

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
      setUploading(true);
      try {
        const formData = new FormData();
        const uri = result.assets[0].uri;
        const filename = uri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('profilePicture', {
          uri,
          name: filename,
          type,
        } as any);
        
        await updateProfileMutation.mutateAsync(formData);
        Alert.alert('Success', 'Profile picture updated');
      } catch (error) {
        Alert.alert('Error', 'Failed to update profile picture');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleToggleAvailability = () => {
    toggleAvailability();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            // Clear auth and navigate to login
            await api.clearAll();
            router.replace('/login');
          }
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push('/(provider)/profile/edit')}
        >
          <Ionicons name="create-outline" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfileCard = () => {
    const apiBaseUrl = API_BASE_URL.replace('/api', '');
    const profileImageUrl = (() => {
      const pic = profile?.profilePicture || (profile as any)?.profile_picture || (profile as any)?.profileImage;
      if (!pic) return 'https://via.placeholder.com/150';
      return pic.startsWith('http') ? pic : `${apiBaseUrl}/${pic}`;
    })();

    return (
      <View style={styles.profileCard}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: profileImageUrl }}
            style={styles.profileImage}
          />
          <TouchableOpacity 
            style={styles.cameraButton}
            onPress={handlePickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Ionicons name="camera" size={20} color={colors.surface} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.businessName}>{profile?.businessName || 'Business Name'}</Text>
        <Text style={styles.profession}>{profile?.businessName || 'Service Provider'}</Text>

        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color={colors.warning} />
          <Text style={styles.ratingText}>{Number(profile?.rating || 0).toFixed(1) || '0.0'}</Text>
          <Text style={styles.reviewCount}>({profile?.reviewCount || 0} reviews)</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.completedJobs || 0}</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.yearsExperience || 0}</Text>
            <Text style={styles.statLabel}>Years</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.responseRate || 0}%</Text>
            <Text style={styles.statLabel}>Response</Text>
          </View>
        </View>

        <View style={styles.availabilityContainer}>
          <View style={styles.availabilityLeft}>
            <View style={[styles.availabilityDot, { 
              backgroundColor: profile?.isAvailable ? colors.success : colors.error 
            }]} />
            <Text style={styles.availabilityText}>
              {profile?.isAvailable ? 'Available for work' : 'Not available'}
            </Text>
          </View>
          
          <Switch
            value={profile?.isAvailable || false}
            onValueChange={handleToggleAvailability}
            trackColor={{ false: colors.border, true: colors.success }}
            thumbColor={colors.surface}
          />
        </View>
      </View>
    );
  };

  const renderBadges = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Badges & Verifications</Text>
      <View style={styles.badgesContainer}>
        {BADGES.map((badge) => (
          <View key={badge.type} style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
            <Ionicons name={badge.icon as keyof typeof Ionicons.glyphMap} size={20} color={badge.color} />
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderContactInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Contact Information</Text>
      
      <TouchableOpacity 
        style={styles.infoRow}
        onPress={() => Alert.alert('Info', 'Phone number')}
      >
        <View style={styles.infoLeft}>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
          <Text style={styles.infoLabel}>Phone</Text>
        </View>
        <View style={styles.infoRight}>
          <Text style={styles.infoValue}>{formatPhoneNumber(profile?.phone || '')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.infoRow}
        onPress={() => Alert.alert('Info', 'Email address')}
      >
        <View style={styles.infoLeft}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <Text style={styles.infoLabel}>Email</Text>
        </View>
        <View style={styles.infoRight}>
          <Text style={styles.infoValue}>{profile?.email || 'Not provided'}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.infoRow}
        onPress={() => router.push('/(provider)/profile/edit')}
      >
        <View style={styles.infoLeft}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={styles.infoLabel}>Address</Text>
        </View>
        <View style={styles.infoRight}>
          <Text style={styles.infoValue} numberOfLines={1}>{profile?.address || 'Not set'}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderBusinessInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Business Information</Text>
      
      <View style={styles.bioContainer}>
        <Text style={styles.bioLabel}>About</Text>
        <Text style={styles.bioText}>{profile?.bio || 'No bio added yet'}</Text>
      </View>

      <View style={styles.serviceArea}>
        <Text style={styles.serviceAreaLabel}>Service Radius</Text>
        <Text style={styles.serviceAreaValue}>{profile?.serviceRadius || 0} km</Text>
      </View>

      <TouchableOpacity 
        style={styles.servicesButton}
        onPress={() => router.push('/(provider)/profile/services')}
      >
        <View style={styles.servicesButtonLeft}>
          <Text style={styles.servicesButtonLabel}>My Services</Text>
          <Text style={styles.servicesButtonCount}>{profile?.services?.length || 0} services</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  const renderWorkingHours = () => {
    const hours = profile?.workingHours || workingHours;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Working Hours</Text>
          <TouchableOpacity onPress={() => router.push('/(provider)/profile/schedule')}>
            <Text style={styles.editText}>Manage</Text>
          </TouchableOpacity>
        </View>

        {WEEKDAYS.map((day) => {
          const dayKey = day.toLowerCase() as keyof WorkingHours;
          const schedule = hours?.[dayKey] as { isAvailable: boolean; startTime?: string; endTime?: string } | undefined;

          return (
            <View key={day} style={styles.hoursRow}>
              <Text style={styles.hoursDay}>{day}</Text>
              {editingHours ? (
                <TouchableOpacity style={styles.hoursEdit}>
                  <Text style={styles.hoursEditText}>
                    {schedule?.isAvailable 
                      ? `${schedule.startTime || '09:00'} - ${schedule.endTime || '17:00'}`
                      : 'Closed'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              ) : (
                <Text style={styles.hoursTime}>
                  {schedule?.isAvailable 
                    ? `${schedule.startTime || '09:00'} - ${schedule.endTime || '17:00'}`
                    : 'Closed'}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderDocuments = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Documents & Certifications</Text>
      
      <TouchableOpacity 
        style={styles.docRow}
        onPress={() => router.push('/(provider)/profile/documents')}
      >
        <View style={styles.docLeft}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          <Text style={styles.docLabel}>Business License</Text>
        </View>
        <View style={styles.docRight}>
          {(profile?.status === 'approved' || profile?.verificationStatus === 'verified') ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          ) : (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.docRow}
        onPress={() => router.push('/(provider)/profile/documents')}
      >
        <View style={styles.docLeft}>
          <Ionicons name="shield-outline" size={20} color={colors.primary} />
          <Text style={styles.docLabel}>Insurance Certificate</Text>
        </View>
        <View style={styles.docRight}>
          {(profile?.status === 'approved' || profile?.verificationStatus === 'verified') ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          ) : (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.docRow}
        onPress={() => router.push('/(provider)/profile/certifications')}
      >
        <View style={styles.docLeft}>
          <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
          <Text style={styles.docLabel}>Certifications</Text>
        </View>
        <View style={styles.docRight}>
          <Text style={styles.docCount}>{profile?.certifications?.length || 0}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderBankInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Bank Account</Text>
      
      <TouchableOpacity 
        style={styles.bankCard}
        onPress={() => router.push('/(provider)/profile/bank')}
      >
        <View style={styles.bankCardLeft}>
          <View style={styles.bankIcon}>
            <Ionicons name="business" size={24} color={colors.primary} />
          </View>
          <View style={styles.bankInfo}>
            <Text style={styles.bankName}>{profile?.bankDetails?.bankName || 'No bank account'}</Text>
            {profile?.bankDetails?.accountNumber && (
              <Text style={styles.bankAccount}>
                {profile.bankDetails.accountName} •••• {profile.bankDetails.accountNumber.slice(-4)}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      {profile?.bankDetails?.isVerified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.verifiedText}>Bank account verified</Text>
        </View>
      )}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Appearance</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingLeft}>
          <Ionicons name="moon-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.settingLabel}>Dark Mode</Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Settings</Text>
      
      <TouchableOpacity 
        style={styles.settingRow}
        onPress={() => router.push('/(provider)/notifications')}
      >
        <View style={styles.settingLeft}>
          <Ionicons name="notifications-outline" size={20} color={colors.text.primary} />
          <Text style={styles.settingLabel}>Notifications</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingRow}
        onPress={() => router.push('/(provider)/change-password')}
      >
        <View style={styles.settingLeft}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.text.primary} />
          <Text style={styles.settingLabel}>Privacy & Security</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingRow}
        onPress={() => Alert.alert('Help & Support', 'Our support team is currently active on Telegram: @handyman_support')}
      >
        <View style={styles.settingLeft}>
          <Ionicons name="help-circle-outline" size={20} color={colors.text.primary} />
          <Text style={styles.settingLabel}>Help & Support</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingRow}
        onPress={() => router.push('/about')}
      >
        <View style={styles.settingLeft}>
          <Ionicons name="document-text-outline" size={20} color={colors.text.primary} />
          <Text style={styles.settingLabel}>Terms & Conditions</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderHeader()}
        {renderProfileCard()}
        {renderBadges()}
        {renderContactInfo()}
        {renderBusinessInfo()}
        {renderWorkingHours()}
        {renderDocuments()}
        {renderBankInfo()}
        {renderSettings()}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
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
    paddingTop: 100,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.surface,
  },
  editButton: {
    padding: 4,
  },
  profileCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileImageContainer: {
    position: 'relative',
    marginTop: -50,
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  profession: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
    color: colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  availabilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  availabilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  editText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.secondary,
    maxWidth: 200,
  },
  bioContainer: {
    marginBottom: 16,
  },
  bioLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  serviceArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceAreaLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },
  serviceAreaValue: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  servicesButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  servicesButtonLeft: {
    flex: 1,
  },
  servicesButtonLabel: {
    fontSize: 15,
    color: colors.text.primary,
    marginBottom: 2,
  },
  servicesButtonCount: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hoursDay: {
    fontSize: 14,
    color: colors.text.primary,
  },
  hoursTime: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  hoursEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoursEditText: {
    fontSize: 14,
    color: colors.primary,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },
  docRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '500',
  },
  docCount: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  bankCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bankCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  bankAccount: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  verifiedText: {
    fontSize: 13,
    color: colors.success,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '10',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '30',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
