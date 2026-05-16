// app/(customer)/saved-addresses.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/app/context/ThemeContext';
import type { ThemeColors } from '@/app/constants/Colors';
import {
  useLocations,
  useAddLocation,
  useUpdateLocation,
  useDeleteLocation,
  useSetPrimaryLocation,
} from '@/hooks/useCustomerQueries';
import type { Location as UserLocation } from '@/app/types/customer.types';

const MAX_ADDRESSES = 3;

const LABEL_OPTIONS: { value: 'home' | 'office' | 'other'; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { value: 'home', icon: 'home-outline', label: 'Home' },
  { value: 'office', icon: 'briefcase-outline', label: 'Office' },
  { value: 'other', icon: 'location-outline', label: 'Other' },
];

const LABEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  office: 'briefcase',
  other: 'location',
};

interface AddressForm {
  addressLine1: string;
  label: 'home' | 'office' | 'other';
  customLabel: string;
}

const emptyForm: AddressForm = {
  addressLine1: '',
  label: 'home',
  customLabel: '',
};

export default function SavedAddresses() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const { data: addresses = [], isLoading, isRefetching, refetch } = useLocations();
  const addLocation = useAddLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const setPrimary = useSetPrimaryLocation();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserLocation | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openAddModal = () => {
    if (addresses.length >= MAX_ADDRESSES) {
      Alert.alert(
        t('addresses.limitTitle', 'Limit Reached'),
        t('addresses.limitMessage', `You can save up to ${MAX_ADDRESSES} addresses. Please remove one first.`)
      );
      return;
    }
    setEditingAddress(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (addr: UserLocation) => {
    setEditingAddress(addr);
    const existingLabel = addr.label as 'home' | 'office' | 'other';
    const isKnownLabel = ['home', 'office', 'other'].includes(existingLabel);
    setForm({
      addressLine1: addr.addressLine1 || '',
      label: isKnownLabel ? existingLabel : 'other',
      customLabel: !isKnownLabel ? (addr.label || '') : '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.addressLine1.trim()) {
      Alert.alert(t('common.error', 'Error'), t('addresses.addressRequired', 'Please enter an address.'));
      return;
    }
    if (form.label === 'other' && !form.customLabel.trim()) {
      Alert.alert(t('common.error', 'Error'), t('addresses.labelRequired', 'Please enter a custom label.'));
      return;
    }

    setSaving(true);
    const payload = {
      addressLine1: form.addressLine1.trim(),
      city: '',
      state: '',
      postalCode: '',
      country: 'Ethiopia',
      label: form.label === 'other' ? form.customLabel.trim() : form.label,
      isPrimary: addresses.length === 0,
    };

    try {
      if (editingAddress) {
        await updateLocation.mutateAsync({ id: editingAddress.id, data: payload });
        Alert.alert(t('common.success', 'Success'), t('addresses.updated', 'Address updated successfully.'));
      } else {
        await addLocation.mutateAsync(payload as any);
        Alert.alert(t('common.success', 'Success'), t('addresses.added', 'Address saved successfully.'));
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e.message || t('addresses.saveFailed', 'Failed to save address.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (addr: UserLocation) => {
    Alert.alert(
      t('addresses.deleteTitle', 'Remove Address'),
      t('addresses.deleteConfirm', 'Are you sure you want to remove this address?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('profile.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLocation.mutateAsync(addr.id);
            } catch (e: any) {
              Alert.alert(t('common.error', 'Error'), e.message || t('addresses.deleteFailed', 'Failed to delete address.'));
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (addr: UserLocation) => {
    if (addr.isPrimary) return;
    try {
      await setPrimary.mutateAsync(addr.id);
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e.message || t('addresses.primaryFailed', 'Failed to set primary address.'));
    }
  };

  const getLabelIcon = (label?: string): keyof typeof Ionicons.glyphMap => {
    if (!label) return 'location';
    return LABEL_ICONS[label.toLowerCase()] ?? 'location';
  };

  const getLabelDisplay = (label?: string) => {
    if (!label) return t('addresses.otherLabel', 'Address');
    const found = LABEL_OPTIONS.find(o => o.value === label.toLowerCase());
    return found ? found.label : label;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.manageAddresses', 'Manage Addresses')}</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />}
        >
          {addresses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>{t('addresses.noAddresses', 'No Saved Addresses')}</Text>
              <Text style={styles.emptySubtitle}>{t('addresses.noAddressesHint', 'Add your home, office, or any other address for quicker booking.')}</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.emptyAddText}>{t('addresses.addFirst', 'Add Your First Address')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.hint}>{t('addresses.hint', `You can save up to ${MAX_ADDRESSES} addresses.`)}</Text>

              {addresses.map((addr) => (
                <View key={addr.id} style={[styles.card, addr.isPrimary && styles.cardPrimary]}>
                  <View style={styles.cardIcon}>
                    <Ionicons name={getLabelIcon(addr.label)} size={22} color={addr.isPrimary ? colors.surface : colors.primary} style={{ opacity: addr.isPrimary ? 1 : 0.8 }} />
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardLabel}>{getLabelDisplay(addr.label)}</Text>
                      {addr.isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>{t('addresses.default', 'Default')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardAddress}>{addr.addressLine1}</Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEditModal(addr)} style={styles.actionBtn}>
                      <Ionicons name="pencil-outline" size={18} color={colors.text.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(addr)} style={styles.actionBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  {!addr.isPrimary && (
                    <TouchableOpacity style={styles.setDefaultBtn} onPress={() => handleSetPrimary(addr)}>
                      <Text style={styles.setDefaultText}>{t('addresses.setDefault', 'Set as default')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.addMoreBtn} onPress={openAddModal}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.addMoreText}>{t('addresses.addAnother', 'Add Another Address')}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress
                  ? t('addresses.editAddress', 'Edit Address')
                  : t('addresses.addAddress', 'Add Address')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Address input */}
              <Text style={styles.fieldLabel}>{t('addresses.addressLabel', 'Address')}</Text>
              <TextInput
                style={styles.input}
                value={form.addressLine1}
                onChangeText={(v) => setForm(f => ({ ...f, addressLine1: v }))}
                placeholder={t('addresses.addressPlaceholder', 'e.g. Bole Road, Addis Ababa')}
                placeholderTextColor={colors.text.secondary}
              />

              {/* Label picker */}
              <Text style={styles.fieldLabel}>{t('addresses.labelField', 'Label')}</Text>
              <View style={styles.labelRow}>
                {LABEL_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.labelChip, form.label === opt.value && styles.labelChipActive]}
                    onPress={() => setForm(f => ({ ...f, label: opt.value }))}
                  >
                    <Ionicons name={opt.icon} size={16} color={form.label === opt.value ? colors.surface : colors.text.secondary} />
                    <Text style={[styles.labelChipText, form.label === opt.value && styles.labelChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom label input when "Other" selected */}
              {form.label === 'other' && (
                <>
                  <Text style={styles.fieldLabel}>{t('addresses.customLabel', 'Custom Label')}</Text>
                  <TextInput
                    style={styles.input}
                    value={form.customLabel}
                    onChangeText={(v) => setForm(f => ({ ...f, customLabel: v }))}
                    placeholder={t('addresses.customLabelPlaceholder', 'e.g. Gym, Parents house...')}
                    placeholderTextColor={colors.text.secondary}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.saveBtnText}>{t('profile.saveChanges', 'Save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  addBtn: { padding: 4 },

  // Scroll
  scrollContent: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 13, color: colors.text.secondary, marginBottom: 16, textAlign: 'center' },

  // Address Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardPrimary: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: colors.text.primary, textTransform: 'capitalize' },
  cardAddress: { fontSize: 14, color: colors.text.secondary, lineHeight: 20 },
  primaryBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  primaryBadgeText: { fontSize: 11, color: colors.surface, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { padding: 6 },
  setDefaultBtn: {
    width: '100%',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
    alignItems: 'center',
  },
  setDefaultText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // Add More
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    marginTop: 8,
  },
  addMoreText: { fontSize: 15, color: colors.primary, fontWeight: '600' },

  // Empty State
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  emptySubtitle: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', maxWidth: 280 },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddText: { fontSize: 15, color: colors.primary, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  modalBody: { padding: 20 },
  fieldLabel: {
    fontSize: 13, fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8, marginTop: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text.primary,
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  labelRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  labelChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  labelChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  labelChipText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  labelChipTextActive: { color: colors.surface },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.text.secondary },
  saveBtn: {
    flex: 2, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.primary,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.surface },
});
