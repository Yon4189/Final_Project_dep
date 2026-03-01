// components/customer/ServiceRequestModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/app/constants/Colors';
import AppButton from '../AppButton';
import { paymentService } from '@/app/services/payment.service';
import { useCreateBooking } from '@/hooks/useCustomerQueries';
import type { ServiceProvider } from '@/app/types/customer.types';

interface ServiceRequestModalProps {
  visible: boolean;
  onClose: () => void;
  provider: ServiceProvider | null;
  userLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  selectedService?: string;
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  visible,
  onClose,
  provider,
  userLocation,
  selectedService,
}) => {
  const createBooking = useCreateBooking();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [address, setAddress] = useState(userLocation?.address || '');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedServiceName, setSelectedServiceName] = useState(selectedService || '');

  useEffect(() => {
    if (selectedService) {
      setSelectedServiceName(selectedService);
    }
  }, [selectedService]);

  useEffect(() => {
    if (userLocation?.address) {
      setAddress(userLocation.address);
    }
  }, [userLocation]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      setSelectedTime(time);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const validateForm = () => {
    if (!selectedServiceName) {
      Alert.alert('Error', 'Please select a service');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !provider) return;

    setLoading(true);
    try {
      // Format date and time for API
      const scheduledDate = selectedDate.toISOString().split('T')[0];
      const scheduledTime = formatTime(selectedTime);

      // Create booking
      const bookingResponse = await createBooking.mutateAsync({
        provider_id: provider.id,
        service_id: selectedServiceName, // This should be the actual service ID
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        address: address,
        description: description,
        estimated_price: provider.priceRange?.min || 0,
      });

      if (bookingResponse) {
        // Initialize payment
        const paymentResponse = await paymentService.initializeChapaPayment({
          amount: provider.priceRange?.min || 0,
          email: 'customer@example.com', // This should come from user profile
          firstName: 'Customer',
          lastName: 'User',
          phoneNumber: '0912345678',
          customerId: 'cust_123', // This should come from user profile
          bookingId: bookingResponse.id,
          description: `Payment for ${selectedServiceName} with ${provider.businessName}`,
        });

        if (paymentResponse.checkoutUrl) {
          // Close modal
          onClose();
          
          // Open payment URL
          if (Platform.OS === 'web') {
            window.open(paymentResponse.checkoutUrl, '_blank');
          } else {
            // For mobile, you might want to navigate to a WebView screen
            // This will need to be implemented based on your navigation
            Alert.alert('Success', 'Redirecting to payment...');
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  if (!provider) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Service</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Provider Info */}
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{provider.businessName}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color={Colors.warning} />
                <Text style={styles.ratingText}>
                  {provider.rating?.toFixed(1) || '0.0'} • {provider.reviewCount || 0} reviews
                </Text>
              </View>
            </View>

            {/* Service Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service</Text>
              <Text style={styles.serviceName}>{selectedServiceName || 'Please select a service'}</Text>
            </View>

            {/* Date Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Time Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={Colors.primary} />
                <Text style={styles.dateText}>{formatTime(selectedTime)}</Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </View>

            {/* Address */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Address</Text>
              <TextInput
                style={styles.addressInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                placeholderTextColor={Colors.text.secondary}
                multiline
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description (Optional)</Text>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your issue or requirements"
                placeholderTextColor={Colors.text.secondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Price Estimate */}
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Estimated Price</Text>
              <Text style={styles.priceValue}>
                ETB {provider.priceRange?.min || 0} - {provider.priceRange?.max || 0}
              </Text>
              <Text style={styles.priceNote}>
                Final price may vary based on service requirements
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <AppButton
              title="Confirm & Pay"
              onPress={handleSubmit}
              loading={loading || createBooking.isPending}
              disabled={loading || createBooking.isPending}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  providerInfo: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    color: Colors.text.primary,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text.primary,
  },
  addressInput: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  descriptionInput: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priceSection: {
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  priceNote: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  confirmButton: {
    flex: 2,
  },
});