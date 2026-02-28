// app/(customer)/search/results.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useSearch } from '../../../hooks/useSearch';
import { ProviderCard } from '../../../components/customer/ProviderCard';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';
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
  const [sortBy, setSortBy] = useState('rating');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [ratingFilter, setRatingFilter] = useState(0);
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState(params.query || params.q || '');

  const categoryId = params.categoryId || params.category;

  // Use the search hook with proper filters
  const { results: providers, loading: isLoading, error } = useSearch({
    initialQuery: searchQuery,
    initialFilters: {
      ...(categoryId ? { categoryId } : {}),
      sortBy: sortBy as 'rating' | 'distance' | 'price_low' | 'price_high' | 'reviews',
     
      maxDistance: 50,
    },
  });

  // Apply availability filter client-side
  const filteredProviders = useMemo(() => {
    if (!providers) return [];
    
    if (availabilityFilter === 'all') return providers;
    
    return providers.filter(provider => {
      if (availabilityFilter === 'online') {
        return provider.isAvailable === true;
      } else if (availabilityFilter === 'available_today') {
        // This would depend on your provider's availability data
        return true; // You can implement this based on your data structure
      }
      return true;
    });
  }, [providers, availabilityFilter]);

  const handleProviderPress = (provider: ServiceProvider) => {
    router.push(`/(customer)/provider/${provider.id}`);
  };

  const handleFilterApply = () => {
    setFiltersVisible(false);
  };

  const handleFilterReset = () => {
    setSortBy('rating');
    setPriceRange({ min: 0, max: 1000 });
    setRatingFilter(0);
    setAvailabilityFilter('all');
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
              {['rating', 'price_low', 'price_high', 'distance', 'reviews'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterOption, sortBy === option && styles.filterOptionSelected]}
                  onPress={() => setSortBy(option)}
                >
                  <Text style={[styles.filterOptionText, sortBy === option && styles.filterOptionTextSelected]}>
                    {option === 'rating' ? 'Highest Rated' : 
                     option === 'price_low' ? 'Price: Low to High' :
                     option === 'price_high' ? 'Price: High to Low' :
                     option === 'distance' ? 'Nearest' : 'Most Reviewed'}
                  </Text>
                  {sortBy === option && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
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
                    value={priceRange.min.toString()}
                    onChangeText={(text) => setPriceRange({...priceRange, min: parseInt(text) || 0})}
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
                    value={priceRange.max.toString()}
                    onChangeText={(text) => setPriceRange({...priceRange, max: parseInt(text) || 1000})}
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
                  style={[styles.filterOption, ratingFilter === rating && styles.filterOptionSelected]}
                  onPress={() => setRatingFilter(rating)}
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
                    <Text style={[styles.filterOptionText, ratingFilter === rating && styles.filterOptionTextSelected]}>
                      {rating === 0 ? 'Any Rating' : `${rating}+ Stars`}
                    </Text>
                  </View>
                  {ratingFilter === rating && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Availability Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Availability</Text>
              {['all', 'online', 'available_today'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterOption, availabilityFilter === option && styles.filterOptionSelected]}
                  onPress={() => setAvailabilityFilter(option)}
                >
                  <Text style={[styles.filterOptionText, availabilityFilter === option && styles.filterOptionTextSelected]}>
                    {option === 'all' ? 'All Providers' : 
                     option === 'online' ? 'Currently Online' : 'Available Today'}
                  </Text>
                  {availabilityFilter === option && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
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
          onChangeText={setSearchQuery}
          placeholder="Search for services or providers..."
          placeholderTextColor={Colors.text.secondary}
          returnKeyType="search"
          onSubmitEditing={() => {
            // Trigger search with new query
            // The useSearch hook will auto-search due to initialQuery change
          }}
        />
      </View>
      <TouchableOpacity style={styles.filterButton} onPress={() => setFiltersVisible(true)}>
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
           sortBy === 'price_low' ? 'Sorted by price (low to high)' :
           sortBy === 'price_high' ? 'Sorted by price (high to low)' :
           sortBy === 'distance' ? 'Sorted by distance' : 'Sorted by reviews'}
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
            onPress={() => handleProviderPress(provider)}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderSortInfo()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderProviders()}
      </ScrollView>
      {renderFiltersModal()}
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
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 8,
    padding: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 12,
  },
  filterButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  sortInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortInfoText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  sortBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  sortBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  providersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
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