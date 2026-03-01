// app/(customer)/dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useLocation } from '../../hooks/useLocation';
import { useSearch } from '../../hooks/useSearch';
import { useTopRatedProviders } from '../../hooks/useCustomerQueries';
import { ServiceSearch } from '../../components/customer/ServiceSearch';
import { ProviderCard } from '../../components/customer/ProviderCard';
import { FilterModal } from '../../components/customer/FilterModal';
import { ServiceRequestModal } from '../../components/customer/ServiceRequestModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { customerService } from '@/app/services/customer.service';
import { paymentService } from '@/app/services/payment.service';
import type { ServiceProvider } from '@/app/types/customer.types';

// Import the appropriate map based on platform
let MapComponent: any;
if (Platform.OS === 'web') {
  // For web, use the Leaflet map
  MapComponent = require('../../components/Map/index').default;
} else {
  // For mobile, use the React Native Maps component
  MapComponent = require('../../components/Map').default;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { location, loading: locationLoading } = useLocation();
  
  console.log('Dashboard - Location:', location);
  console.log('Dashboard - Location Loading:', locationLoading);
  
  const {
    query,
    setQuery,
    filters,
    updateFilters,
    results: providers,
    loading: searchLoading,
    loadMore,
    refresh: refreshSearch,
  } = useSearch();

  console.log('Dashboard - Search Hook - Query:', query);
  console.log('Dashboard - Search Hook - Loading:', searchLoading);
  console.log('Dashboard - Search Hook - Providers:', providers.length);

  const { data: topRatedProviders, isLoading: topRatedLoading } = useTopRatedProviders(5);

  const [showMapView, setShowMapView] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Load user data and service categories on mount
  useEffect(() => {
    loadUserData();
    loadServiceCategories();
  }, []);

  // Trigger initial search when location becomes available
  useEffect(() => {
    if (location && !locationLoading) {
      console.log('Dashboard - Location available, triggering initial search...');
      refreshSearch();
    }
  }, [location, locationLoading, refreshSearch]);

  const loadServiceCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await customerService.getServiceCategories();
      if (response.success && response.data) {
        setServiceCategories(response.data);
        setAllCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load service categories:', error);
      // Fallback to empty array if API fails
      setServiceCategories([]);
      setAllCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchAllCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await customerService.getServiceCategories();
      if (response.success && response.data) {
        setAllCategories(response.data);
        setShowAllCategories(true);
      }
    } catch (error) {
      console.error('Failed to fetch all service categories:', error);
      Alert.alert('Error', 'Failed to load all categories. Please try again.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const searchCategories = serviceCategories
    .map((c: any) => ({
      id: (c.catagoryID ?? c.id ?? '').toString(),
      name: c.name ?? 'Service',
      icon: c.icon,
    }))
    .filter((c: any) => c.id);

  const loadUserData = async () => {
    try {
      setLoadingUser(true);
      const profileResponse = await customerService.getProfile();
      if (profileResponse.success) {
        setUser(profileResponse.data);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  // Generate search suggestions based on query
  useEffect(() => {
    console.log('Dashboard - Query changed:', query);
    console.log('Dashboard - Location available:', !!location);
    console.log('Dashboard - Providers count:', providers.length);
    
    if (query.length > 1) {
      // Get suggestions from API
      const fetchSuggestions = async () => {
        try {
          const response = await customerService.getSearchSuggestions(query);
          if (response.success) {
            setSuggestions(response.data || []);
          }
        } catch (error) {
          // Fallback to mock suggestions
          const mockSuggestions = [
            `${query} plumbing`,
            `${query} electrician`,
            `${query} cleaning`,
            `${query} repair`,
          ];
          setSuggestions(mockSuggestions);
        }
      };

      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query, location, providers.length]);

  const handleCategorySelect = (categoryId: string) => {
    console.log('Dashboard - Category selected:', categoryId);
    setSelectedCategory(categoryId);
    updateFilters({ categoryId });
  };

  // Test function to manually trigger search
  const testSearch = async () => {
    console.log('Dashboard - Testing search...');
    console.log('Dashboard - Location available:', !!location);
    
    // Test 1: Try search without location first
    try {
      console.log('Dashboard - Testing search without location...');
      const response1 = await customerService.searchProviders({
        query: 'plumbing',
        sortBy: 'rating',
        minRating: 0,
        maxDistance: 50,
        page: 1,
        perPage: 10,
      });
      console.log('Dashboard - Test search response (no location):', response1);
    } catch (error) {
      console.error('Dashboard - Test search error (no location):', error);
    }

    // Test 2: Try with location if available
    if (location) {
      try {
        console.log('Dashboard - Testing search with location...');
        const response2 = await customerService.searchProviders({
          query: 'plumbing',
          sortBy: 'rating',
          minRating: 0,
          maxDistance: 50,
          page: 1,
          perPage: 10,
        });
        console.log('Dashboard - Test search response (with location):', response2);
      } catch (error) {
        console.error('Dashboard - Test search error (with location):', error);
      }
    } else {
      console.log('Dashboard - No location available for search');
    }

    // Test 3: Try a simple API call to see if backend is reachable
    try {
      console.log('Dashboard - Testing backend connectivity...');
      const profileResponse = await customerService.getProfile();
      console.log('Dashboard - Backend connectivity test:', profileResponse.success ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.error('Dashboard - Backend connectivity error:', error);
    }
  };

  const handleProviderSelect = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setShowRequestModal(true);
  };

  const handleFilterApply = (newFilters: any) => {
    updateFilters(newFilters);
  };

  const handleVoiceSearch = () => {
    Alert.alert('Voice Search', 'Voice search feature coming soon!');
  };

  const handleServiceRequest = async (requestData: any) => {
    try {
      // Create service request
      const bookingResponse = await customerService.createBooking({
        provider_id: selectedProvider?.id || '',
        service_id: requestData.serviceId || '',
        scheduled_date: requestData.scheduledDate || '',
        scheduled_time: requestData.scheduledTime || '',
        address: requestData.address || '',
        description: requestData.description || '',
        estimated_price: requestData.estimatedPrice || 0,
      });

      if (bookingResponse.success) {
        // Initialize payment
        const paymentResponse = await paymentService.initializeChapaPayment({
          amount: requestData.estimatedPrice || 0,
          email: user?.email || 'customer@example.com',
          firstName: user?.firstName || 'Customer',
          lastName: user?.lastName || 'User',
          phoneNumber: user?.phoneNumber,
          customerId: user?.customerID,
          bookingId: bookingResponse.data.id,
          paymentMethod: requestData.paymentMethod,
          description: `Payment for ${requestData.serviceName}`,
        });

        if (paymentResponse.checkoutUrl) {
          // Close modal and redirect to payment
          setShowRequestModal(false);
          setSelectedProvider(null);
          
          // Open payment URL in browser/webview
          if (Platform.OS === 'web') {
            window.open(paymentResponse.checkoutUrl, '_blank');
          } else {
            router.push({
              pathname: '/(customer)/payment',
              params: { url: paymentResponse.checkoutUrl }
            });
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process service request. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSearch();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>
          Hello, {loadingUser ? '👋' : user?.firstName ? user.firstName.split(' ')[0] : 'User'}! 👋
        </Text>
        <Text style={styles.subtitle}>Find trusted service providers</Text>
      </View>

      <View style={styles.headerActions}>
        {/* Temporary test button */} 
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/(customer)/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.text.primary} />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>3</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/(customer)/profile')}
        >
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
          ) : (
            <Ionicons name="person-circle" size={40} color="gray" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategories = () => {
    if (loadingCategories) {
      return (
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Service Categories</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {[1, 2, 3, 4, 5].map((index) => (
              <View key={index} style={[styles.categoryCard, styles.skeletonCard]} />
            ))}
          </ScrollView>
        </View>
      );
    }

    if (!serviceCategories.length) {
      return null;
    }

    return (
      <View style={styles.categoriesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Service Categories</Text>
          <TouchableOpacity onPress={fetchAllCategories}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          {serviceCategories.map((category) => (
            <TouchableOpacity
              key={(category.catagoryID ?? category.id ?? Math.random()).toString()}
              style={[
                styles.categoryCard,
                selectedCategory === (category.catagoryID?.toString() || category.id?.toString() || '') && styles.categoryCardSelected,
              ]}
              onPress={() => {
                const categoryId = (category.catagoryID?.toString() || category.id?.toString() || '');
                if (!categoryId) return;
                handleCategorySelect(categoryId);
                // Update search to filter by category
                updateFilters({ categoryId });
                refreshSearch();
              }}
            >
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>{category.icon || '🔧'}</Text>
              </View>
              <Text style={styles.categoryName}>{category.name || 'Service'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTopRated = () => {
    if (topRatedLoading) {
      return <LoadingSpinner />;
    }

    if (!topRatedProviders?.length) {
      return null;
    }

    return (
      <View style={styles.topRatedSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="star" size={20} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Top Rated Pros</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(customer)/search/results')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.topRatedScroll}
        >
          {topRatedProviders.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={styles.topRatedCard}
              onPress={() => handleProviderSelect(provider)}
            >
              <Image
                source={{ uri: provider.profileImage || 'https://via.placeholder.com/60' }}
                style={styles.topRatedImage}
              />
              <Text style={styles.topRatedName} numberOfLines={1}>
                {provider.businessName}
              </Text>
              <View style={styles.topRatedRating}>
                <Ionicons name="star" size={14} color={Colors.warning} />
                <Text style={styles.topRatedRatingText}>{provider.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.topRatedReviews}>({provider.reviewCount} reviews)</Text>
              {provider.distance && (
                <Text style={styles.topRatedDistance}>
                  {provider.distance < 1 
                    ? `${Math.round(provider.distance * 1000)}m` 
                    : `${provider.distance.toFixed(1)}km`
                  }
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderViewToggle = () => (
    <View style={styles.viewToggle}>
      <TouchableOpacity
        style={[styles.viewToggleButton, !showMapView && styles.viewToggleActive]}
        onPress={() => setShowMapView(false)}
      >
        <Ionicons
          name="list"
          size={20}
          color={!showMapView ? Colors.primary : Colors.text.secondary}
        />
        <Text style={[styles.viewToggleText, !showMapView && styles.viewToggleTextActive]}>
          List
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.viewToggleButton, showMapView && styles.viewToggleActive]}
        onPress={() => setShowMapView(true)}
      >
        <Ionicons
          name="map"
          size={20}
          color={showMapView ? Colors.primary : Colors.text.secondary}
        />
        <Text style={[styles.viewToggleText, showMapView && styles.viewToggleTextActive]}>
          Map
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMapView = () => {
    // Convert providers to markers format
    const markers = providers
      .filter(provider => provider.location) // Filter out providers without location
      .map(provider => {
        // TypeScript assertion to ensure location exists after filter
        const location = provider.location!;
        return {
          position: Platform.OS === 'web'
            ? [location.latitude, location.longitude]
            : { latitude: location.latitude, longitude: location.longitude },
          title: provider?.businessName ?? provider?.name ?? 'Service Provider',
          description: `Rating: ${provider.rating || 0} ⭐ • ${provider.reviewCount || 0} reviews${provider.distance ? ` • ${provider.distance < 1 ? `${Math.round(provider.distance * 1000)}m` : `${provider.distance.toFixed(1)}km`} away` : ''}`,
          rating: provider.rating || 0,
          reviewCount: provider.reviewCount || 0,
          distance: provider.distance,
          onPress: () => handleProviderSelect(provider),
        };
      });

    // Prepare center coordinates
    const center = location
      ? (Platform.OS === 'web'
        ? [location.latitude, location.longitude]
        : { latitude: location.latitude, longitude: location.longitude })
      : (Platform.OS === 'web'
        ? [9.03, 38.74]
        : { latitude: 9.03, longitude: 38.74 });

    return (
      <View style={styles.mapContainer}>
        <MapComponent
          center={center}
          markers={markers}
          style={{ height: '100%', width: '100%' }}
          zoom={13}
          showUserLocation={true}
          onMarkerPress={(marker: any) => marker.onPress && marker.onPress()}
        />
      </View>
    );
  };

  const renderProviderList = () => (
        <FlatList
      data={providers}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ProviderCard
          provider={item}
          onPress={() => handleProviderSelect(item)}
          showDistance={true}
          showBadges={true}
          showActions={true}
          showServices={true}
          showCategory={true}
        />
      )}
      contentContainerStyle={styles.providersList}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        searchLoading ? <LoadingSpinner /> : null
      }
      ListEmptyComponent={
        !searchLoading && !locationLoading ? (
          <EmptyState
            icon="search-outline"
            title="No providers found"
            message="Try adjusting your search or filters"
            actionLabel="Clear Filters"
            onAction={() => {
              setQuery('');
              updateFilters({});
            }}
            variant="default"
          />
        ) : null
      }
    />
  );

  if (locationLoading && !providers.length) {
    return (
      <View style={styles.initialLoading}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Finding providers near you...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <View style={styles.searchContainer}>
        <ServiceSearch
          value={query}
          onChangeText={setQuery}
          onSearch={() => refreshSearch()}
          onFilterPress={() => setShowFilterModal(true)}
          onVoicePress={handleVoiceSearch}
          onCategorySelect={handleCategorySelect}
          suggestions={suggestions}
          searchResults={providers}
          categories={searchCategories}
        />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderCategories()}
        {renderTopRated()}

        {query || filters.categoryId ? (
          <>
            {renderViewToggle()}

            {showMapView ? (
              renderMapView()
            ) : (
              renderProviderList()
            )}
          </>
        ) : (
          <View style={styles.popularServices}>
            <Text style={styles.popularTitle}>Popular Services Near You</Text>
            <View style={styles.popularGrid}>
              {searchCategories.slice(0, 6).map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.popularItem}
                  onPress={() => {
                    handleCategorySelect(category.id);
                    router.push({
                      pathname: '/(customer)/search/results',
                      params: { categoryId: category.id },
                    });
                  }}
                >
                  <Text style={styles.popularItemIcon}>{category.icon || '🔧'}</Text>
                  <Text style={styles.popularItemText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {showAllCategories && (
          <View style={styles.allCategoriesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Services</Text>
              <TouchableOpacity onPress={() => setShowAllCategories(false)}>
                <Text style={styles.seeAllText}>Hide</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.allCategoriesGrid}>
              {allCategories.map((category) => (
                <TouchableOpacity
                  key={(category.catagoryID ?? category.id ?? Math.random()).toString()}
                  style={styles.allCategoryItem}
                  onPress={() => {
                    const categoryId = (category.catagoryID?.toString() || category.id?.toString() || '');
                    if (!categoryId) return;
                    handleCategorySelect(categoryId);
                    setShowAllCategories(false);
                    router.push({
                      pathname: '/(customer)/search/results',
                      params: { categoryId },
                    });
                  }}
                >
                  <View style={styles.allCategoryIconContainer}>
                    <Text style={styles.allCategoryIcon}>{category.icon || '🔧'}</Text>
                  </View>
                  <Text style={styles.allCategoryName} numberOfLines={2}>
                    {category.name || 'Service'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
        initialFilters={filters}
      />

     // app/(customer)/dashboard.tsx - Fix the ServiceRequestModal usage

<ServiceRequestModal
  visible={showRequestModal}
  onClose={() => {
    setShowRequestModal(false);
    setSelectedProvider(null);
  }}
  provider={selectedProvider}
  userLocation={location ? {
    latitude: location.latitude,
    longitude: location.longitude,
  } : undefined}
  // Remove onSubmit completely - the modal handles booking internally
/>
    </SafeAreaView>
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
    paddingTop: 10,
    paddingBottom: 10,
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
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    marginRight: 16,
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 2,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  content: {
    flex: 1,
  },
  categoriesSection: {
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  categoriesScroll: {
    paddingLeft: 20,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  categoryCardSelected: {
    opacity: 1,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  topRatedSection: {
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    marginBottom: 8,
  },
  topRatedScroll: {
    paddingLeft: 20,
  },
  topRatedCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRatedImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  topRatedName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  topRatedRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topRatedRatingText: {
    marginLeft: 2,
    fontSize: 11,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  topRatedReviews: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  topRatedDistance: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
  },
  viewToggleActive: {
    backgroundColor: Colors.primary + '20',
  },
  viewToggleText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  viewToggleTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  mapContainer: {
    height: 500,
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  providersList: {
    padding: 20,
    paddingBottom: 100,
  },
  popularServices: {
    padding: 20,
  },
  popularTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  popularItem: {
    width: '33.33%',
    padding: 5,
  },
  popularItemText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  popularItemIcon: {
    fontSize: 24,
    textAlign: 'center',
    color: Colors.primary,
  },
  bottomPadding: {
    height: 80,
  },
  skeletonCard: {
    backgroundColor: '#e0e0e0',
    opacity: 0.7,
  },
  testButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  initialLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  allCategoriesSection: {
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    marginBottom: 8,
  },
  allCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  allCategoryItem: {
    width: '33.33%',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
  },
  allCategoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  allCategoryIcon: {
    fontSize: 24,
  },
  allCategoryName: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
