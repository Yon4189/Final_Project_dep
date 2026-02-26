// app/(customer)/provider/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useProviderDetails, useTopRatedProviders } from '@/hooks/useCustomerQueries';
import { useLocation } from '@/hooks/useLocation';
import { ServiceRequestModal } from '../../../components/customer/ServiceRequestModal';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';
import type { ServiceProvider, Review, ProviderService } from '@/app/types/customer.types';

const { width } = Dimensions.get('window');

export default function ProviderProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const providerId = params.id;
  
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSimilarProviders, setShowSimilarProviders] = useState(false);
  
  const { location } = useLocation();
  const { data: provider, isLoading, error } = useProviderDetails(providerId);
  const { data: similarProviders, isLoading: similarLoading } = useTopRatedProviders(5);

  const handleServiceSelect = (serviceName: string) => {
    setSelectedService(serviceName);
    setShowRequestModal(true);
  };

  const handleSimilarProvidersToggle = () => {
    setShowSimilarProviders(!showSimilarProviders);
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return 'Distance unknown';
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m away`;
    }
    return `${distance.toFixed(1)}km away`;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'ETB 0';
    return `ETB ${amount.toFixed(2)}`;
  };

  const handleCall = () => {
    if (provider?.phone) {
      // Implement call functionality
      Alert.alert('Call', `Calling ${provider.businessName || provider.name}`);
    } else {
      Alert.alert('Info', 'Phone number not available');
    }
  };
  const handleMessage = () => {
    if (provider) {
      // Navigate to chat or implement messaging
      router.push(`/(customer)/chat/${providerId}`);
    }
  };

  const handleShare = () => {
    // Implement share functionality
    Alert.alert('Share', 'Sharing provider profile');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading provider details...</Text>
        </View>
      </View>
    );
  }

  if (error || !provider) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Provider Not Found</Text>
          <Text style={styles.errorText}>The provider you're looking for doesn't exist or has been removed.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderProviderInfo()}
        {renderServices()}
        {renderAbout()}
        {renderLocation()}
        {renderReviews()}
        {renderSimilarProviders()}
        {renderContactActions()}
      </ScrollView>

      <ServiceRequestModal
        visible={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedService(null);
        }}
        provider={provider}
        userLocation={location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        } : undefined}
        selectedService={selectedService || undefined}
      />
    </View>
  );

  function renderHeader() {
    return (
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provider Profile</Text>
        <View style={{ width: 24 }} />
      </View>
    );
  }

  function renderProviderInfo() {
    return (
      <View style={styles.providerInfo}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: provider.profileImage || 'https://via.placeholder.com/120' }} 
            style={styles.avatar}
          />
          {provider.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        
        <View style={styles.providerDetails}>
          <Text style={styles.providerName}>
            {provider.businessName || provider.name || 'Provider'}
          </Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={Colors.warning} />
            <Text style={styles.ratingText}>
              {provider.rating?.toFixed(1) || '0.0'} • {provider.reviewCount || 0} reviews
            </Text>
          </View>
          <Text style={styles.categoryText}>
            {provider.category?.name || 'Service Provider'}
          </Text>
          {provider.distance && (
            <Text style={styles.distanceText}>
              {formatDistance(provider.distance)}
            </Text>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{provider.completedJobs || 0}</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{provider.successRate || 98}%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{provider.responseTime || '<1h'}</Text>
            <Text style={styles.statLabel}>Response</Text>
          </View>
        </View>
      </View>
    );
  }

  function renderServices() {
    if (!provider.services || provider.services.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          <Text style={styles.sectionCount}>{provider.services.length} services</Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.servicesScroll}
        >
          {provider.services.map((service: any, index: number) => (
            <TouchableOpacity
              key={service?.id || index}
              style={styles.serviceCard}
              onPress={() => handleServiceSelect(service?.serviceName || service?.name || 'Service')}
            >
              <View style={styles.serviceIconContainer}>
                <MaterialCommunityIcons name="wrench" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.serviceName} numberOfLines={1}>
                {service?.serviceName || service?.name || 'Service'}
              </Text>
              <Text style={styles.servicePrice}>
                {formatCurrency(service?.price || service?.basePrice || 0)}
              </Text>
              <Text style={styles.serviceDuration} numberOfLines={2}>
                {service?.estimatedDuration || 1}h • {service?.description || 'Professional service'}
              </Text>
              <View style={styles.bookButton}>
                <Text style={styles.bookButtonText}>Book Now</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  function renderAbout() {
    if (!provider.bio && !provider.description) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          {provider.bio || provider.description || 'Professional service provider with years of experience in the industry. Committed to delivering high-quality services with attention to detail and customer satisfaction.'}
        </Text>
      </View>
    );
  }

  function renderLocation() {
    if (!provider.location?.address && !provider.distance) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={20} color={Colors.primary} />
          <Text style={styles.locationText}>
            {provider.location?.address || 'Location not specified'}
          </Text>
        </View>
        {provider.distance && (
          <Text style={styles.distanceInfo}>
            Approximately {formatDistance(provider.distance)}
          </Text>
        )}
      </View>
    );
  }

  function renderReviews() {
    if (!provider.reviews || provider.reviews.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          <TouchableOpacity onPress={() => router.push(`/(customer)/provider/${providerId}/reviews`)}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {provider.reviews.slice(0, 3).map((review: any, index: number) => (
          <View key={index} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerInfo}>
                <Text style={styles.reviewerName}>{review.reviewerName || 'Anonymous'}</Text>
                <View style={styles.reviewRating}>
                  <Ionicons name="star" size={12} color={Colors.warning} />
                  <Text style={styles.reviewRatingText}>{review.rating}</Text>
                </View>
              </View>
              <Text style={styles.reviewDate}>{review.date || 'Recent'}</Text>
            </View>
            <Text style={styles.reviewText}>{review.comment}</Text>
            {review.isRecommended && (
              <Text style={styles.recommendedText}>✓ Recommended</Text>
            )}
          </View>
        ))}
      </View>
    );
  }

  function renderSimilarProviders() {
    if (!similarProviders || similarProviders.length === 0) return null;

    return (
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.similarProvidersHeader}
          onPress={handleSimilarProvidersToggle}
        >
          <Text style={styles.sectionTitle}>Similar Providers</Text>
          <Ionicons 
            name={showSimilarProviders ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={Colors.text.secondary} 
          />
        </TouchableOpacity>
        
        {showSimilarProviders && (
          <View style={styles.similarProvidersContainer}>
            {similarLoading ? (
              <LoadingSpinner />
            ) : (
              similarProviders.map((similarProvider: ServiceProvider) => (
                <TouchableOpacity
                  key={similarProvider.id}
                  style={styles.similarProviderCard}
                  onPress={() => router.push(`/(customer)/provider/${similarProvider.id}`)}
                >
                  <Image 
                    source={{ uri: similarProvider.profileImage || 'https://via.placeholder.com/50' }} 
                    style={styles.similarProviderImage}
                  />
                  <View style={styles.similarProviderInfo}>
                    <Text style={styles.similarProviderName}>
                      {similarProvider.businessName || similarProvider.name || 'Provider'}
                    </Text>
                    <View style={styles.similarProviderRating}>
                      <Ionicons name="star" size={12} color={Colors.warning} />
                      <Text style={styles.similarProviderRatingText}>
                        {similarProvider.rating?.toFixed(1) || '0.0'} ({similarProvider.reviewCount || 0})
                      </Text>
                    </View>
                    <Text style={styles.similarProviderCategory}>
                      {similarProvider.category?.name || 'Service Provider'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>
    );
  }

  function renderContactActions() {
    return (
      <View style={styles.contactActions}>
        <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
          <Ionicons name="call-outline" size={20} color={Colors.primary} />
          <Text style={styles.contactButtonText}>Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.contactButton} onPress={handleMessage}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
          <Text style={styles.contactButtonText}>Message</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.contactButton} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
          <Text style={styles.contactButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  retryButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  providerInfo: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
    alignSelf: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.border,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  verifiedText: {
    fontSize: 10,
    color: '#166534',
    marginLeft: 4,
    fontWeight: '600',
  },
  providerDetails: {
    marginBottom: 16,
  },
  providerName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  categoryText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  sectionCount: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  servicesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  serviceCard: {
    width: 160,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  distanceInfo: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginRight: 8,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRatingText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  reviewText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  recommendedText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  similarProvidersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  similarProvidersContainer: {
    gap: 12,
  },
  similarProviderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  similarProviderImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  similarProviderInfo: {
    flex: 1,
  },
  similarProviderName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  similarProviderRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  similarProviderRatingText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  similarProviderCategory: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactButtonText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 8,
    fontWeight: '600',
  },
});