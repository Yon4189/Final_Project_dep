// components/customer/RatingStars.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';

interface RatingStarsProps {
  rating: number;
  size?: number;
  showRating?: boolean;
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
  starColor?: string;
  emptyColor?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  size = 16,
  showRating = false,
  editable = false,
  onRatingChange,
  starColor = Colors.warning,
  emptyColor = Colors.border,
}) => {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={size} color={starColor} />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={size} color={starColor} />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={size} color={emptyColor} />
        );
      }
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>{renderStars()}</View>
      {showRating && (
        <Text style={[styles.ratingText, { fontSize: size * 0.8 }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    marginLeft: 4,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
});