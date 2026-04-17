// app/(customer)/search/results.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useSearch } from '../../../hooks/useSearch';
import { ProviderCard } from '../../../components/customer/ProviderCard';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';
import { ServiceRequestModal } from '../../../components/customer/ServiceRequestModal';
import { API_BASE_URL } from "@/app/config/api";
import type { ServiceProvider } from '@/app/types/customer.types';

const { width } = Dimensions.get('window');

export default function SearchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    query?: string;
    q?: string;
    categoryId?: string;
    category?: string;
  }>();

  const [filtersVisible, setFiltersVisible] = useState(false);
  // Pending (draft) filter state — only applied when user taps "Apply"
  const [pendingSortBy, setPendingSortBy] = useState('rating');
  const [pendingPriceRange, setPendingPriceRange] = useState({ min: 0, max: 1000 });
  const [pendingRatingFilter, setPendingRatingFilter] = useState(0);
  const [pendingAvailabilityFilter, setPendingAvailabilityFilter] = useState('all');

  // Applied filter state — drives the actual search
  const [sortBy, setSortBy] = useState('rating');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [ratingFilter, setRatingFilter] = useState(0);
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const [searchQuery, setSearchQuery] = useState(params.query || params.q || '');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const categoryId = params.categoryId || params.category;

  // Use the search hook — updateFilters triggers a new API call
  const { results: providers, loading: isLoading, error, setQuery, updateFilters } = useSearch({
    initialQuery: searchQuery,
    initialFilters: {
      ...(categoryId ? { categoryId } : {}),
      sortBy: 'rating',
      maxDistance: 50,
    },
  });

  // Apply availability filter client-side for 'available_today' (no backend support yet)
  const filteredProviders = useMemo(() => {
    if (!providers) return [];
    if (availabilityFilter === 'available_today') {
      // available_today has no backend signal, keep all results
      return providers;
    }
    return providers;
  }, [providers, availabilityFilter]);

  // Handle profile view - when tapping the card
  const handleProfilePress = (provider: ServiceProvider) => {
    router.push(`/(customer)/provider/${provider.id}`);
  };

  // Handle booking - when tapping "Book Now" button
  const handleBookPress = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setShowBookingModal(true);
  };

  const handleFilterApply = () => {
    // Commit pending state to applied state
    setSortBy(pendingSortBy);
    setPriceRange(pendingPriceRange);
    setRatingFilter(pendingRatingFilter);
    setAvailabilityFilter(pendingAvailabilityFilter);

    // Push all filters to the search hook so a new API call fires
    updateFilters({
      sortBy: pendingSortBy as any,
      minRating: pendingRatingFilter > 0 ? pendingRatingFilter : undefined,
      priceRange: (pendingPriceRange.min > 0 || pendingPriceRange.max < 1000)
        ? { min: pendingPriceRange.min, max: pendingPriceRange.max }
        : undefined,
      availableNow: pendingAvailabilityFilter === 'online' ? true : undefined,
    });

    setFiltersVisible(false);
  };

  const handleFilterReset = () => {
    setPendingSortBy('rating');
    setPendingPriceRange({ min: 0, max: 1000 });
    setPendingRatingFilter(0);
    setPendingAvailabilityFilter('all');
  };

  // Sync search query to the hook with debounce handled inside hook
  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    setQuery(text);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={Colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearchQueryChange}
          placeholder="Search for services or providers..."
          placeholderTextColor={Colors.text.secondary}
          returnKeyType="search"
        />
      </View>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => {
          // Sync pending state from applied state when opening modal
          setPendingSortBy(sortBy);
          setPendingPriceRange(priceRange);
          setPendingRatingFilter(ratingFilter);
          setPendingAvailabilityFilter(availabilityFilter);
          setFiltersVisible(true);
        }}
      >
        <MaterialCommunityIcons name="filter-variant" size={24} color={Colors.surface} />
        <Text style={styles.filterButtonText}>Filters</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSortInfo = () => (
    <View style={styles.sortInfo}>
      <Text style={styles.sortInfoText}>
        {filteredProviders?.length || 0} providers found
      </Text>
      <View style={styles.sortBadge}>
        <Text style={styles.sortBadgeText}>
          {sortBy === 'rating' ? 'Sorted by rating' :
            sortBy === 'price_low' ? 'Price: low to high' :
              sortBy === 'price_high' ? 'Price: high to low' :
                sortBy === 'distance' ? 'Nearest first' :
                  sortBy === 'reviews' ? 'Most reviewed' : 'Sorted by rating'}
        </Text>
      </View>
    </View>
  );

  const renderProviders = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Search Failed"
          message="Please check your internet connection and try again."
        />
      );
    }

    if (!filteredProviders || filteredProviders.length === 0) {
      return (
        <EmptyState
          icon="search-outline"
          title="No Results Found"
          message={`No providers found for "${searchQuery}". Try adjusting your search or filters.`}
        />
      );
    }

    return (
      <View style={styles.providersContainer}>
        {filteredProviders.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onPress={() => handleProfilePress(provider)}
            onBookPress={() => handleBookPress(provider)}
            onChatPress={() => router.push(`/(customer)/chat/${provider.id}`)}
            onCallPress={() => {
              if (provider.phone) {
                Linking.openURL(`tel:${provider.phone}`);
              } else {
                Alert.alert('Error', 'Provider phone number not available');
              }
            }}
            onSharePress={async () => {
              try {
                const providerName = provider.businessName || provider.name || "this provider";
                const shareUrl = `${API_BASE_URL.replace('/api', '')}/provider/${provider.id}`;
                const message = `Check out ${providerName} on HomeLink!`;

                if (Platform.OS === 'web') {
                  if (navigator.share) {
                    await navigator.share({
                      title: `HomeLink - ${providerName}`,
                      text: message,
                      url: window.location.href,
                    });
                  } else {
                    await navigator.clipboard.writeText(`${message}\n${shareUrl}`);
                    Alert.alert("Success", "Provider info copied to clipboard!");
                  }
                } else {
                  await Share.share({
                    title: `HomeLink - ${providerName}`,
                    message: `${message}\n${shareUrl}`,
                  });
                }
              } catch (error) {
                console.error('Share error:', error);
              }
            }}
            showActions={true}
          />
        ))}
      </View>
    );
  };

  const renderFiltersModal = () => (
    <Modal
      visible={filtersVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setFiltersVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setFiltersVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContentScroll} showsVerticalScrollIndicator={false}>
            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Sort By</Text>
              {(['rating', 'price_low', 'price_high', 'distance', 'reviews'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterOption, pendingSortBy === option && styles.filterOptionSelected]}
                  onPress={() => setPendingSortBy(option)}
                >
                  <Text style={[styles.filterOptionText, pendingSortBy === option && styles.filterOptionTextSelected]}>
                    {option === 'rating' ? 'Highest Rated' :
                      option === 'price_low' ? 'Price: Low to High' :
                        option === 'price_high' ? 'Price: High to Low' :
                          option === 'distance' ? 'Nearest' : 'Most Reviewed'}
                  </Text>
                  {pendingSortBy === option && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Price Range (ETB)</Text>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={pendingPriceRange.min.toString()}
                    onChangeText={(text) => setPendingPriceRange({ ...pendingPriceRange, min: parseInt(text) || 0 })}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.text.secondary}
                  />
                </View>
                <Text style={styles.priceSeparator}>-</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={pendingPriceRange.max.toString()}
                    onChangeText={(text) => setPendingPriceRange({ ...pendingPriceRange, max: parseInt(text) || 1000 })}
                    keyboardType="numeric"
                    placeholder="1000"
                    placeholderTextColor={Colors.text.secondary}
                  />
                </View>
              </View>
            </View>

            {/* Rating Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Minimum Rating</Text>
              {[0, 1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[styles.filterOption, pendingRatingFilter === rating && styles.filterOptionSelected]}
                  onPress={() => setPendingRatingFilter(rating)}
                >
                  <View style={styles.ratingFilterOption}>
                    <View style={styles.starsContainer}>
                      {[...Array(5)].map((_, index) => (
                        <Ionicons
                          key={index}
                          name={index < rating ? "star" : "star-outline"}
                          size={16}
                          color={index < rating ? Colors.warning : Colors.text.secondary}
                        />
                      ))}
                    </View>
                    <Text style={[styles.filterOptionText, pendingRatingFilter === rating && styles.filterOptionTextSelected]}>
                      {rating === 0 ? 'Any Rating' : `${rating}+ Stars`}
                    </Text>
                  </View>
                  {pendingRatingFilter === rating && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Availability Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Availability</Text>
              {(['all', 'online', 'available_today'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterOption, pendingAvailabilityFilter === option && styles.filterOptionSelected]}
                  onPress={() => setPendingAvailabilityFilter(option)}
                >
                  <Text style={[styles.filterOptionText, pendingAvailabilityFilter === option && styles.filterOptionTextSelected]}>
                    {option === 'all' ? 'All Providers' :
                      option === 'online' ? 'Currently Online' : 'Available Today'}
                  </Text>
                  {pendingAvailabilityFilter === option && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={handleFilterReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleFilterApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderSortInfo()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderProviders()}
      </ScrollView>
      {renderFiltersModal()}

      {/* Booking Modal */}
      <ServiceRequestModal
        visible={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedProvider(null);
        }}
        provider={selectedProvider}
      // Add userLocation if you have it from context/state
      />
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalContentScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  filterOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  filterOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  filterOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  ratingFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 12,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInputContainer: {
    flex: 1,
    marginRight: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  priceInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  priceSeparator: {
    fontSize: 24,
    color: Colors.text.secondary,
    marginHorizontal: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  resetButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
});