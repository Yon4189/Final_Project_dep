// components/provider/RatingSummary.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';

interface RatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  onFilterByRating?: (rating: number | null) => void;
  activeFilter?: number | null;
  showDistribution?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'card' | 'minimal';
}

const RATING_LABELS = {
  5: 'Excellent',
  4: 'Very Good',
  3: 'Average',
  2: 'Below Average',
  1: 'Poor',
};

export const RatingSummary: React.FC<RatingSummaryProps> = ({
  averageRating,
  totalReviews,
  distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  onFilterByRating,
  activeFilter,
  showDistribution = true,
  size = 'medium',
  variant = 'default',
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          ratingValue: styles.smallRatingValue,
          ratingText: styles.smallRatingText,
          starSize: 14,
          totalText: styles.smallTotalText,
        };
      case 'large':
        return {
          ratingValue: styles.largeRatingValue,
          ratingText: styles.largeRatingText,
          starSize: 24,
          totalText: styles.largeTotalText,
        };
      default:
        return {
          ratingValue: styles.mediumRatingValue,
          ratingText: styles.mediumRatingText,
          starSize: 18,
          totalText: styles.mediumTotalText,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const renderStars = (rating: number, size: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={size} color={Colors.warning} />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={size} color={Colors.warning} />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={size} color={Colors.warning} />
        );
      }
    }
    return stars;
  };

  const calculatePercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return (count / totalReviews) * 100;
  };

  const renderDefault = () => (
    <View style={styles.defaultContainer}>
      <View style={styles.overallSection}>
        <Text style={[styles.ratingValue, sizeStyles.ratingValue]}>
          {averageRating.toFixed(1)}
        </Text>
        <View style={styles.starsContainer}>
          {renderStars(averageRating, sizeStyles.starSize)}
        </View>
        <Text style={[styles.totalReviews, sizeStyles.totalText]}>
          Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      {showDistribution && (
        <View style={styles.distributionSection}>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = distribution[rating as keyof typeof distribution] || 0;
            const percentage = calculatePercentage(count);
            const isActive = activeFilter === rating;

            return (
              <TouchableOpacity
                key={rating}
                style={styles.distributionRow}
                onPress={() => onFilterByRating?.(isActive ? null : rating)}
                disabled={!onFilterByRating}
              >
                <View style={styles.distributionLabel}>
                  <Text style={styles.distributionRating}>{rating}</Text>
                  <Ionicons name="star" size={12} color={Colors.warning} />
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { width: `${percentage}%` },
                      isActive && styles.progressBarActive,
                    ]} 
                  />
                </View>

                <Text style={styles.distributionCount}>{count}</Text>

                {isActive && (
                  <Ionicons name="close-circle" size={16} color={Colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderCard = () => (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <View style={styles.cardRating}>
          <Text style={styles.cardRatingValue}>{averageRating.toFixed(1)}</Text>
          <View style={styles.cardStars}>
            {renderStars(averageRating, 14)}
          </View>
        </View>
        <Text style={styles.cardTotal}>{totalReviews} reviews</Text>
      </View>

      {showDistribution && (
        <View style={styles.cardDistribution}>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = distribution[rating as keyof typeof distribution] || 0;
            const percentage = calculatePercentage(count);

            return (
              <View key={rating} style={styles.cardDistributionRow}>
                <Text style={styles.cardDistributionLabel}>{rating}</Text>
                <View style={styles.cardProgressBar}>
                  <View 
                    style={[
                      styles.cardProgressFill,
                      { width: `${percentage}%` }
                    ]} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderMinimal = () => (
    <View style={styles.minimalContainer}>
      <View style={styles.minimalRating}>
        <Text style={styles.minimalRatingValue}>{averageRating.toFixed(1)}</Text>
        <View style={styles.minimalStars}>
          {renderStars(averageRating, 12)}
        </View>
      </View>
      <Text style={styles.minimalTotal}>{totalReviews} reviews</Text>
    </View>
  );

  switch (variant) {
    case 'card':
      return renderCard();
    case 'minimal':
      return renderMinimal();
    default:
      return renderDefault();
  }
};

// Additional specialized components
interface RatingBreakdownProps {
  criteria: {
    punctuality: number;
    quality: number;
    professionalism: number;
    communication: number;
    valueForMoney: number;
  };
  size?: 'small' | 'medium';
}

export const RatingBreakdown: React.FC<RatingBreakdownProps> = ({
  criteria,
  size = 'medium',
}) => {
  const getStarSize = () => size === 'small' ? 12 : 14;
  const getFontSize = () => size === 'small' ? 12 : 14;

  const renderCriteriaRow = (label: string, value: number) => (
    <View style={styles.criteriaRow}>
      <Text style={[styles.criteriaLabel, { fontSize: getFontSize() }]}>{label}</Text>
      <View style={styles.criteriaStars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= value ? 'star' : 'star-outline'}
            size={getStarSize()}
            color={Colors.warning}
          />
        ))}
        <Text style={[styles.criteriaValue, { fontSize: getFontSize() }]}>
          {value.toFixed(1)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.breakdownContainer}>
      {renderCriteriaRow('Punctuality', criteria.punctuality)}
      {renderCriteriaRow('Quality', criteria.quality)}
      {renderCriteriaRow('Professionalism', criteria.professionalism)}
      {renderCriteriaRow('Communication', criteria.communication)}
      {renderCriteriaRow('Value for Money', criteria.valueForMoney)}
    </View>
  );
};

interface RecentReviewsSummaryProps {
  recentAverage: number;
  trend: 'up' | 'down' | 'stable';
  period: 'week' | 'month';
}

export const RecentReviewsSummary: React.FC<RecentReviewsSummaryProps> = ({
  recentAverage,
  trend,
  period,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return { name: 'trending-up', color: Colors.success };
      case 'down':
        return { name: 'trending-down', color: Colors.error };
      default:
        return { name: 'remove', color: Colors.text.secondary };
    }
  };

  const trend_icon = getTrendIcon();

  return (
    <View style={styles.recentContainer}>
      <Text style={styles.recentLabel}>Last {period}</Text>
      <View style={styles.recentValue}>
        <Text style={styles.recentAverage}>{recentAverage.toFixed(1)}</Text>
        <Ionicons name={trend_icon.name as any} size={16} color={trend_icon.color} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Default Variant
  defaultContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  overallSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingValue: {
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  smallRatingValue: {
    fontSize: 32,
  },
  smallRatingText: {
    fontSize: 16,
  },
  mediumRatingValue: {
    fontSize: 48,
  },
  mediumRatingText: {
    fontSize: 24,
  },
  largeRatingValue: {
    fontSize: 64,
  },
  largeRatingText: {
    fontSize: 32,
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    gap: 4,
  },
  totalReviews: {
    color: Colors.text.secondary,
  },
  smallTotalText: {
    fontSize: 12,
  },
  mediumTotalText: {
    fontSize: 14,
  },
  largeTotalText: {
    fontSize: 16,
  },
  distributionSection: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distributionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 35,
    gap: 2,
  },
  distributionRating: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.warning + '40',
  },
  progressBarActive: {
    backgroundColor: Colors.warning,
  },
  distributionCount: {
    fontSize: 12,
    color: Colors.text.secondary,
    width: 30,
    textAlign: 'right',
  },

  // Card Variant
  cardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardRatingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  cardStars: {
    flexDirection: 'row',
    gap: 2,
  },
  cardTotal: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  cardDistribution: {
    gap: 6,
  },
  cardDistributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDistributionLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    width: 20,
  },
  cardProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    backgroundColor: Colors.warning,
  },

  // Minimal Variant
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minimalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  minimalRatingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  minimalStars: {
    flexDirection: 'row',
    gap: 2,
  },
  minimalTotal: {
    fontSize: 12,
    color: Colors.text.secondary,
  },

  // Breakdown Component
  breakdownContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  criteriaLabel: {
    color: Colors.text.secondary,
  },
  criteriaStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  criteriaValue: {
    marginLeft: 6,
    color: Colors.text.primary,
    fontWeight: '500',
  },

  // Recent Summary
  recentContainer: {
    alignItems: 'center',
  },
  recentLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  recentValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentAverage: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});