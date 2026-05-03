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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default true - user is already on the authenticated dashboard
  const [loading, setLoading] = useState(false);

  // Address selection state
  const [addressOption, setAddressOption] = useState<'current' | 'saved' | 'map' | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<UserLocation[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>('');
  const [showSavedAddressPicker, setShowSavedAddressPicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(userLocation || null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // GPS Save Panel state
  const [showGPSSavePanel, setShowGPSSavePanel] = useState(false);
  const [gpsSaveToggle, setGPSSaveToggle] = useState(true);
  const [gpsCustomLabel, setGPSCustomLabel] = useState('');
  const [gpsLabelError, setGPSLabelError] = useState('');

  // Get provider's services
  const providerServices = provider?.services || [];

  // Helper function to get display label (custom_label if exists, otherwise label)
  const getDisplayLabel = (loc: UserLocation): string => {
    if (loc.custom_label) {
      return loc.custom_label;
    }
    return loc.label || 'Location';
  };

  // Helper function to extract city from full address
  const extractCity = (fullAddress: string): string => {
    // Remove "Amhara" and "Ethiopia" from the address
    // Expected format: "Street, City, Amhara, Ethiopia" or "City, Amhara, Ethiopia"
    const parts = fullAddress.split(',').map(p => p.trim());
    
    // Filter out "Amhara", "Ethiopia", and empty strings
    const filtered = parts.filter(p => 
      p && 
      p.toLowerCase() !== 'amhara' && 
      p.toLowerCase() !== 'ethiopia'
    );
    
    // Return the last remaining part (usually the city) or the first part if only one remains
    if (filtered.length === 0) return fullAddress;
    if (filtered.length === 1) return filtered[0];
    
    // If multiple parts remain, return the last one (city)
    return filtered[filtered.length - 1];
  };

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

  const handleOptionChange = async (option: 'current' | 'saved' | 'map') => {
    console.log('Address option changed to:', option);
    setAddressOption(option);
    
    if (option === 'current') {
      // Request location permission and get current location
      const locationData = await requestCurrentLocation();
      // Show save panel after getting location
      if (locationData) {
        setShowGPSSavePanel(true);
      }
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
  
  const handleGPSSaveContinue = async () => {
    // Validate if saving
    if (gpsSaveToggle) {
      const trimmedLabel = gpsCustomLabel.trim();
      
      if (!trimmedLabel) {
        setGPSLabelError('Please enter a label for this location');
        return;
      }
      
      // Check for duplicate (case-insensitive)
      const isDuplicate = savedAddresses.some(
        addr => (addr.label === 'other' ? addr.custom_label : addr.label)?.toLowerCase() === trimmedLabel.toLowerCase()
      );
      
      if (isDuplicate) {
        setGPSLabelError('There is a location labeled with this exact name. Please change it.');
        return;
      }
      
      // Validate coordinates before saving
      if (!currentLocation?.latitude || !currentLocation?.longitude || 
          (currentLocation.latitude === 0 && currentLocation.longitude === 0)) {
        console.error('Invalid GPS coordinates:', currentLocation);
        Alert.alert('Error', 'Invalid GPS coordinates. You can still continue with your booking.');
        setShowGPSSavePanel(false);
        return;
      }
      
      // Save the address
      try {
        console.log('Saving GPS address:', {
          full_address: currentLocation.address || 'GPS Location',
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          label: 'other',
          custom_label: trimmedLabel,
        });
        
        const saveResponse = await customerService.addLocation({
          full_address: currentLocation.address || 'GPS Location',
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          label: 'other',
          custom_label: trimmedLabel,
          is_default: false,
        } as any);
        
        console.log('Save response:', saveResponse);
        
        if (saveResponse.success) {
          // Refresh saved addresses
          await fetchSavedAddresses();
          console.log('Address saved successfully');
        } else {
          console.error('Save failed:', saveResponse);
          Alert.alert('Error', 'Failed to save address. You can still continue with your booking.');
        }
      } catch (error: any) {
        console.error('Failed to save GPS address:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response,
          responseData: error.responseData,
        });
        Alert.alert('Error', 'Failed to save address. You can still continue with your booking.');
      }
    }
    
    setShowGPSSavePanel(false);
  };

  const handleSavedAddressSelect = (loc: UserLocation) => {
    setSelectedSavedAddressId(loc.id.toString());
    setAddress(loc.addressLine1 || '');
    setShowSavedAddressPicker(false);
  };

  const checkAuthAndLoadUser = async () => {
    try {
      console.log('[ServiceRequestModal] Checking auth...');
      // Wait for the API service to finish loading tokens from storage
      await api.waitForReady();
      
      const authenticated = api.isAuthenticated();
      console.log('[ServiceRequestModal] Auth result:', { authenticated });
      
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        await loadUserData();
      } else {
        // User is genuinely not logged in (e.g. arrived via a provider's shared link)
        // Show login/register prompt
        Alert.alert(
          t('booking.authRequired', 'Account Required'),
          t('booking.loginOrRegister', 'You need an account to book a service. Please log in or create a new account.'),
          [
            {
              text: t('login.loginButton', 'Login'),
              onPress: () => {
                onClose();
                router.push('/(auth)/login');
              }
            },
            {
              text: t('register.registerButton', 'Register'),
              onPress: () => {
                onClose();
                router.push('/(auth)/register');
              }
            },
            {
              text: t('common.cancel', 'Cancel'),
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // On error, try to load user data anyway — don't block the dashboard user
      setIsAuthenticated(true);
      await loadUserData();
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
      Alert.alert(t('common.info', 'Not Available'), t('booking.errors.slotUnavailable', 'This time slot is already booked. Please select another time.'));
      return;
    }
    
    const [hours, minutes] = timeSlot.time.split(':').map(Number);
    const newTime = new Date(selectedDate);
    newTime.setHours(hours, minutes, 0, 0);
    setSelectedTime(newTime);
  };

  const handleServiceSelect = (service: ProfessionalService) => {
    setSelectedServiceId(service.serviceId?.toString() || service.id?.toString() || '');
    setSelectedServiceName(service.serviceName || service.service?.name || t('providerProfile.categoryFallback', 'Service Provider'));
    
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
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const validateForm = () => {
    if (!selectedServiceId) {
      Alert.alert(t('common.error', 'Error'), t('booking.errors.selectService', 'Please select a service'));
      return false;
    }

    // Validate agreed price
    if (!agreedPrice || agreedPrice.trim() === '') {
      Alert.alert(t('common.error', 'Error'), t('booking.errors.enterPrice', 'Please enter the agreed price'));
      return false;
    }

    const priceValue = parseFloat(agreedPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert(t('common.error', 'Error'), t('booking.errors.invalidPrice', 'Please enter a valid price (numbers only)'));
      return false;
    }
    
    // Validate location differently based on selection source
    if (addressOption === 'current') {
      if (!currentLocation?.latitude || !currentLocation?.longitude) {
        Alert.alert(t('booking.address.title', 'Location Required'), t('booking.errors.locationRequired', 'We could not detect your GPS coordinates. Please ensure location services are enabled or manually enter a new address below.'));
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
    } else {
      Alert.alert('Error', 'Please select an address option');
      return false;
    }
    
    // Validate selected time is in the future
    const now = new Date();
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    
    if (selectedDateTime < now) {
      Alert.alert(t('common.error', 'Error'), t('booking.errors.futureDate', 'Please select a future date and time'));
      return false;
    }
    
    // Validate time slot is available
    const selectedTimeString = formatTime(selectedTime);
    const selectedSlot = availableTimeSlots.find(
      slot => slot.time === selectedTimeString
    );
    
    if (selectedSlot && !selectedSlot.available) {
      Alert.alert(t('common.error', 'Error'), t('booking.errors.slotUnavailable', 'Selected time slot is no longer available. Please choose another time.'));
      return false;
    }
    
    return true;
  };

  const handleSendRequest = async () => {
    if (!validateForm() || !provider) return;

    // Skip the pre-flight auth check — the customer is already logged in
    // on the dashboard. If the token has truly expired, the API interceptor
    // will return a 401 which is handled in the catch block below.

    setLoading(true);
    try {
      const scheduledDate = selectedDate.toISOString().split('T')[0];

      // Determine location source and data
      let locationSource: 'gps' | 'saved' | 'map' = addressOption === 'current' ? 'gps' : (addressOption === 'saved' ? 'saved' : 'map');
      let savedAddressId = addressOption === 'saved' ? selectedSavedAddressId : undefined;
      let finalAddress = address;
      let finalLatitude = currentLocation?.latitude;
      let finalLongitude = currentLocation?.longitude;

      if (addressOption === 'current' && !address.trim()) {
        finalAddress = currentLocation?.address || t('common.gpsCoords', 'GPS Coordinates Used');
      }

      if (addressOption === 'map' && mapLocation) {
        finalAddress = mapLocation.address;
        finalLatitude = mapLocation.latitude;
        finalLongitude = mapLocation.longitude;
      }

      // Map location source to backend's expected location_type
      let locationType: 'current' | 'saved' | 'pin_on_map' = 'current';
      if (locationSource === 'gps') locationType = 'current';
      else if (locationSource === 'saved') locationType = 'saved';
      else if (locationSource === 'map') locationType = 'pin_on_map';

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
        formatted_address: locationType === 'pin_on_map' ? finalAddress : undefined,
      });

      const bookingId =
        bookingResponse.id ||
        bookingResponse.bookingID ||
        bookingResponse.data?.id ||
        bookingResponse.data?.bookingID;

      if (bookingResponse && bookingId) {
        Alert.alert(
          t('booking.successTitle', 'Request Sent'),
          t('booking.successMessage', 'Your booking request was submitted. The provider will receive it and you will be notified once it is accepted. After acceptance, return here or visit the Notifications tab to proceed to payment.'),
          [
            {
              text: t('booking.viewNotifications', 'View Notifications'),
              onPress: () => {
                onClose();
                router.push('/(customer)/notifications');
              },
            },
            {
              text: t('common.ok', 'OK'),
              style: 'default',
              onPress: () => {
                onClose();
              },
            },
          ],
        );
        return;
      } else {
        Alert.alert(t('common.error', 'Error'), t('booking.errors.noBookingId', 'Failed to create booking. No booking ID received.'));
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
          t('booking.sessionExpired', 'Session Expired'),
          t('booking.relogin', 'Your session has expired. Please log in again.'),
          [
            {
              text: t('login.loginButton', 'Login'),
              onPress: () => {
                onClose();
                router.push('/(auth)/login');
              }
            },
            {
              text: t('common.cancel', 'Cancel'),
              style: 'cancel'
            }
          ]
        );
      } else if ((error.response?.status === 422 || error.response?.status === 400) && 
                 (errorMessage.toLowerCase().includes('pending') || 
                  errorMessage.toLowerCase().includes('active booking') ||
                  errorMessage.toLowerCase().includes('duplicate'))) {
        // Duplicate booking - detected by status code and message content
        Alert.alert(
          'Active Booking Exists',
          errorMessage,
          [
            {
              text: 'View My Bookings',
              onPress: () => {
                onClose();
                router.push('/(customer)/requests');
              }
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert(t('common.error', 'Booking Error'), errorMessage);
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
          <Text style={styles.sectionTitle}>{t('common.service', 'Service')}</Text>
          <Text style={styles.serviceName}>{t('booking.noServices', 'No services available')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('booking.selectService', 'Select Service *')}</Text>
        <TouchableOpacity
          style={styles.serviceSelector}
          onPress={() => setShowServicePicker(!showServicePicker)}
        >
          <Text style={selectedServiceId ? styles.serviceSelectorText : styles.serviceSelectorPlaceholder}>
            {selectedServiceName || t('booking.chooseService', 'Choose a service')}
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
                    <Text style={styles.serviceItemPrice}>{t('common.currency', 'ETB')} {servicePrice}</Text>
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
          <Text style={styles.timeSlotsLoadingText}>{t('booking.loadingTimes', 'Loading available times...')}</Text>
        </View>
      );
    }

    if (availableTimeSlots.length === 0) {
      return (
        <View style={styles.noTimeSlots}>
          <Text style={styles.noTimeSlotsText}>{t('booking.noTimes', 'No available time slots for this date')}</Text>
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
            <Text style={styles.modalTitle}>{t('booking.title', 'Request Service')}</Text>
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
                  {provider.rating?.toFixed(1) || '0.0'} • {provider.reviewCount || 0} {t('providerCard.reviews', 'reviews')}
                </Text>
              </View>
            </View>

            {/* Service Selection - ALWAYS ACTIVE */}
            {renderServicePicker()}

            {/* Date Selection - ALWAYS ACTIVE */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('booking.selectDate', 'Select Date *')}</Text>
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
              <Text style={styles.sectionTitle}>{t('booking.selectTime', 'Select Time *')}</Text>
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
              <Text style={styles.sectionTitle}>📍 {t('booking.address.title', 'Where should we send the provider?')}</Text>
              
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
                  <Text style={styles.optionText}>{t('booking.address.current', 'Use my current location')}</Text>
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
                  <Text style={styles.optionText}>{t('booking.address.saved', 'Choose from my saved addresses')}</Text>
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
                              {savedAddresses.find(loc => loc.id.toString() === selectedSavedAddressId) 
                                ? getDisplayLabel(savedAddresses.find(loc => loc.id.toString() === selectedSavedAddressId)!)
                                : t('booking.address.selectSaved', 'Select address')}
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
                                  size={20} 
                                  color={Colors.primary} 
                                />
                                <View style={styles.savedAddressInfo}>
                                  <Text style={styles.savedAddressLabel}>{getDisplayLabel(loc)}</Text>
                                  <Text style={styles.savedAddressText}>{extractCity(loc.addressLine1 || '')}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={styles.noAddressesText}>{t('booking.address.noSaved', 'No saved addresses found.')}</Text>
                    )}
                  </View>
                )}

              </View>
            </View>

            {/* Agreed Price - Shows after service is selected */}
            {selectedServiceId && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('booking.price.agreedPrice', 'Agreed Price (ETB) *')}</Text>
                <Text style={styles.priceHint}>
                  {t('booking.price.note', 'Enter the price you discussed with the provider')}
                  {servicePrice > 0 && ` (${t('providerProfile.rate', 'Base price')}: ${t('common.currency', 'ETB')} ${servicePrice})`}
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
                    <Text style={styles.pricePreviewLabel}>{t('common.total', 'You will pay:')}</Text>
                    <Text style={styles.pricePreviewValue}>{t('common.currency', 'ETB')} {parseFloat(agreedPrice).toFixed(2)}</Text>
                    {serviceDuration && (
                      <Text style={styles.priceNote}>{t('common.duration', 'Estimated duration')}: {serviceDuration}</Text>
                    )}
                    <Text style={styles.priceNote}>
                      {t('payment.platformFee', 'Platform fee will be added at checkout')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Description - ALWAYS ACTIVE */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('booking.description.label', 'Description (Optional)')}</Text>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder={t('booking.description.placeholder', 'Describe your issue or requirements')}
                placeholderTextColor={Colors.text.secondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>

            <AppButton
              title={t('booking.submit', 'Send Request')}
              onPress={handleSendRequest}
              loading={loading || createBooking.isPending}
              disabled={loading || createBooking.isPending || !selectedServiceId || !agreedPrice || parseFloat(agreedPrice) <= 0 || !addressOption}
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
            existingLabels={savedAddresses.map(addr => 
              addr.label === 'other' ? (addr.custom_label || '') : (addr.label || '')
            )}
            onLocationSelect={async (location) => {
              console.log('Map location selected:', location);
              setMapLocation(location);
              setAddress(location.address);
              
              // Handle save if requested
              if (location.shouldSave && location.customLabel) {
                try {
                  const saveResponse = await customerService.addLocation({
                    full_address: location.address,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    label: 'other',
                    custom_label: location.customLabel,
                    is_default: false,
                  } as any);
                  
                  if (saveResponse.success) {
                    // Refresh saved addresses
                    await fetchSavedAddresses();
                  }
                } catch (error) {
                  console.error('Failed to save map address:', error);
                  Alert.alert('Error', 'Failed to save address. You can still continue with your booking.');
                }
              }
              
              setShowMapPicker(false);
            }}
            onClose={() => setShowMapPicker(false)}
          />
        </Modal>
      )}
      
      {/* GPS Save Panel Modal */}
      <Modal
        visible={showGPSSavePanel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGPSSavePanel(false)}
      >
        <View style={styles.gpsSavePanelOverlay}>
          <View style={styles.gpsSavePanelContainer}>
            <View style={styles.gpsSavePanelHeader}>
              <Text style={styles.gpsSavePanelTitle}>Save Location</Text>
              <TouchableOpacity onPress={() => setShowGPSSavePanel(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Confirmed Address */}
            <View style={styles.gpsConfirmedAddressContainer}>
              <View style={styles.gpsConfirmedAddressHeader}>
                <Ionicons name="location" size={20} color={Colors.primary} />
                <Text style={styles.gpsConfirmedAddressLabel}>Confirmed Location</Text>
              </View>
              <Text style={styles.gpsConfirmedAddressText}>
                {currentLocation?.address || 'GPS Location'}
              </Text>
              {currentLocation?.latitude && currentLocation?.longitude && (
                <Text style={styles.gpsCoordinatesText}>
                  📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </Text>
              )}
            </View>

            {/* Save Toggle */}
            <TouchableOpacity 
              style={styles.gpsSaveToggleContainer}
              onPress={() => {
                setGPSSaveToggle(!gpsSaveToggle);
                setGPSLabelError('');
              }}
            >
              <Ionicons 
                name={gpsSaveToggle ? 'checkbox' : 'square-outline'} 
                size={24} 
                color={Colors.primary} 
              />
              <Text style={styles.gpsSaveToggleText}>Save this location for future use?</Text>
            </TouchableOpacity>

            {/* Custom Label Input */}
            {gpsSaveToggle && (
              <View style={styles.gpsLabelInputContainer}>
                <Text style={styles.gpsLabelInputLabel}>Location Label</Text>
                <TextInput
                  style={[styles.gpsLabelInput, gpsLabelError ? styles.gpsLabelInputError : null]}
                  value={gpsCustomLabel}
                  onChangeText={(text) => {
                    setGPSCustomLabel(text);
                    setGPSLabelError('');
                  }}
                  placeholder="e.g., Mom's house, Gym, Office 2"
                  placeholderTextColor={Colors.text.secondary}
                  maxLength={50}
                />
                {gpsLabelError ? (
                  <Text style={styles.gpsLabelErrorText}>{gpsLabelError}</Text>
                ) : null}
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity 
              style={styles.gpsContinueButton}
              onPress={handleGPSSaveContinue}
            >
              <Text style={styles.gpsContinueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  savedAddressText: {
    fontSize: 12,
    color: Colors.text.secondary,
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
  // GPS Save Panel Styles
  gpsSavePanelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  gpsSavePanelContainer: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  gpsSavePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gpsSavePanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  gpsConfirmedAddressContainer: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  gpsConfirmedAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpsConfirmedAddressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  gpsConfirmedAddressText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  gpsCoordinatesText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  gpsSaveToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gpsSaveToggleText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  gpsLabelInputContainer: {
    marginBottom: 16,
  },
  gpsLabelInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  gpsLabelInput: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    color: Colors.text.primary,
  },
  gpsLabelInputError: {
    borderColor: Colors.error,
  },
  gpsLabelErrorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  gpsContinueButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  gpsContinueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});
