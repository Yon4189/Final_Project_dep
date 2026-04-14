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
  KeyboardAvoidingView,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { Colors } from '@/app/constants/Colors';
import AppButton from '../AppButton';
import { useCreateBooking } from '@/hooks/useCustomerBookings';
import { api } from '@/app/services/api';
import { customerService } from '@/app/services/customer.service';
import { MapLocationPicker } from './MapLocationPicker';
import type { 
  ServiceProvider, 
  ProfessionalService, 
  AvailabilitySlot,
  TimeSlot,
  Location as UserLocation
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
  const [agreedPrice, setAgreedPrice] = useState<string>(''); // User-entered agreed price
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
  const [userData, setUserData] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Address selection state
  const [addressOption, setAddressOption] = useState<'current' | 'saved' | 'new' | 'map' | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<UserLocation[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>('');
  const [isSavingNewAddress, setIsSavingNewAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState<'home' | 'office' | 'other'>('home');
  const [customLabel, setCustomLabel] = useState('');
  const [showSavedAddressPicker, setShowSavedAddressPicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(userLocation || null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Get provider's services
  const providerServices = provider?.services || [];

  // Check authentication and load user data on mount
  useEffect(() => {
    if (visible) {
      checkAuthAndLoadUser();
      fetchSavedAddresses();
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
    if (userLocation?.address && addressOption === 'current') {
      setAddress(userLocation.address);
      setCurrentLocation(userLocation);
    }
  }, [userLocation, addressOption]);

  const requestCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use your current location. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        setLoadingLocation(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      console.log('📍 Current Location Fetched:', {
        latitude,
        longitude,
        googleMapsLink: `https://www.google.com/maps?q=${latitude},${longitude}`
      });

      // Try to get address from coordinates
      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addresses && addresses.length > 0) {
          const addr = addresses[0];
          
          console.log('🏠 Reverse Geocode Result:', {
            street: addr.street,
            name: addr.name,
            city: addr.city,
            region: addr.region,
            country: addr.country,
            postalCode: addr.postalCode,
            district: addr.district,
            fullObject: addr
          });
          
          const addressString = [
            addr.street,
            addr.city,
            addr.region,
            addr.country
          ].filter(Boolean).join(', ');

          const locationData = {
            latitude,
            longitude,
            address: addressString || 'Current Location'
          };
          
          setCurrentLocation(locationData);
          setAddress(addressString || 'Current Location');
          setLoadingLocation(false);
          return locationData;
        }
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError);
      }

      const locationData = {
        latitude,
        longitude,
        address: 'Current Location'
      };
      
      setCurrentLocation(locationData);
      setAddress('Current Location');
      setLoadingLocation(false);
      return locationData;

    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again or select a different address option.');
      setLoadingLocation(false);
      return null;
    }
  };

  const handleOptionChange = async (option: 'current' | 'saved' | 'new' | 'map') => {
    console.log('Address option changed to:', option);
    setAddressOption(option);
    
    if (option === 'current') {
      // Request location permission and get current location
      await requestCurrentLocation();
    } else if (option === 'saved') {
      const saved = savedAddresses.find(loc => loc.id.toString() === selectedSavedAddressId);
      setAddress(saved?.addressLine1 || '');
    } else if (option === 'map') {
      console.log('Opening map picker, current mapLocation:', mapLocation);
      setShowMapPicker(true);
    } else {
      setAddress('');
    }
  };

  const handleSavedAddressSelect = (loc: UserLocation) => {
    setSelectedSavedAddressId(loc.id.toString());
    setAddress(loc.addressLine1 || '');
    setShowSavedAddressPicker(false);
  };

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

  const fetchSavedAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const response = await customerService.getLocations();
      if (response.success && response.data) {
        setSavedAddresses(response.data);
        // If there are saved addresses, default to the first one or primary
        const primary = response.data.find(loc => loc.isPrimary);
        if (primary) {
          setSelectedSavedAddressId(primary.id.toString());
          if (addressOption === 'saved') {
            setAddress(primary.addressLine1 || '');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load saved addresses:', error);
    } finally {
      setLoadingAddresses(false);
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
    setAgreedPrice(price.toString()); // Initialize agreed price with service price
    
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

    // Validate agreed price
    if (!agreedPrice || agreedPrice.trim() === '') {
      Alert.alert('Error', 'Please enter the agreed price');
      return false;
    }

    const priceValue = parseFloat(agreedPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Error', 'Please enter a valid price (numbers only)');
      return false;
    }
    
    // Validate location differently based on selection source
    if (addressOption === 'current') {
      if (!currentLocation?.latitude || !currentLocation?.longitude) {
        Alert.alert('Location Required', 'Please wait while we get your current location, or select a different address option.');
        return false;
      }
    } else if (addressOption === 'saved') {
      if (!selectedSavedAddressId) {
        Alert.alert('Error', 'Please select a saved address');
        return false;
      }
    } else if (addressOption === 'map') {
      if (!mapLocation) {
        Alert.alert('Error', 'Please pin your location on the map');
        return false;
      }
    } else if (addressOption === 'new') {
      if (!address.trim()) {
        Alert.alert('Error', 'Please enter your complete address details');
        return false;
      }
    } else {
      if (!address.trim()) {
        Alert.alert('Error', 'Please provide an address');
        return false;
      }
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

  const handleSendRequest = async () => {
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
      const scheduledDate = selectedDate.toISOString().split('T')[0];

      // 1. If saving new address, do it first
      let locationSource: 'gps' | 'saved' | 'new' | 'map' = addressOption === 'current' ? 'gps' : (addressOption === 'saved' ? 'saved' : (addressOption === 'map' ? 'map' : 'new'));
      let savedAddressId = addressOption === 'saved' ? selectedSavedAddressId : undefined;
      let finalAddress = address;
      let finalLatitude = currentLocation?.latitude;
      let finalLongitude = currentLocation?.longitude;

      if (addressOption === 'current' && !address.trim()) {
        finalAddress = currentLocation?.address || 'GPS Coordinates Used';
      }

      if (addressOption === 'map' && mapLocation) {
        finalAddress = mapLocation.address;
        finalLatitude = mapLocation.latitude;
        finalLongitude = mapLocation.longitude;
      }

      if (addressOption === 'new' && isSavingNewAddress) {
        try {
          const label = addressLabel === 'other' ? customLabel : addressLabel;
          const saveResponse = await customerService.addLocation({
            addressLine1: address,
            city: '', // Backend might derive this or require it
            state: '',
            postalCode: '',
            country: '',
            latitude: 0, // Should ideally get coordinates for new address
            longitude: 0,
            label: label,
            isPrimary: false,
            userId: 0, // Placeholder, backend handles this
            createdAt: '',
            updatedAt: ''
          } as any);
          if (saveResponse.success && saveResponse.data) {
            savedAddressId = saveResponse.data.id.toString();
            locationSource = 'saved';
          }
        } catch (saveError) {
          console.error('Failed to save address:', saveError);
          // Continue with booking even if save fails
        }
      }

      // Map location source to backend's expected location_type
      let locationType: 'current' | 'saved' | 'manual' | 'pin_on_map' = 'current';
      if (locationSource === 'gps') locationType = 'current';
      else if (locationSource === 'saved') locationType = 'saved';
      else if (locationSource === 'map') locationType = 'pin_on_map';
      else if (locationSource === 'new') locationType = 'manual';

      console.log('Booking submission debug:', {
        addressOption,
        locationSource,
        locationType,
        finalLatitude,
        finalLongitude,
        finalAddress,
        mapLocation
      });

      const bookingResponse = await createBooking.mutateAsync({
        providerID: Number(provider.id),
        serviceID: Number(selectedServiceId),
        scheduledDate: scheduledDate,
        agreed_price: parseFloat(agreedPrice), // Use the agreed price entered by customer
        notes: description,
        
        location_type: locationType,
        latitude: (locationType === 'current' || locationType === 'pin_on_map') ? finalLatitude : undefined,
        longitude: (locationType === 'current' || locationType === 'pin_on_map') ? finalLongitude : undefined,
        address_id: locationType === 'saved' && savedAddressId ? Number(savedAddressId) : undefined,
        manual_address: locationType === 'manual' ? finalAddress : undefined,
        formatted_address: locationType === 'pin_on_map' ? finalAddress : undefined,
      });

      const bookingId =
        bookingResponse.id ||
        bookingResponse.bookingID ||
        bookingResponse.data?.id ||
        bookingResponse.data?.bookingID;

      if (bookingResponse && bookingId) {
        Alert.alert(
          'Request Sent',
          'Your booking request was submitted. The provider will receive it and you will be notified once it is accepted. After acceptance, return here or visit the Notifications tab to proceed to payment.',
          [
            {
              text: 'View Notifications',
              onPress: () => {
                onClose();
                router.push('/(customer)/notifications');
              },
            },
            {
              text: 'OK',
              style: 'default',
              onPress: () => {
                onClose();
              },
            },
          ],
        );
        return;
      } else {
        Alert.alert('Error', 'Failed to create booking. No booking ID received.');
      }
    } catch (error: any) {
      console.error('Booking creation error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        responseData: error.responseData,
        statusCode: error.statusCode,
        errors: error.errors
      });
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      // Check multiple possible error structures
      if (error.errors) {
        // Validation errors from axios interceptor
        const firstKey = Object.keys(error.errors)[0];
        if (firstKey && Array.isArray(error.errors[firstKey]) && error.errors[firstKey].length > 0) {
          errorMessage = error.errors[firstKey][0];
        }
      } else if (error.response?.data?.errors) {
        // Validation errors from response
        const errors = error.response.data.errors;
        const firstKey = Object.keys(errors)[0];
        if (firstKey && Array.isArray(errors[firstKey]) && errors[firstKey].length > 0) {
          errorMessage = errors[firstKey][0];
        }
      } else if (error.responseData?.message) {
        // Error message from responseData (set by axios interceptor)
        errorMessage = error.responseData.message;
      } else if (error.response?.data?.message) {
        // Error message from response
        errorMessage = error.response.data.message;
      } else if (error.message) {
        // Generic error message
        errorMessage = error.message;
      }

      if (error.response?.status === 401 || error.statusCode === 401) {
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContent}
        >
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

            {/* Address Selection Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📍 Where should we send the provider?</Text>
              
              <View style={styles.optionsContainer}>
                {/* Current Location */}
                <TouchableOpacity 
                  style={styles.optionRow} 
                  onPress={() => handleOptionChange('current')}
                  disabled={loadingLocation}
                >
                  <Ionicons 
                    name={addressOption === 'current' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={addressOption === 'current' ? Colors.primary : Colors.text.secondary} 
                  />
                  <Text style={styles.optionText}>Use my current location</Text>
                  {loadingLocation && addressOption === 'current' && (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>

                {/* Pin on Map */}
                <TouchableOpacity 
                  style={styles.optionRow} 
                  onPress={() => handleOptionChange('map')}
                >
                  <Ionicons 
                    name={addressOption === 'map' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={addressOption === 'map' ? Colors.primary : Colors.text.secondary} 
                  />
                  <Text style={styles.optionText}>Pin on map</Text>
                </TouchableOpacity>

                {addressOption === 'map' && mapLocation && (
                  <View style={styles.mapLocationDisplay}>
                    <Ionicons name="location" size={20} color={Colors.primary} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.mapLocationText}>{mapLocation.address}</Text>
                      <Text style={styles.mapCoordinatesText}>
                        {mapLocation.latitude.toFixed(6)}, {mapLocation.longitude.toFixed(6)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowMapPicker(true)}>
                      <Text style={styles.changeLocationText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Saved Addresses */}
                <TouchableOpacity 
                  style={styles.optionRow} 
                  onPress={() => handleOptionChange('saved')}
                >
                  <Ionicons 
                    name={addressOption === 'saved' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={addressOption === 'saved' ? Colors.primary : Colors.text.secondary} 
                  />
                  <Text style={styles.optionText}>Choose from my saved addresses</Text>
                </TouchableOpacity>

                {addressOption === 'saved' && (
                  <View style={styles.savedAddressesContainer}>
                    {loadingAddresses ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : savedAddresses.length > 0 ? (
                      <>
                        <TouchableOpacity
                          style={styles.addressSelector}
                          onPress={() => setShowSavedAddressPicker(!showSavedAddressPicker)}
                        >
                          <Text style={styles.addressSelectorText}>
                            {savedAddresses.find(loc => loc.id.toString() === selectedSavedAddressId)?.label?.toUpperCase() || 'Select address'}: {savedAddresses.find(loc => loc.id.toString() === selectedSavedAddressId)?.addressLine1}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={Colors.text.secondary} />
                        </TouchableOpacity>
                        
                        {showSavedAddressPicker && (
                          <View style={styles.savedAddressList}>
                            {savedAddresses.map((loc) => (
                              <TouchableOpacity
                                key={loc.id}
                                style={styles.savedAddressItem}
                                onPress={() => handleSavedAddressSelect(loc)}
                              >
                                <Ionicons 
                                  name={loc.label === 'home' ? 'home' : (loc.label === 'office' ? 'business' : 'location')} 
                                  size={18} 
                                  color={Colors.primary} 
                                />
                                <View style={styles.savedAddressInfo}>
                                  <Text style={styles.savedAddressLabel}>{loc.label?.toUpperCase()}</Text>
                                  <Text style={styles.savedAddressText}>{loc.addressLine1}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={styles.noAddressesText}>No saved addresses found.</Text>
                    )}
                  </View>
                )}

                {/* New Address */}
                <TouchableOpacity 
                  style={styles.optionRow} 
                  onPress={() => handleOptionChange('new')}
                >
                  <Ionicons 
                    name={addressOption === 'new' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={addressOption === 'new' ? Colors.primary : Colors.text.secondary} 
                  />
                  <Text style={styles.optionText}>Enter new address</Text>
                </TouchableOpacity>

                {addressOption === 'new' && (
                  <View style={styles.newAddressContainer}>
                    <TextInput
                      style={styles.addressInput}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Start typing - we'll suggest"
                      placeholderTextColor={Colors.text.secondary}
                      multiline
                    />
                    
                    {/* Save for later sub-form */}
                    <View style={styles.saveAddressForm}>
                      <Text style={styles.saveAddressTitle}>Save this address for later?</Text>
                      <View style={styles.saveOptionsRow}>
                        <TouchableOpacity 
                          style={styles.saveToggle} 
                          onPress={() => setIsSavingNewAddress(!isSavingNewAddress)}
                        >
                          <Ionicons 
                            name={isSavingNewAddress ? 'checkbox' : 'square-outline'} 
                            size={20} 
                            color={Colors.primary} 
                          />
                          <Text style={styles.saveToggleText}>Yes, save this address</Text>
                        </TouchableOpacity>
                      </View>

                      {isSavingNewAddress && (
                        <View style={styles.labelSelection}>
                          <Text style={styles.labelTitle}>Save as:</Text>
                          <View style={styles.labelOptions}>
                            {['home', 'office', 'other'].map((label) => (
                              <TouchableOpacity
                                key={label}
                                style={styles.labelOption}
                                onPress={() => setAddressLabel(label as any)}
                              >
                                <Ionicons 
                                  name={addressLabel === label ? 'radio-button-on' : 'radio-button-off'} 
                                  size={16} 
                                  color={addressLabel === label ? Colors.primary : Colors.text.secondary} 
                                />
                                <Text style={styles.labelOptionText}>{label.charAt(0).toUpperCase() + label.slice(1)}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          {addressLabel === 'other' && (
                            <TextInput
                              style={styles.customLabelInput}
                              value={customLabel}
                              onChangeText={setCustomLabel}
                              placeholder="Specify label (e.g., Mom's house)"
                              placeholderTextColor={Colors.text.secondary}
                            />
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Agreed Price - Shows after service is selected */}
            {selectedServiceId && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Agreed Price (ETB) *</Text>
                <Text style={styles.priceHint}>
                  Enter the price you discussed with the provider
                  {servicePrice > 0 && ` (Base price: ETB ${servicePrice})`}
                </Text>
                <TextInput
                  style={styles.priceInput}
                  value={agreedPrice}
                  onChangeText={(text) => {
                    // Only allow numbers and decimal point
                    const filtered = text.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const parts = filtered.split('.');
                    if (parts.length > 2) {
                      setAgreedPrice(parts[0] + '.' + parts.slice(1).join(''));
                    } else {
                      setAgreedPrice(filtered);
                    }
                  }}
                  placeholder="0.00"
                  placeholderTextColor={Colors.text.secondary}
                  keyboardType="decimal-pad"
                />
                {agreedPrice && parseFloat(agreedPrice) > 0 && (
                  <View style={styles.pricePreview}>
                    <Text style={styles.pricePreviewLabel}>You will pay:</Text>
                    <Text style={styles.pricePreviewValue}>ETB {parseFloat(agreedPrice).toFixed(2)}</Text>
                    {serviceDuration && (
                      <Text style={styles.priceNote}>Estimated duration: {serviceDuration}</Text>
                    )}
                    <Text style={styles.priceNote}>
                      Platform fee will be added at checkout
                    </Text>
                  </View>
                )}
              </View>
            )}

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
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <AppButton
              title="Send Request"
              onPress={handleSendRequest}
              loading={loading || createBooking.isPending}
              disabled={loading || createBooking.isPending || !selectedServiceId || !agreedPrice || parseFloat(agreedPrice) <= 0}
              style={styles.confirmButton}
            />
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Map Location Picker Modal */}
      {showMapPicker && (
        <Modal
          visible={showMapPicker}
          animationType="slide"
          onRequestClose={() => setShowMapPicker(false)}
        >
          <MapLocationPicker
            initialLocation={mapLocation || userLocation}
            onLocationSelect={(location) => {
              console.log('Map location selected:', location);
              setMapLocation(location);
              setAddress(location.address);
              setShowMapPicker(false);
              // Show confirmation
              Alert.alert(
                'Location Selected',
                `Lat: ${location.latitude.toFixed(6)}\nLng: ${location.longitude.toFixed(6)}\n${location.address}`,
                [{ text: 'OK' }]
              );
            }}
            onClose={() => setShowMapPicker(false)}
          />
        </Modal>
      )}
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
  priceHint: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  priceInput: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  pricePreview: {
    backgroundColor: Colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  pricePreviewLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  pricePreviewValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  priceNote: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 2,
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
    borderRadius: 10,
  },
  // New Styles
  optionsContainer: {
    marginTop: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 10,
  },
  savedAddressesContainer: {
    marginLeft: 30,
    marginBottom: 10,
  },
  addressSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addressSelectorText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  savedAddressList: {
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  savedAddressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  savedAddressInfo: {
    marginLeft: 10,
    flex: 1,
  },
  savedAddressLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.text.secondary,
  },
  savedAddressText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  noAddressesText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  newAddressContainer: {
    marginLeft: 30,
  },
  saveAddressForm: {
    marginTop: 15,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveAddressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 10,
  },
  saveOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  saveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveToggleText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 8,
  },
  labelSelection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  labelTitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  labelOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  labelOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelOptionText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 6,
  },
  customLabelInput: {
    padding: 10,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 14,
    color: Colors.text.primary,
  },
  mapLocationDisplay: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapLocationText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  mapCoordinatesText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },
  changeLocationText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
