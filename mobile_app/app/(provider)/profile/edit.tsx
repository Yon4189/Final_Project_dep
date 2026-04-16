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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/app/context/ThemeContext';
import { ThemeColors } from '@/app/constants/Colors';
import { useProviderQueries } from '@/hooks/useProviderQueries';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

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
    address: '',
    yearsExperience: '',
    hourlyRate: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName || profile.fullname || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        email: profile.email || '',
        address: profile.address || '',
        yearsExperience: String(profile.yearsExperience || ''),
        hourlyRate: String(profile.hourlyRate || ''),
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!form.businessName || !form.phone) {
      Alert.alert(t('common.error', 'Error'), t('profile.namePhoneRequired', 'Business Name and Phone are required'));
      return;
    }

    try {
      await updateProfile.mutateAsync({
        businessName: form.businessName,
        bio: form.bio,
        phone: form.phone,
        email: form.email,
        address: form.address,
        yearsExperience: parseInt(form.yearsExperience) || 0,
        hourlyRate: parseFloat(form.hourlyRate) || 0,
      });
      // onSuccess in mutation hook will handle the back navigation or alert
    } catch (error) {
      // onError in mutation hook will handle the error alert
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

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
            <Text style={styles.label}>{t('profile.address', 'Physical Address')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('profile.addressPlaceholder', 'Enter business address')}
              value={form.address}
              onChangeText={(text) => setForm({ ...form, address: text })}
            />
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
  saveButton: { backgroundColor: colors.primary, height: 52, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10 },
  saveButtonText: { color: colors.surface, fontSize: 16, fontWeight: 'bold' },
  cancelButton: { height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: colors.text.secondary, fontSize: 15 },
});
