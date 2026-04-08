// app/(customer)/provider/[id].tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
  Share,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/app/constants/Colors";
import {
  useProviderDetails,
  useTopRatedProviders,
} from "@/hooks/useCustomerQueries";
import { useLocation } from "@/hooks/useLocation";
import { ServiceRequestModal } from "../../../components/customer/ServiceRequestModal";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import type { ServiceProvider, Review } from "@/app/types/customer.types";
import { API_BASE_URL } from "@/app/config/api";

export default function ProviderProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const providerId = params.id || "";

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSimilarProviders, setShowSimilarProviders] = useState(false);

  const { location, address } = useLocation();
  const userLocation = location
    ? {
      latitude: location.latitude,
      longitude: location.longitude,
      address: address?.formattedAddress || "",
    }
    : undefined;

  const { data: provider, isLoading, error } = useProviderDetails(providerId);
  const { data: similarProviders, isLoading: similarLoading } =
    useTopRatedProviders(5);

  const handleServiceSelect = (service: any) => {
    const serviceIdentifier = service?.id?.toString() || service?.serviceId?.toString() || service?.service?.name || "Service";
    setSelectedService(serviceIdentifier);
    setShowRequestModal(true);
  };

  const handleSimilarProvidersToggle = () => {
    setShowSimilarProviders(!showSimilarProviders);
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return "Distance unknown";
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m away`;
    }
    return `${distance.toFixed(1)}km away`;
  };

  const formatCurrency = (amount?: number | string) => {
    const numericAmount =
      typeof amount === "number" ? amount : parseFloat(amount ?? "0");

    if (Number.isNaN(numericAmount)) return "ETB 0";

    return `ETB ${numericAmount.toFixed(2)}`;
  };

  // Get primary service category from first service
  const getPrimaryCategory = () => {
    if (!provider?.services || provider.services.length === 0) {
      return "Service Provider";
    }
    // Access category through the service structure
    const firstService = provider.services[0];
    // Try different possible paths to get category name
    const categoryName =
      (firstService as any)?.category?.name ||
      (firstService as any)?.service?.category?.name ||
      "Service Provider";
    return categoryName;
  };

  const handleCall = () => {
    if (provider?.phone) {
      Linking.openURL(`tel:${provider.phone}`).catch((err) => {
        Alert.alert("Error", "Unable to open phone dialer");
      });
    } else {
      Alert.alert("Info", "Phone number not available");
    }
  };

  const handleMessage = () => {
    if (provider) {
      router.push(`/(customer)/chat/${providerId}`);
    }
  };

  const handleShare = async () => {
    try {
      const providerName = provider?.businessName || provider?.name || "this provider";
      // Use constructive URL from API base
      const shareUrl = `${API_BASE_URL.replace('/api', '')}/provider/${providerId}`;
      const message = `Check out ${providerName} on HomeLink!`;

      if (Platform.OS === "web") {
        if (navigator.share) {
          try {
            await navigator.share({
              title: `HomeLink - ${providerName}`,
              text: message,
              url: shareUrl,
            });
          } catch (err) {
            // If share fails (e.g. user cancelled), don't show error unless it's critical
            if ((err as Error).name !== 'AbortError') {
              throw err;
            }
          }
        } else {
          // Fallback for browsers that don't support Web Share API
          await navigator.clipboard.writeText(`${message}\n${shareUrl}`);
          Alert.alert("Success", "Provider info copied to clipboard!");
        }
      } else {
        await Share.share({
          title: `HomeLink - ${providerName}`,
          message: `${message}\n${shareUrl}`,
        });
      }
    } catch (error: any) {
      console.error('Share error:', error);
      Alert.alert("Error", "Could not share provider info");
    }
  };

  const renderServices = () => {
    if (!providerData.services || providerData.services.length === 0)
      return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          <Text style={styles.sectionCount}>
            {providerData.services.length} services
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.servicesScroll}
        >
          {providerData.services.map((service: any, index: number) => (
            <TouchableOpacity
              key={service?.id || service?.serviceId || index}
              style={styles.serviceCard}
              onPress={() => handleServiceSelect(service)}
            >
              <View style={styles.serviceIconContainer}>
                <MaterialCommunityIcons
                  name="wrench"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.serviceName} numberOfLines={1}>
                {service?.name || service?.serviceName || service?.service?.name || "Service"}
              </Text>
              <Text style={styles.servicePrice}>
                {formatCurrency(
                  service?.price ?? service?.basePrice ?? service?.customPrice ?? service?.service?.basePrice ?? 0,
                )}
              </Text>
              <Text style={styles.serviceDuration} numberOfLines={2}>
                {service?.description || service?.service?.description || "Professional service"}
              </Text>
              <View style={styles.bookButton}>
                <Text style={styles.bookButtonText}>Book Now</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Profile</Text>
          <View style={{ width: 24 }} />
        </View>
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={Colors.error}
          />
          <Text style={styles.errorTitle}>Provider Not Found</Text>
          <Text style={styles.errorText}>
            The provider you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const providerData = provider as ServiceProvider;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Provider Info */}
        <View style={styles.providerInfo}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: providerData.profileImage
                  ? (providerData.profileImage.startsWith('http')
                    ? providerData.profileImage
                    : `${API_BASE_URL.replace('/api', '')}/${providerData.profileImage}`)
                  : "https://via.placeholder.com/120",
              }}
              style={styles.avatar}
            />
            {providerData.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.providerDetails}>
            <Text style={styles.providerName}>
              {providerData.businessName || providerData.name || "Provider"}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={Colors.warning} />
              <Text style={styles.ratingText}>
                {providerData.rating?.toFixed(1) || "0.0"} •{" "}
                {providerData.reviewCount || 0} reviews
              </Text>
            </View>
            <Text style={styles.categoryText}>{getPrimaryCategory()}</Text>
            {providerData.distance && (
              <Text style={styles.distanceText}>
                {formatDistance(providerData.distance)}
              </Text>
            )}
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {providerData.completedJobs || 0}
              </Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {providerData.successRate || 98}%
              </Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {providerData.responseTime || "<1h"}
              </Text>
              <Text style={styles.statLabel}>Response</Text>
            </View>
          </View>
        </View>

        {renderServices()}

        {/* About */}
        {(providerData.bio || providerData.about) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.aboutText}>
              {providerData.bio ||
                providerData.about ||
                "Professional service provider with years of experience."}
            </Text>
          </View>
        )}

        {/* Location */}
        {(providerData.location?.address || providerData.distance) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationContainer}>
              <Ionicons
                name="location-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.locationText}>
                {providerData.location?.address || "Location not specified"}
              </Text>
            </View>
            {providerData.distance && (
              <Text style={styles.distanceInfo}>
                Approximately {formatDistance(providerData.distance)}
              </Text>
            )}
          </View>
        )}

        {/* Reviews */}
        {providerData.reviews && providerData.reviews.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/(customer)/provider/${providerId}/reviews`)
                }
              >
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {providerData.reviews
              .slice(0, 3)
              .map((review: Review, index: number) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>
                        {review.reviewerName || "Anonymous"}
                      </Text>
                      <View style={styles.reviewRating}>
                        <Ionicons
                          name="star"
                          size={12}
                          color={Colors.warning}
                        />
                        <Text style={styles.reviewRatingText}>
                          {review.rating}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>
                      {review.createdAt || "Recent"}
                    </Text>
                  </View>
                  <Text style={styles.reviewText}>{review.comment}</Text>
                  {review.isRecommended && (
                    <Text style={styles.recommendedText}>✓ Recommended</Text>
                  )}
                </View>
              ))}
          </View>
        )}

        {/* Similar Providers */}
        {similarProviders && similarProviders.length > 0 && (
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
                      onPress={() =>
                        router.push(
                          `/(customer)/provider/${similarProvider.id}`,
                        )
                      }
                    >
                      <Image
                        source={{
                          uri: similarProvider.profileImage
                            ? (similarProvider.profileImage.startsWith('http')
                              ? similarProvider.profileImage
                              : `${API_BASE_URL.replace('/api', '')}/${similarProvider.profileImage}`)
                            : "https://via.placeholder.com/50",
                        }}
                        style={styles.similarProviderImage}
                      />
                      <View style={styles.similarProviderInfo}>
                        <Text style={styles.similarProviderName}>
                          {similarProvider.businessName ||
                            similarProvider.name ||
                            "Provider"}
                        </Text>
                        <View style={styles.similarProviderRating}>
                          <Ionicons
                            name="star"
                            size={12}
                            color={Colors.warning}
                          />
                          <Text style={styles.similarProviderRatingText}>
                            {similarProvider.rating?.toFixed(1) || "0.0"} (
                            {similarProvider.reviewCount || 0})
                          </Text>
                        </View>
                        <Text style={styles.similarProviderCategory}>
                          {similarProvider.services?.[0]?.service?.name ||
                            "Service Provider"}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={Colors.text.secondary}
                      />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Contact Actions */}
      <View style={styles.contactActions}>
        <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
          <Ionicons name="call-outline" size={20} color={Colors.primary} />
          <Text style={styles.contactButtonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactButton} onPress={handleMessage}>
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.contactButtonText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactButton} onPress={handleShare}>
          <Ionicons
            name="share-social-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.contactButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ServiceRequestModal
        visible={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedService(null);
        }}
        provider={providerData}
        userLocation={userLocation}
        selectedService={selectedService || undefined}
      />
    </View>
  );
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 100,
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
    fontWeight: "600",
    color: Colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.error,
    marginTop: 16,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: "center",
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
    fontWeight: "600",
  },
  providerInfo: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
    alignSelf: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.border,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  verifiedText: {
    fontSize: 10,
    color: "#166534",
    marginLeft: 4,
    fontWeight: "600",
  },
  providerDetails: {
    marginBottom: 16,
  },
  providerName: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 4,
    textAlign: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
  },
  distanceText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 2,
    textTransform: "uppercase",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  sectionCount: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
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
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: "700",
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
    alignItems: "center",
  },
  bookButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: "600",
  },
  aboutText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    marginRight: 8,
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
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
    color: "#166534",
    fontWeight: "600",
  },
  similarProvidersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  similarProvidersContainer: {
    gap: 12,
  },
  similarProviderCard: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  similarProviderRating: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
  },
});
