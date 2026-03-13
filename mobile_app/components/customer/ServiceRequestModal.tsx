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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/app/constants/Colors';
import AppButton from '../AppButton';
import { paymentService } from '@/app/services/payment.service';
import { useCreateBooking } from '@/hooks/useCustomerBookings';
import { api } from '@/app/services/api';
import { customerService } from '@/app/services/customer.service';
import type { 
  ServiceProvider, 
  ProfessionalService, 
  AvailabilitySlot,
  TimeSlot 
} from '@/app/types/customer.types';

interface ServiceRequestModalProps {
  visible: boolean;
  onClose: () => void;
  provider: ServiceProvider | null;
  userLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  selectedService?: string; // This could be service ID or name
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  visible,
  onClose,
  provider,
  userLocation,
  selectedService,
}) => {
  const router = useRouter();
  const createBooking = useCreateBooking();

  // Service selection state
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedServiceName, setSelectedServiceName] = useState<string>('');
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [servicePrice, setServicePrice] = useState<number>(0);
  const [serviceDuration, setServiceDuration] = useState<string>('');

  // Date/Time state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Available time slots from API - always fetch when date changes
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  
  // Minimum selectable date (today)
  const [minDate] = useState(new Date());

  // Form fields
  const [address, setAddress] = useState(userLocation?.address || '');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get provider's services
  const providerServices = provider?.services || [];

  // Check authentication and load user data on mount
  useEffect(() => {
    if (visible) {
      checkAuthAndLoadUser();
    }
  }, [visible]);

  // Initialize service if selectedService prop is provided
  useEffect(() => {
    if (selectedService && providerServices.length > 0) {
      // Try to find service by ID or name
      const service = providerServices.find(
        s => s.serviceId?.toString() === selectedService || 
             s.serviceName === selectedService ||
             s.service?.name === selectedService ||
             s.id?.toString() === selectedService
      );
      
      if (service) {
        handleServiceSelect(service);
      }
    }
  }, [selectedService, providerServices]);

  // Load available time slots when date changes - ALWAYS fetch, regardless of service selection
  useEffect(() => {
    if (provider && selectedDate) {
      fetchAvailableTimeSlots();
    }
  }, [selectedDate, provider]);

  useEffect(() => {
    if (userLocation?.address) {
      setAddress(userLocation.address);
    }
  }, [userLocation]);

  const checkAuthAndLoadUser = async () => {
    try {
      const authenticated = await api.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        await loadUserData();
      } else {
        console.log('User not authenticated');
        Alert.alert(
          'Authentication Required',
          'Please log in to continue with your service request.',
          [
            {
              text: 'Login',
              onPress: () => {
                onClose();
                router.push('/(auth)/login');
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const loadUserData = async () => {
    try {
      const data = await api.getUserData();
      if (data) {
        setUserData(data);
      } else {
        try {
          const profileResponse = await customerService.getProfile();
          if (profileResponse.success) {
            setUserData(profileResponse.data);
            await api.setUserData(profileResponse.data);
          }
        } catch (profileError) {
          console.error('Failed to fetch profile:', profileError);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const fetchAvailableTimeSlots = async () => {
    if (!provider) return;
    
    setLoadingTimeSlots(true);
    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const response = await customerService.getProviderAvailability(
        provider.id.toString(),
        formattedDate
      );
      
      if (response.success && response.data) {
        // Transform AvailabilitySlot[] to TimeSlot[]
        const slots: TimeSlot[] = response.data.map((slot: AvailabilitySlot) => ({
          time: slot.startTime,
          available: !slot.isBooked,
          slotId: slot.id
        }));
        setAvailableTimeSlots(slots);
      } else {
        // Fallback to mock time slots if API fails
        setAvailableTimeSlots(generateMockTimeSlots());
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      // Fallback to mock time slots
      setAvailableTimeSlots(generateMockTimeSlots());
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const generateMockTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour <= 18; hour++) {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, available: true });
      if (hour < 18) {
        slots.push({ time: `${hour.toString().padStart(2, '0')}:30`, available: true });
      }
    }
    return slots;
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      // Reset time when date changes
      setSelectedTime(new Date());
    }
  };

  const handleTimeSelect = (timeSlot: TimeSlot) => {
    if (!timeSlot.available) {
      Alert.alert('Not Available', 'This time slot is already booked. Please select another time.');
      return;
    }
    
    const [hours, minutes] = timeSlot.time.split(':').map(Number);
    const newTime = new Date(selectedDate);
    newTime.setHours(hours, minutes, 0, 0);
    setSelectedTime(newTime);
  };

  const handleServiceSelect = (service: ProfessionalService) => {
    setSelectedServiceId(service.serviceId?.toString() || service.id?.toString() || '');
    setSelectedServiceName(service.serviceName || service.service?.name || 'Service');
    
    // Get price - check multiple possible locations
    const price = service.price || service.basePrice || service.customPrice || service.service?.basePrice || 0;
    setServicePrice(price);
    
    // Get duration if available
    if (service.estimatedDuration && typeof service.estimatedDuration === 'number') {
      setServiceDuration(`${service.estimatedDuration} minutes`);
    } else if (service.service?.estimatedDuration) {
      const duration = service.service.estimatedDuration;
      setServiceDuration(`${duration.min}-${duration.max} ${duration.unit}`);
    } else if (service.duration) {
      setServiceDuration(`${service.duration} minutes`);
    }
    
    setShowServicePicker(false);
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
    if (!selectedServiceId) {
      Alert.alert('Error', 'Please select a service');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return false;
    }
    
    // Validate selected time is in the future
    const now = new Date();
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    
    if (selectedDateTime < now) {
      Alert.alert('Error', 'Please select a future date and time');
      return false;
    }
    
    // Validate time slot is available
    const selectedTimeString = formatTime(selectedTime);
    const selectedSlot = availableTimeSlots.find(
      slot => slot.time === selectedTimeString
    );
    
    if (selectedSlot && !selectedSlot.available) {
      Alert.alert('Error', 'Selected time slot is no longer available. Please choose another time.');
      return false;
    }
    
    return true;
  };

  const extractCheckoutUrl = (response: any): string | null => {
    if (!response) return null;
    
    if (response.checkoutUrl) return response.checkoutUrl;
    if (response.checkout_url) return response.checkout_url;
    if (response.data) {
      if (response.data.checkoutUrl) return response.data.checkoutUrl;
      if (response.data.checkout_url) return response.data.checkout_url;
    }
    if (typeof response === 'string' && response.startsWith('http')) {
      return response;
    }
    
    return null;
  };

  const handleConfirmAndPay = async () => {
    if (!validateForm() || !provider) return;

    const authenticated = await api.isAuthenticated();
    if (!authenticated) {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [
          {
            text: 'Login',
            onPress: () => {
              onClose();
              router.push('/(auth)/login');
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      // Format date and time for API
      const scheduledDate = selectedDate.toISOString().split('T')[0];
      const scheduledTime = formatTime(selectedTime);

      console.log('Creating booking with:', {
        providerID: Number(provider.id),
        serviceID: Number(selectedServiceId),
        scheduledDate: scheduledDate,
        agreed_price: servicePrice,
        service_address: address,
        notes: description,
      });

      const bookingResponse = await createBooking.mutateAsync({
        providerID: Number(provider.id),
        serviceID: Number(selectedServiceId),
        scheduledDate: scheduledDate,
        agreed_price: servicePrice,
        service_address: address,
        notes: description,
      });

      console.log('Booking response:', JSON.stringify(bookingResponse, null, 2));

      // Check for ID in various possible locations in the response
      const bookingId = bookingResponse.id || bookingResponse.bookingID || bookingResponse.data?.id || bookingResponse.data?.bookingID;

      if (bookingResponse && bookingId) {
        // Get user data for payment with fallbacks
        const customerEmail = userData?.email || userData?.emailAddress || 'customer@example.com';
        const customerFullName = userData?.fullname || userData?.name || 'Customer User';
        const customerFirstName = customerFullName.split(' ')[0] || 'Customer';
        const customerLastName = customerFullName.split(' ').slice(1).join(' ') || 'User';
        const customerPhone = userData?.phone || userData?.phoneNumber || '0912345678';
        const customerId = userData?.customerID || userData?.id || 'cust_123';

        console.log('Initializing payment with:', {
          amount: servicePrice,
          email: customerEmail,
          firstName: customerFirstName,
          lastName: customerLastName,
          bookingId: bookingId.toString(),
        });

        // Initialize payment with Chapa
        const paymentResponse = await paymentService.initializeChapaPayment({
          amount: servicePrice,
          email: customerEmail,
          firstName: customerFirstName,
          lastName: customerLastName,
          phoneNumber: customerPhone,
          customerId: customerId,
          bookingId: bookingId.toString(),
          description: `Payment for ${selectedServiceName} with ${provider.businessName || provider.name}`,
        });

        console.log('Payment response:', paymentResponse);

        const checkoutUrl = extractCheckoutUrl(paymentResponse);

        if (checkoutUrl) {
          onClose();
          if (Platform.OS === 'web') {
            window.open(checkoutUrl, '_blank');
          } else {
            router.push({
              pathname: '/(customer)/payment',
              params: {
                checkoutUrl: checkoutUrl,
                bookingId: bookingId.toString(),
                amount: servicePrice.toString(),
                providerId: provider.id.toString(),
                serviceId: selectedServiceId,
              }
            });
          }
        } else {
          Alert.alert('Error', 'Failed to initialize payment. No checkout URL received.');
        }
      } else {
        Alert.alert('Error', 'Failed to create booking. No booking ID received.');
      }
    } catch (error: any) {
      console.error('Booking creation error:', error);
      
      // Extract specific error message if available
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.response?.data?.errors ) {
        const errors = error.response.data.errors;
        const firstKey = Object.keys(errors)[0];
        if (firstKey && Array.isArray(errors[firstKey]) && errors[firstKey].length > 0) {
          errorMessage = errors[firstKey][0];
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (error.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'Login',
              onPress: () => {
                onClose();
                router.push('/(auth)/login');
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Booking Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Render service selection dropdown
  const renderServicePicker = () => {
    if (!providerServices || providerServices.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service</Text>
          <Text style={styles.serviceName}>No services available</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Service *</Text>
        <TouchableOpacity
          style={styles.serviceSelector}
          onPress={() => setShowServicePicker(!showServicePicker)}
        >
          <Text style={selectedServiceId ? styles.serviceSelectorText : styles.serviceSelectorPlaceholder}>
            {selectedServiceName || 'Choose a service'}
          </Text>
          <Ionicons 
            name={showServicePicker ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={Colors.text.secondary} 
          />
        </TouchableOpacity>

        {showServicePicker && (
          <View style={styles.serviceList}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
              {providerServices.map((service: ProfessionalService, index: number) => {
                const serviceId = service.id?.toString() || service.serviceId?.toString() || index.toString();
                const serviceName = service.name || service.serviceName || service.service?.name || 'Service';
                const servicePrice = service.price || service.basePrice || service.customPrice || service.service?.basePrice || 0;
                
                // Get duration if available
                let durationText = '';
                if (service.estimatedDuration) {
                  durationText = `${service.estimatedDuration} min`;
                } else if (service.service?.estimatedDuration) {
                  const duration = service.service.estimatedDuration;
                  durationText = `${duration.min}-${duration.max} ${duration.unit}`;
                }
                
                return (
                  <TouchableOpacity
                    key={serviceId}
                    style={[
                      styles.serviceItem,
                      selectedServiceId === serviceId && styles.serviceItemSelected
                    ]}
                    onPress={() => handleServiceSelect(service)}
                  >
                    <View style={styles.serviceItemLeft}>
                      <Text style={styles.serviceItemName}>{serviceName}</Text>
                      {durationText ? (
                        <Text style={styles.serviceItemDuration}>{durationText}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.serviceItemPrice}>ETB {servicePrice}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Render time slots
  const renderTimeSlots = () => {
    if (loadingTimeSlots) {
      return (
        <View style={styles.timeSlotsLoading}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.timeSlotsLoadingText}>Loading available times...</Text>
        </View>
      );
    }

    if (availableTimeSlots.length === 0) {
      return (
        <View style={styles.noTimeSlots}>
          <Text style={styles.noTimeSlotsText}>No available time slots for this date</Text>
        </View>
      );
    }

    const selectedTimeString = formatTime(selectedTime);

    return (
      <View style={styles.timeSlotsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableTimeSlots.map((slot) => (
            <TouchableOpacity
              key={slot.time}
              style={[
                styles.timeSlot,
                !slot.available && styles.timeSlotUnavailable,
                selectedTimeString === slot.time && slot.available && styles.timeSlotSelected
              ]}
              onPress={() => handleTimeSelect(slot)}
              disabled={!slot.available}
            >
              <Text style={[
                styles.timeSlotText,
                !slot.available && styles.timeSlotTextUnavailable,
                selectedTimeString === slot.time && slot.available && styles.timeSlotTextSelected
              ]}>
                {slot.time}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // If not authenticated, don't render the modal content
  if (!isAuthenticated) {
    return null;
  }

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
              <Text style={styles.providerName}>
                {provider.businessName || provider.name || 'Provider'}
              </Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color={Colors.warning} />
                <Text style={styles.ratingText}>
                  {provider.rating?.toFixed(1) || '0.0'} • {provider.reviewCount || 0} reviews
                </Text>
              </View>
            </View>

            {/* Service Selection - ALWAYS ACTIVE */}
            {renderServicePicker()}

            {/* Date Selection - ALWAYS ACTIVE */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Date *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  min={minDate.toISOString().split('T')[0]}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    if (val) {
                      const [y, m, d] = val.split('-').map(Number);
                      handleDateChange(null, new Date(y, m - 1, d));
                    }
                  }}
                  style={{
                    padding: '16px',
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '16px',
                    width: '100%',
                    outline: 'none',
                    color: '#111827',
                    fontFamily: 'inherit'
                  }}
                />
              ) : (
                <>
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
                      minimumDate={minDate}
                    />
                  )}
                </>
              )}
            </View>

            {/* Time Selection - ALWAYS ACTIVE */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Time *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="time"
                  value={`${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    if (val) {
                      const [h, m] = val.split(':').map(Number);
                      const t = new Date(selectedDate);
                      t.setHours(h, m, 0, 0);
                      setSelectedTime(t);
                    }
                  }}
                  style={{
                    padding: '16px',
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '16px',
                    width: '100%',
                    outline: 'none',
                    color: '#111827',
                    fontFamily: 'inherit'
                  }}
                />
              ) : (
                <>
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
                      onChange={(event: any, date?: Date) => {
                        setShowTimePicker(false);
                        if (date) setSelectedTime(date);
                      }}
                    />
                  )}
                </>
              )}
            </View>

            {/* Address - ALWAYS ACTIVE */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Address *</Text>
              <TextInput
                style={styles.addressInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                placeholderTextColor={Colors.text.secondary}
                multiline
              />
            </View>

            {/* Description - ALWAYS ACTIVE */}
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

            {/* Price Estimate - Shows after service is selected */}
            {servicePrice > 0 && (
              <View style={styles.priceSection}>
                <Text style={styles.priceLabel}>Total Price</Text>
                <Text style={styles.priceValue}>ETB {servicePrice}</Text>
                {serviceDuration ? (
                  <Text style={styles.priceNote}>Estimated duration: {serviceDuration}</Text>
                ) : null}
                <Text style={styles.priceNote}>
                  Platform fee will be added at checkout
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <AppButton
              title="Confirm & Pay"
              onPress={handleConfirmAndPay}
              loading={loading || createBooking.isPending}
              disabled={loading || createBooking.isPending || !selectedServiceId}
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
  serviceSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceSelectorText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  serviceSelectorPlaceholder: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  serviceList: {
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 250,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  serviceItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  serviceItemLeft: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  serviceItemDuration: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  serviceItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 12,
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
  timeSlotsContainer: {
    marginTop: 8,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  timeSlotSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeSlotUnavailable: {
    backgroundColor: Colors.background,
    borderColor: Colors.error + '40',
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  timeSlotTextSelected: {
    color: Colors.surface,
    fontWeight: '500',
  },
  timeSlotTextUnavailable: {
    color: Colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  timeSlotsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 10,
    gap: 8,
  },
  timeSlotsLoadingText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  noTimeSlots: {
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 10,
    alignItems: 'center',
  },
  noTimeSlotsText: {
    fontSize: 14,
    color: Colors.text.secondary,
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
    marginTop: 4,
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
