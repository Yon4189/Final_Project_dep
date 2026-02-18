import Map from '../../components/Map';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

import AppButton from '@/components/AppButton';
import AppInput from '@/components/AppInput';
import { Colors } from '../constants/Colors';
import { SERVICE_CATEGORIES, ServiceCategoryType } from '../constants/Services';

interface ServiceProvider {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  services: string[]; // Array of service names (e.g., ['Leak Repair', 'Pipe Fixing'])
  priceRange: { min: number; max: number };
  distance: number; // in km
  location: {
    latitude: number;
    longitude: number;
  };
  profileImage?: string;
  responseTime?: string; // e.g., "Within 1 hour"
  verified: boolean;
  category?: string; // Main category like 'Plumbing'
}

interface ServiceRequest {
  serviceName: string;
  providerId: string;
  scheduledDate: Date;
  scheduledTime: string;
  address: string;
  specialInstructions?: string;
  totalPrice: number;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryType | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showMapView, setShowMapView] = useState(false);

  // Service request form
  const [requestData, setRequestData] = useState({
    scheduledDate: new Date(),
    scheduledTime: '09:00',
    address: '',
    specialInstructions: '',
  });

  // Get user location
  useEffect(() => {
    getUserLocation();
  }, []);

  // Load providers when service is selected
  useEffect(() => {
    if (selectedService && userLocation) {
      loadProviders();
    }
  }, [selectedService, userLocation]);

  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please enable location services');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });

      // Fetch user's address from coordinates
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address[0]) {
        const street = address[0].name || address[0].street || '';
        const city = address[0].city || address[0].region || '';
        const fullAddress = street ? `${street}, ${city}` : city;
        setRequestData(prev => ({
          ...prev,
          address: fullAddress
        }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Mock data - Replace with actual API call
  const loadProviders = async () => {
    setLoading(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock providers data
    const mockProviders: ServiceProvider[] = [
      {
        id: '1',
        name: 'John Plumbing Pros',
        rating: 4.8,
        reviewCount: 127,
        services: ['Leak Repair', 'Pipe Fixing', 'Toilet Repair'],
        priceRange: { min: 50, max: 200 },
        distance: 2.3,
        location: { latitude: 37.7749 + 0.01, longitude: -122.4194 + 0.01 },
        profileImage: 'https://via.placeholder.com/100',
        responseTime: 'Within 1 hour',
        verified: true,
        category: 'Plumbing',
      },
      {
        id: '2',
        name: 'Quick Fix Electricians',
        rating: 4.9,
        reviewCount: 89,
        services: ['Home Wiring Repair', 'Socket & Switch Repair', 'Light Installation'],
        priceRange: { min: 75, max: 300 },
        distance: 1.5,
        location: { latitude: 37.7749 + 0.005, longitude: -122.4194 - 0.005 },
        responseTime: 'Within 30 mins',
        verified: true,
        category: 'Electrical Services',
      },
      {
        id: '3',
        name: 'Clean Home Services',
        rating: 4.6,
        reviewCount: 203,
        services: ['General House Cleaning', 'Kitchen Cleaning', 'Bathroom Cleaning'],
        priceRange: { min: 40, max: 150 },
        distance: 3.1,
        location: { latitude: 37.7749 - 0.01, longitude: -122.4194 + 0.005 },
        verified: true,
        category: 'Home Cleaning',
      },
      {
        id: '4',
        name: 'AC Repair Experts',
        rating: 4.7,
        reviewCount: 56,
        services: ['AC Installation', 'AC Repair', 'AC Maintenance'],
        priceRange: { min: 100, max: 500 },
        distance: 4.2,
        location: { latitude: 37.7749 + 0.02, longitude: -122.4194 - 0.01 },
        responseTime: 'Within 2 hours',
        verified: true,
        category: 'AC & Home Appliances',
      },
    ];

    // Sort by: 1. Distance (proximity), 2. Rating
    const sortedProviders = mockProviders
      .filter(p => selectedService && p.services.includes(selectedService))
      .sort((a, b) => {
        // First priority: Distance
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        // Second priority: Rating
        return b.rating - a.rating;
      });

    setProviders(sortedProviders);
    setFilteredProviders(sortedProviders);
    setLoading(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredProviders(providers);
      return;
    }

    const filtered = providers.filter(provider =>
      provider.name.toLowerCase().includes(text.toLowerCase()) ||
      provider.services.some(service =>
        service.toLowerCase().includes(text.toLowerCase())
      ) ||
      provider.category?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredProviders(filtered);
  };

  const selectCategory = (category: ServiceCategoryType) => {
    setSelectedCategory(category);
    setSelectedService(null); // Reset service selection
    setShowCategoryModal(false);
    setShowServiceModal(true);
  };

  const selectService = (serviceName: string) => {
    setSelectedService(serviceName);
    setShowServiceModal(false);
  };

  const handleProviderSelect = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setShowRequestModal(true);

    // Center map on provider
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        latitude: provider.location.latitude,
        longitude: provider.location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  };

  const submitServiceRequest = async () => {
    if (!selectedProvider || !selectedService) {
      Alert.alert('Error', 'Please select a service provider');
      return;
    }

    if (!requestData.address.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return;
    }

    // Calculate price based on provider's price range
    const price = (selectedProvider.priceRange.min + selectedProvider.priceRange.max) / 2;

    const serviceRequest: ServiceRequest = {
      serviceName: selectedService,
      providerId: selectedProvider.id,
      scheduledDate: requestData.scheduledDate,
      scheduledTime: requestData.scheduledTime,
      address: requestData.address,
      specialInstructions: requestData.specialInstructions,
      totalPrice: price,
    };
    // ... inside your dashboard return ...
    try {
      // Simulate API call
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Success',
        `Service request sent to ${selectedProvider.name}! They will respond soon.`,
        [
          {
            text: 'View Requests',
            onPress: () => router.push('/customer/requests'),
          },
          {
            text: 'OK', onPress: () => {
              setShowRequestModal(false);
              setLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
      setLoading(false);
    }
  };

  const renderCategoryItem = ({ item }: { item: ServiceCategoryType }) => (
    <TouchableOpacity
      style={[
        styles.serviceItem,
        selectedCategory?.id === item.id && styles.serviceItemSelected,
      ]}
      onPress={() => selectCategory(item)}
    >
      <Text style={styles.serviceIcon}>{item.icon}</Text>
      <Text style={[
        styles.serviceText,
        selectedCategory?.id === item.id && styles.serviceTextSelected,
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderServiceItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.serviceItem,
        selectedService === item && styles.serviceItemSelected,
      ]}
      onPress={() => selectService(item)}
    >
      <Text style={styles.serviceIcon}>🛠️</Text>
      <Text style={[
        styles.serviceText,
        selectedService === item && styles.serviceTextSelected,
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderProviderCard = ({ item }: { item: ServiceProvider }) => (
    <TouchableOpacity
      style={styles.providerCard}
      onPress={() => handleProviderSelect(item)}
    >
      <View style={styles.providerHeader}>
        <View style={styles.providerImageContainer}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.providerImage} />
          ) : (
            <View style={styles.providerImagePlaceholder}>
              <Text style={styles.providerInitials}>
                {item.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          )}
          {item.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.providerInfo}>
          <View style={styles.providerNameRow}>
            <Text style={styles.providerName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={Colors.warning} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({item.reviewCount})</Text>
            </View>
          </View>

          {item.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}

          <View style={styles.serviceTags}>
            {item.services.slice(0, 3).map((service, index) => (
              <View key={index} style={styles.serviceTag}>
                <Text style={styles.serviceTagText}>{service}</Text>
              </View>
            ))}
            {item.services.length > 3 && (
              <View style={styles.moreTag}>
                <Text style={styles.moreText}>+{item.services.length - 3} more</Text>
              </View>
            )}
          </View>

          <View style={styles.providerDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
              <Text style={styles.detailText}>{item.distance.toFixed(1)} km away</Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color={Colors.text.secondary} />
              <Text style={styles.detailText}>{item.responseTime || 'Flexible'}</Text>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="attach-money" size={14} color={Colors.text.secondary} />
              <Text style={styles.detailText}>
                ${item.priceRange.min} - ${item.priceRange.max}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.providerFooter}>
        <AppButton
          title="Request Service"
          onPress={() => handleProviderSelect(item)}
          size="small"
          style={styles.requestButton}
        />
      </View>
    </TouchableOpacity>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await getUserLocation();
    if (selectedService) {
      await loadProviders();
    }
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.subtitle}>Find trusted service providers</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/customer/profile')}
        >
          <Ionicons name="person-circle" size={32} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <AppInput
          placeholder="Search services, categories, or providers..."
          value={searchQuery}
          onChangeText={handleSearch}
          leftIcon={<Ionicons name="search" size={20} color={Colors.text.secondary} />}
          style={styles.searchInput}
        />
        <TouchableOpacity
          style={styles.serviceSelectButton}
          onPress={() => setShowCategoryModal(true)}
        >
          <MaterialCommunityIcons
            name="apps"
            size={24}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Category Quick Select */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.servicesScroll}
      >
        {SERVICE_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.serviceChip,
              selectedCategory?.id === category.id && styles.serviceChipSelected,
            ]}
            onPress={() => {
              setSelectedCategory(category);
              setSelectedService(null);
              setShowServiceModal(true);
            }}
          >
            <Text style={styles.serviceChipIcon}>{category.icon}</Text>
            <Text style={[
              styles.serviceChipText,
              selectedCategory?.id === category.id && styles.serviceChipTextSelected,
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Selected Service Info */}
      {selectedService && selectedCategory && (
        <View style={styles.selectedServiceInfo}>
          <View style={styles.selectedServiceHeader}>
            <Text style={styles.selectedServiceIcon}>{selectedCategory.icon}</Text>
            <View>
              <Text style={styles.selectedCategory}>{selectedCategory.name}</Text>
              <Text style={styles.selectedService}>{selectedService}</Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSelectedService(null);
                setSelectedCategory(null);
              }}
            >
              <Ionicons name="close-circle" size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Toggle View */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleButton, !showMapView && styles.viewToggleActive]}
          onPress={() => setShowMapView(false)}
        >
          <Ionicons name="list" size={20} color={!showMapView ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.viewToggleText, !showMapView && styles.viewToggleTextActive]}>
            List
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewToggleButton, showMapView && styles.viewToggleActive]}
          onPress={() => setShowMapView(true)}
        >
          <Ionicons name="map" size={20} color={showMapView ? Colors.primary : Colors.text.secondary} />
          <Text style={[styles.viewToggleText, showMapView && styles.viewToggleTextActive]}>
            Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading && !selectedService ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Select a service to find providers</Text>
        </View>
      ) : showMapView ? (
        /* Map View Section */
        <View style={styles.mapContainer}>
          {userLocation ? (
            <Map
              userLocation={userLocation}
              providers={filteredProviders}
              onProviderSelect={handleProviderSelect}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text>Loading Map...</Text>
            </View>
          )}

          {/* Keep your Provider List Cards on top of or below the map */}
          <View style={styles.mapProviderList}>
            <FlatList
              data={filteredProviders}
              renderItem={renderProviderCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mapListContent}
            />
          </View>
        </View>
      ) : (
        /* List View */
        <FlatList
          data={filteredProviders}
          renderItem={renderProviderCard}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {selectedService ? (
                <>
                  <Ionicons name="search-outline" size={64} color={Colors.text.secondary} />
                  <Text style={styles.emptyText}>
                    No {selectedService} providers found nearby
                  </Text>
                  <Text style={styles.emptySubtext}>
                    Try a different service or check back later
                  </Text>
                  <AppButton
                    title="Change Service"
                    onPress={() => setShowCategoryModal(true)}
                    variant="outline"
                    style={styles.emptyButton}
                  />
                </>
              ) : (
                <>
                  <Ionicons name="construct-outline" size={64} color={Colors.text.secondary} />
                  <Text style={styles.emptyText}>
                    Select a service category to find providers
                  </Text>
                  <Text style={styles.emptySubtext}>
                    Choose from plumbing, cleaning, electrical, and more
                  </Text>
                  <AppButton
                    title="Browse Services"
                    onPress={() => setShowCategoryModal(true)}
                    variant="outline"
                    style={styles.emptyButton}
                  />
                </>
              )}
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Service Category</Text>
            <FlatList
              data={SERVICE_CATEGORIES}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.serviceGrid}
            />
            <AppButton
              title="Cancel"
              onPress={() => setShowCategoryModal(false)}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* Service Selection Modal */}
      <Modal
        visible={showServiceModal && selectedCategory !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedCategory?.name} Services
              </Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            {selectedCategory && (
              <FlatList
                data={selectedCategory.services}
                renderItem={renderServiceItem}
                keyExtractor={(item, index) => index.toString()}
                ListHeaderComponent={
                  <View style={styles.serviceModalHeader}>
                    <Text style={styles.serviceModalIcon}>{selectedCategory.icon}</Text>
                    <Text style={styles.serviceModalCategory}>{selectedCategory.name}</Text>
                    <Text style={styles.serviceModalDescription}>
                      Choose a specific service from {selectedCategory.name.toLowerCase()}
                    </Text>
                  </View>
                }
              />
            )}
            <AppButton
              title="Back to Categories"
              onPress={() => {
                setShowServiceModal(false);
                setShowCategoryModal(true);
              }}
              variant="outline"
              fullWidth
              style={styles.backButton}
            />
          </View>
        </View>
      </Modal>

      {/* Service Request Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Service</Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {selectedProvider && selectedService && (
              <>
                {/* Provider Info */}
                <View style={styles.requestProviderInfo}>
                  <Text style={styles.requestService}>{selectedService}</Text>
                  <Text style={styles.requestProviderName}>{selectedProvider.name}</Text>
                  <View style={styles.requestProviderDetails}>
                    <View style={styles.requestDetail}>
                      <Ionicons name="star" size={16} color={Colors.warning} />
                      <Text style={styles.requestDetailText}>
                        {selectedProvider.rating.toFixed(1)} ({selectedProvider.reviewCount} reviews)
                      </Text>
                    </View>
                    <View style={styles.requestDetail}>
                      <Ionicons name="location-outline" size={16} color={Colors.text.secondary} />
                      <Text style={styles.requestDetailText}>
                        {selectedProvider.distance.toFixed(1)} km away
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Request Form */}
                <View style={styles.requestForm}>
                  {/* Date */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Date</Text>
                    <TouchableOpacity style={styles.dateInput}>
                      <Ionicons name="calendar-outline" size={20} color={Colors.text.secondary} />
                      <Text style={styles.dateText}>
                        {requestData.scheduledDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Time */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Time</Text>
                    <TouchableOpacity style={styles.timeInput}>
                      <Ionicons name="time-outline" size={20} color={Colors.text.secondary} />
                      <Text style={styles.timeText}>{requestData.scheduledTime}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Address */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Service Address</Text>
                    <AppInput
                      value={requestData.address}
                      onChangeText={(text: string) => setRequestData({ ...requestData, address: text })}
                      placeholder="Enter address for service"
                      multiline
                      style={styles.addressInput}
                    />
                  </View>

                  {/* Special Instructions */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Special Instructions (Optional)</Text>
                    <AppInput
                      value={requestData.specialInstructions}
                      onChangeText={(text: string) => setRequestData({ ...requestData, specialInstructions: text })}
                      placeholder="Any specific requirements?"
                      multiline
                      style={styles.instructionsInput}
                    />
                  </View>

                  {/* Price Estimate */}
                  <View style={styles.priceEstimate}>
                    <Text style={styles.priceLabel}>Estimated Price</Text>
                    <Text style={styles.priceValue}>
                      ${selectedProvider.priceRange.min} - ${selectedProvider.priceRange.max}
                    </Text>
                    <Text style={styles.priceNote}>
                      Final price may vary based on service requirements
                    </Text>
                  </View>

                  {/* Submit Button */}
                  <AppButton
                    title="Confirm & Send Request"
                    onPress={submitServiceRequest}
                    fullWidth
                    loading={loading}
                    style={styles.submitButton}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginRight: 10,
  },
  serviceSelectButton: {
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  servicesScroll: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: Colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  serviceChipSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  serviceChipText: {
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  serviceChipTextSelected: {
    color: Colors.primary,
  },
  selectedServiceInfo: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  selectedServiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedServiceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  selectedCategory: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  selectedService: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  clearButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  viewToggleActive: {
    backgroundColor: Colors.primary + '20',
  },
  viewToggleText: {
    marginLeft: 6,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  viewToggleTextActive: {
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Colors.text.secondary,
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapMarker: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  mapMarkerText: {
    color: Colors.surface,
    fontWeight: 'bold',
    fontSize: 12,
  },
  mapProviderList: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
  },
  mapListContent: {
    paddingHorizontal: 20,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  providerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  providerHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  providerImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  providerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  providerImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInitials: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 2,
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  reviewCount: {
    marginLeft: 4,
    color: Colors.text.secondary,
    fontSize: 12,
  },
  categoryTag: {
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  serviceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  serviceTag: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  serviceTagText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  moreTag: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  moreText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  providerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  providerFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  requestButton: {
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  serviceGrid: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  serviceItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  serviceItemSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  serviceText: {
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  serviceTextSelected: {
    color: Colors.primary,
  },
  serviceModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  serviceModalIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  serviceModalCategory: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 5,
  },
  serviceModalDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 10,
  },
  requestProviderInfo: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  requestService: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  requestProviderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  requestProviderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requestDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestDetailText: {
    marginLeft: 6,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  requestForm: {
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateText: {
    marginLeft: 12,
    color: Colors.text.primary,
    fontSize: 16,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeText: {
    marginLeft: 12,
    color: Colors.text.primary,
    fontSize: 16,
  },
  addressInput: {
    minHeight: 80,
  },
  instructionsInput: {
    minHeight: 60,
  },
  priceEstimate: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 20,
    marginBottom: 30,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  priceNote: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  submitButton: {
    marginTop: 20,
  },
});