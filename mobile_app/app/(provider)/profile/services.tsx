import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/app/context/ThemeContext';
import { ThemeColors } from '@/app/constants/Colors';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import { 
  useProviderServices, 
  useAddService, 
  useUpdateService, 
  useDeleteService 
} from '@/hooks/useProviderQueries';
import { useServiceCategories } from '@/hooks/useCustomerQueries';

interface ServiceFormData {
  serviceID?: string;
  catagoryID: string;
  title: string;
  description: string;
  estimatedPrice: string;
}

export default function ProviderServicesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ServiceFormData | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    catagoryID: '',
    title: '',
    description: '',
    estimatedPrice: '',
  });

  const { data: services, isLoading, refetch } = useProviderServices();
  const { data: categories } = useServiceCategories();
  
  const addServiceMutation = useAddService();
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();

  const handleOpenModal = (service?: any) => {
    if (service) {
      setEditingService({
        serviceID: service.serviceID,
        catagoryID: service.catagoryID.toString(),
        title: service.title,
        description: service.description || '',
        estimatedPrice: service.estimatedPrice.toString(),
      });
      setFormData({
        catagoryID: service.catagoryID.toString(),
        title: service.title,
        description: service.description || '',
        estimatedPrice: service.estimatedPrice.toString(),
      });
    } else {
      setEditingService(null);
      setFormData({
        catagoryID: '',
        title: '',
        description: '',
        estimatedPrice: '',
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.catagoryID || !formData.estimatedPrice) {
      Alert.alert(t('common.error', 'Error'), t('profile.fillRequired', 'Please fill in all required fields'));
      return;
    }

    const payload = {
      ...formData,
      estimatedPrice: parseFloat(formData.estimatedPrice),
    };

    try {
      if (editingService) {
        await updateServiceMutation.mutateAsync({ 
          id: editingService.serviceID!, 
          data: payload 
        });
      } else {
        await addServiceMutation.mutateAsync(payload);
      }
      setModalVisible(false);
      refetch();
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t('profile.deleteService', 'Delete Service'),
      t('profile.deleteServiceConfirm', 'Are you sure you want to delete this service?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('profile.delete', 'Delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteServiceMutation.mutateAsync(id);
              refetch();
            } catch (error) {
              console.error('Error deleting service:', error);
            }
          }
        }
      ]
    );
  };

  const renderServiceItem = ({ item }: { item: any }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle}>{item.title}</Text>
          <Text style={styles.serviceCategory}>
            {item.category?.name || t('profile.uncategorized', 'Uncategorized')}
          </Text>
        </View>
        <Text style={styles.servicePrice}>ETB {item.estimatedPrice}</Text>
      </View>
      
      {item.description ? (
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleOpenModal(item)}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.editButtonText}>{t('profile.edit', 'Edit')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.serviceID)}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={styles.deleteButtonText}>{t('profile.delete', 'Delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.servicesTitle', 'My Services')}</Text>
        <TouchableOpacity onPress={() => handleOpenModal()} style={styles.addButton}>
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={services}
          renderItem={renderServiceItem}
          keyExtractor={(item) => item.serviceID.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={64} color={colors.text.secondary + '40'} />
              <Text style={styles.emptyText}>{t('profile.noServices', 'No services added yet')}</Text>
              <AppButton 
                title={t('profile.addFirstService', 'Add Your First Service')} 
                onPress={() => handleOpenModal()}
                style={styles.emptyAddButton}
              />
            </View>
          }
        />
      )}

      {/* Add/Edit Modal */}
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
                {editingService ? t('profile.editService', 'Edit Service') : t('profile.addNewService', 'Add New Service')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>{t('profile.serviceTitleLabel', 'Service Title *')}</Text>
              <AppInput
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder={t('profile.serviceTitlePlaceholder', 'e.g. Living Room Cleaning')}
              />

              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryGrid}>
                {categories?.map((cat: any) => (
                  <TouchableOpacity
                    key={cat.catagoryID}
                    style={[
                      styles.categoryItem,
                      formData.catagoryID === cat.catagoryID.toString() && styles.categoryItemSelected
                    ]}
                    onPress={() => setFormData({ ...formData, catagoryID: cat.catagoryID.toString() })}
                  >
                    <Text style={[
                      styles.categoryItemText,
                      formData.catagoryID === cat.catagoryID.toString() && styles.categoryItemTextSelected
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t('profile.about', 'Description')}</Text>
              <AppInput
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder={t('profile.serviceDescPlaceholder', 'What exactly is included in this service?')}
                multiline
                inputStyle={styles.textArea}
              />

              <Text style={styles.label}>{t('profile.priceLabel', 'Estimated Price (ETB) *')}</Text>
              <AppInput
                value={formData.estimatedPrice}
                onChangeText={(text) => setFormData({ ...formData, estimatedPrice: text.replace(/[^0-9.]/g, '') })}
                placeholder="0.00"
                keyboardType="numeric"
              />

              <AppButton 
                title={editingService ? t('profile.editService', "Update Service") : t('profile.addNewService', "Add Service")} 
                onPress={handleSave}
                loading={addServiceMutation.isPending || updateServiceMutation.isPending}
                style={styles.saveButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 100, paddingBottom: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  addButton: { padding: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  serviceCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  serviceInfo: { flex: 1, marginRight: 8 },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 2 },
  serviceCategory: { fontSize: 12, color: colors.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  servicePrice: { fontSize: 16, fontWeight: '700', color: colors.success },
  serviceDescription: { fontSize: 14, color: colors.text.secondary, lineHeight: 20, marginBottom: 16 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  editButton: { borderRightWidth: 1, borderRightColor: colors.border },
  editButtonText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: colors.primary },
  deleteButton: {},
  deleteButtonText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: colors.error },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, color: colors.text.secondary, marginTop: 16, marginBottom: 24 },
  emptyAddButton: { width: '100%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  modalForm: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8, marginTop: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  categoryItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, margin: 4, backgroundColor: colors.background },
  categoryItemSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryItemText: { fontSize: 13, color: colors.text.secondary },
  categoryItemTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  saveButton: { marginTop: 32, marginBottom: 40 },
});
