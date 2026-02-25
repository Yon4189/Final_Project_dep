// app/(customer)/dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useLocation } from '../../hooks/useLocation';
import { useSearch } from '../../hooks/useSearch';
import { useTopRatedProviders, useNotifications } from '../../hooks/useCustomerQueries';
import { ServiceSearch } from '../../components/customer/ServiceSearch';
import { ProviderCard } from '../../components/customer/ProviderCard';
import { FilterModal } from '../../components/customer/FilterModal';
import { ServiceRequestModal } from '../../components/customer/ServiceRequestModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { api } from '@/app/services/api';
import type { ServiceProvider, Category } from '@/app/types/customer.types';

// Import the appropriate map based on platform
let MapComponent: any;
if (Platform.OS === 'web') {
  MapComponent = require('../../components/Map/index').default;
} else {
  MapComponent = require('../../components/Map').default;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { location, loading: locationLoading } = useLocation();
  const {
    query,
    setQuery,
    filters,
    updateFilters,
    results: providers,
    loading: searchLoading,
    loadMore,
    hasMore,
    refresh: refreshSearch,
  } = useSearch();
  
  // Use the correct hook from useCustomerQueries
  const { data: topRatedProviders, isLoading: topRatedLoading } = useTopRatedProviders(5);
  const { data: notificationsData } = useNotifications(1);
  
  const [showMapView, setShowMapView] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [popularServices, setPopularServices] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Calculate unread notifications
  const unreadCount = notificationsData?.filter((n: any) => !n.read).length || 0;

  // Fetch categories from API
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fix for fetchCategories
const fetchCategories = async () => {
  setCategoriesLoading(true);
  try {
    const response = await api.get('/categories');
    if (response.success) {
      // Type assertion to tell TypeScript this is an array of Category
      setCategories(response.data as Category[]);
    }
  } catch (err) {
    console.log('Error fetching categories:', err);
  } finally {
    setCategoriesLoading(false);
  }
};

// Fix for fetchPopularServices
const fetchPopularServices = async () => {
  try {
    const response = await api.get('/services/popular');
    if (response.success) {
      // Type assertion for the entire response.data as an array
      const servicesData = response.data as Array<{ name: string }>;
      setPopularServices(servicesData.map((s) => s.name));
    }
  } catch (err) {
    console.log('Error fetching popular services:', err);
    setPopularServices(['Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Moving', 'Gardening']);
  }
};


// Fix for fetchSuggestions
const fetchSuggestions = async (searchQuery: string) => {
  try {
    const response = await api.get(`/search/suggestions?q=${searchQuery}`);
    if (response.success) {
      // Type assertion for suggestions
      setSuggestions(response.data as string[]);
    }
  } catch (err) {
    console.log('Error fetching suggestions:', err);
    setSuggestions([
      `${searchQuery} plumbing`,
      `${searchQuery} electrician`,
      `${searchQuery} cleaning`,
      `${searchQuery} repair`,
    ]);
  }
};

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    updateFilters({ categoryId });
    // Navigate to category results
    router.push(`/(customer)/search?category=${categoryId}`);
  };

  const handleProviderSelect = (provider: ServiceProvider) => {
    // Navigate to provider profile
    router.push(`/(customer)/provider/${provider.id}`);
  };

  const handleFilterApply = (newFilters: any) => {
    updateFilters(newFilters);
  };

  const handleVoiceSearch = () => {
    console.log('Voice search activated');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSearch();
    await fetchCategories();
    await fetchPopularServices();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hello, 👋</Text>
        <Text style={styles.subtitle}>Find trusted service providers</Text>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => router.push('/(customer)/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.text.primary} />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => router.push('/(customer)/profile')}
        >
          <Ionicons name="person-circle" size={40} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategories = () => {
    if (categoriesLoading) {
      return (
        <View style={styles.categoriesSection}>
          <LoadingSpinner />
        </View>
      );
    }

    const displayCategories = categories.slice(0, 10);

    return (
      <View style={styles.categoriesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services</Text>
          <TouchableOpacity onPress={() => router.push('/(customer)/categories')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          {displayCategories.map((category: Category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategory === category.id && styles.categoryCardSelected,
              ]}
              onPress={() => handleCategorySelect(category.id)}
            >
              <View style={styles.categoryIconContainer}>
                <Ionicons name={(category.icon as any) || 'construct'} size={24} color={Colors.primary} />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTopRated = () => {
    if (topRatedLoading) {
      return (
        <View style={styles.topRatedSection}>
          <LoadingSpinner />
        </View>
      );
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
          <TouchableOpacity onPress={() => router.push('/(customer)/top-rated')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.topRatedScroll}
        >
          {topRatedProviders.map((provider: ServiceProvider) => (
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
                {provider.businessName || provider.name}
              </Text>
              <View style={styles.topRatedRating}>
                <Ionicons name="star" size={14} color={Colors.warning} />
                <Text style={styles.topRatedRatingText}>{provider.rating?.toFixed(1) || '4.5'}</Text>
              </View>
              <Text style={styles.topRatedReviews}>({provider.reviewCount || 0} reviews)</Text>
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
    if (!providers.length) return null;

    const markers = providers.map(provider => ({
      position: Platform.OS === 'web' 
        ? [provider.location.latitude, provider.location.longitude]
        : { latitude: provider.location.latitude, longitude: provider.location.longitude },
      title: provider?.businessName ?? provider?.name ?? 'Service Provider',
      description: `Rating: ${provider.rating || 4.5} ⭐ • ${provider.reviewCount || 0} reviews`,
    }));

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
          onSearch={setQuery}
          onFilterPress={() => setShowFilterModal(true)}
          onVoicePress={handleVoiceSearch}
          suggestions={suggestions}
          onCategorySelect={handleCategorySelect}
          placeholder="Search for plumbing, electrical..."
          showRecent={true}
          searchResults={providers.slice(0, 5)}
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
              {popularServices.slice(0, 6).map((service, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.popularItem}
                  onPress={() => setQuery(service)}
                >
                  <Ionicons name="search" size={24} color={Colors.primary} />
                  <Text style={styles.popularItemText}>{service}</Text>
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
    alignItems: 'center',
  },
  popularItemText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 80,
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
});