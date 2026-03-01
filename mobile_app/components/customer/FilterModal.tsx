// components/customer/FilterModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import AppButton from '../AppButton';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  initialFilters?: any;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
}) => {
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'rating');
  const [priceRange, setPriceRange] = useState({
    min: initialFilters.priceRange?.min || 0,
    max: initialFilters.priceRange?.max || 10000,
  });
  const [minRating, setMinRating] = useState(initialFilters.minRating || 0);
  const [verifiedOnly, setVerifiedOnly] = useState(initialFilters.verifiedOnly || false);
  const [availableNow, setAvailableNow] = useState(initialFilters.availableNow || false);
  const [maxDistance, setMaxDistance] = useState(initialFilters.maxDistance || 50);

  const handleApply = () => {
    const filters = {
      sortBy,
      priceRange: priceRange.min > 0 || priceRange.max < 10000 ? priceRange : undefined,
      minRating: minRating > 0 ? minRating : undefined,
      verifiedOnly,
      availableNow,
      maxDistance,
    };
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setSortBy('rating');
    setPriceRange({ min: 0, max: 10000 });
    setMinRating(0);
    setVerifiedOnly(false);
    setAvailableNow(false);
    setMaxDistance(50);
  };

  const SortOption = ({ value, label }: { value: string; label: string }) => (
    <TouchableOpacity
      style={[styles.option, sortBy === value && styles.optionSelected]}
      onPress={() => setSortBy(value)}
    >
      <Text style={[styles.optionText, sortBy === value && styles.optionTextSelected]}>
        {label}
      </Text>
      {sortBy === value && (
        <Ionicons name="checkmark" size={18} color={Colors.primary} />
      )}
    </TouchableOpacity>
  );

  const RatingOption = ({ rating }: { rating: number }) => (
    <TouchableOpacity
      style={[styles.ratingOption, minRating === rating && styles.ratingOptionSelected]}
      onPress={() => setMinRating(rating)}
    >
      <View style={styles.starsContainer}>
        {[...Array(5)].map((_, index) => (
          <Ionicons
            key={index}
            name={index < rating ? 'star' : 'star-outline'}
            size={16}
            color={index < rating ? Colors.warning : Colors.text.secondary}
          />
        ))}
      </View>
      <Text style={[styles.ratingText, minRating === rating && styles.ratingTextSelected]}>
        {rating === 0 ? 'Any' : `${rating}+`}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Providers</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Sort By Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              <SortOption value="rating" label="Highest Rated" />
              <SortOption value="distance" label="Nearest" />
              <SortOption value="price_low" label="Price: Low to High" />
              <SortOption value="price_high" label="Price: High to Low" />
              <SortOption value="reviews" label="Most Reviewed" />
            </View>

            {/* Price Range Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range (ETB)</Text>
              <View style={styles.priceContainer}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <TextInput
                    style={styles.priceField}
                    value={priceRange.min.toString()}
                    onChangeText={(text) => setPriceRange({ ...priceRange, min: parseInt(text) || 0 })}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.text.secondary}
                  />
                </View>
                <Text style={styles.priceSeparator}>-</Text>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <TextInput
                    style={styles.priceField}
                    value={priceRange.max.toString()}
                    onChangeText={(text) => setPriceRange({ ...priceRange, max: parseInt(text) || 10000 })}
                    keyboardType="numeric"
                    placeholder="10000"
                    placeholderTextColor={Colors.text.secondary}
                  />
                </View>
              </View>
            </View>

            {/* Rating Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Rating</Text>
              <RatingOption rating={0} />
              <RatingOption rating={3} />
              <RatingOption rating={4} />
              <RatingOption rating={5} />
            </View>

            {/* Distance Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Maximum Distance</Text>
              <View style={styles.sliderContainer}>
                {[5, 10, 25, 50, 100].map((distance) => (
                  <TouchableOpacity
                    key={distance}
                    style={[styles.distanceOption, maxDistance === distance && styles.distanceOptionSelected]}
                    onPress={() => setMaxDistance(distance)}
                  >
                    <Text style={[styles.distanceText, maxDistance === distance && styles.distanceTextSelected]}>
                      {distance}km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Toggle Options */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.toggleOption}
                onPress={() => setVerifiedOnly(!verifiedOnly)}
              >
                <View style={styles.toggleLeft}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  <Text style={styles.toggleText}>Verified Only</Text>
                </View>
                <View style={[styles.checkbox, verifiedOnly && styles.checkboxChecked]}>
                  {verifiedOnly && <Ionicons name="checkmark" size={14} color={Colors.surface} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleOption}
                onPress={() => setAvailableNow(!availableNow)}
              >
                <View style={styles.toggleLeft}>
                  <Ionicons name="time" size={20} color={Colors.primary} />
                  <Text style={styles.toggleText}>Available Now</Text>
                </View>
                <View style={[styles.checkbox, availableNow && styles.checkboxChecked]}>
                  {availableNow && <Ionicons name="checkmark" size={14} color={Colors.surface} />}
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <AppButton
              title="Apply Filters"
              onPress={handleApply}
              style={styles.applyButton}
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
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginRight: 10,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  applyButton: {
    flex: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  optionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInput: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  priceField: {
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
    marginHorizontal: 12,
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  ratingOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 12,
  },
  ratingTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  sliderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  distanceOption: {
    width: '48%',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 8,
  },
  distanceOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  distanceText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  distanceTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
});