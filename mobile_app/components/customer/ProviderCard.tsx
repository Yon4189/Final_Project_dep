// components/customer/ProviderCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import type { ServiceProvider } from '@/app/types/customer.types';

interface ProviderCardProps {
  provider: ServiceProvider;
  onPress: () => void;
  showDistance?: boolean;
  showBadges?: boolean;
  showActions?: boolean;
  showServices?: boolean;
  showCategory?: boolean;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  onPress,
  showDistance = true,
  showBadges = true,
  showActions = false,
  showServices = true,
  showCategory = true,
}) => {
  const formatDistance = (distance?: number) => {
    if (!distance) return null;
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const getPrimaryService = () => {
    if (!provider.services || provider.services.length === 0) return null;
    const service = provider.services[0];
    return (service as any)?.serviceName || (service as any)?.name || 'Service';
  };

  const getServiceCount = () => {
    return provider.services?.length || 0;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: provider.profileImage || 'https://via.placeholder.com/60' }}
            style={styles.image}
          />
          {provider.verified && showBadges && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {provider.businessName || provider.name || 'Provider'}
            </Text>
            {showDistance && provider.distance && (
              <View style={styles.distance}>
                <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
                <Text style={styles.distanceText}>{formatDistance(provider.distance)}</Text>
              </View>
            )}
          </View>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={Colors.warning} />
            <Text style={styles.rating}>{provider.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.reviews}>({provider.reviewCount || 0} reviews)</Text>
            {provider.completedJobs > 0 && (
              <View style={styles.jobsBadge}>
                <Text style={styles.jobsText}>{provider.completedJobs} jobs</Text>
              </View>
            )}
          </View>

          {showCategory && provider.category && (
            <Text style={styles.category} numberOfLines={1}>
              {typeof provider.category === 'string' ? provider.category : provider.category.name}
            </Text>
          )}
        </View>
      </View>

      {showServices && provider.services && provider.services.length > 0 && (
        <View style={styles.servicesContainer}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {getPrimaryService()}
          </Text>
          {getServiceCount() > 1 && (
            <Text style={styles.serviceCount}>+{getServiceCount() - 1} more</Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Starting from</Text>
          <Text style={styles.price}>
            ETB {provider.priceRange?.min || 0}
          </Text>
        </View>

        {showActions ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="call-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Book Now</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.surface} />
          </View>
        )}
      </View>

      {provider.availableNow && (
        <View style={styles.availableBadge}>
          <View style={styles.availableDot} />
          <Text style={styles.availableText}>Available Now</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 2,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  distanceText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 4,
    marginRight: 4,
  },
  reviews: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginRight: 8,
  },
  jobsBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  jobsText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  category: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  servicesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  serviceCount: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  availableBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 4,
  },
  availableText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: '600',
  },
});