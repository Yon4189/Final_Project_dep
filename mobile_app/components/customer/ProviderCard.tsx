// components/customer/ProviderCard.tsx
import { Colors } from "@/app/constants/Colors";
import type { ServiceProvider } from "@/app/types/customer.types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RatingStars } from "./ratingstars";

const { width } = Dimensions.get("window");

interface ProviderCardProps {
  provider: ServiceProvider;
  onPress: (provider: ServiceProvider) => void;
  variant?: "list" | "grid" | "horizontal";
  showDistance?: boolean;
  showBadges?: boolean;
  showActions?: boolean;
  compact?: boolean;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  onPress,
  variant = "list",
  showDistance = true,
  showBadges = true,
  showActions = true,
  compact = false,
}) => {
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((word) => word?.[0] || "")
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderBadges = () => {
    if (!showBadges) return null;

    return (
      <View style={styles.badgesContainer}>
        {provider.verified && (
          <View style={[styles.badge, styles.verifiedBadge]}>
            <Ionicons
              name="checkmark-circle"
              size={12}
              color={Colors.surface}
            />
            <Text style={styles.badgeText}>Verified</Text>
          </View>
        )}
        {provider.insured && (
          <View style={[styles.badge, styles.insuredBadge]}>
            <Ionicons
              name="shield-checkmark"
              size={12}
              color={Colors.surface}
            />
            <Text style={styles.badgeText}>Insured</Text>
          </View>
        )}
        {provider.completedJobs && provider.completedJobs > 100 && (
          <View style={[styles.badge, styles.expertBadge]}>
            <Ionicons name="trophy" size={12} color={Colors.surface} />
            <Text style={styles.badgeText}>Expert</Text>
          </View>
        )}
      </View>
    );
  };

  const renderListVariant = () => (
    <TouchableOpacity
      style={[styles.card, styles.listCard]}
      onPress={() => onPress(provider)}
      activeOpacity={0.7}
    >
      <View style={styles.listContent}>
        {/* Provider Image */}
        <View style={styles.imageContainer}>
          {provider.profileImage ? (
            <Image
              source={{ uri: provider.profileImage }}
              style={styles.providerImage}
            />
          ) : (
            <LinearGradient
              colors={[Colors.primary + "80", Colors.primary]}
              style={styles.initialsContainer}
            >
              <Text style={styles.initialsText}>
                {getInitials(provider.businessName || provider.name || "")}
              </Text>
            </LinearGradient>
          )}
          {provider.verified && (
            <View style={styles.verifiedIcon}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={Colors.primary}
              />
            </View>
          )}
        </View>

        {/* Provider Info */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName} numberOfLines={1}>
              {provider.businessName || provider.name || "Service Provider"}
            </Text>
            {showDistance && provider.distance && (
              <View style={styles.distanceContainer}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={Colors.text.secondary}
                />
                <Text style={styles.distanceText}>
                  {provider.distance.toFixed(1)} km
                </Text>
              </View>
            )}
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <RatingStars rating={provider.rating || 0} size={14} />
            <Text style={styles.reviewCount}>
              ({provider.reviewCount || 0} reviews)
            </Text>
          </View>

          {/* Services */}
          <View style={styles.servicesContainer}>
            {provider.services?.slice(0, 3).map((service, index) => {
              // Handle both string and object service types
              const serviceName =
                typeof service === "string"
                  ? service
                  : (service as any).serviceName ||
                    (service as any).name ||
                    "Service";

              return (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceText} numberOfLines={1}>
                    {serviceName}
                  </Text>
                </View>
              );
            })}
            {provider.services && provider.services.length > 3 && (
              <View style={styles.moreTag}>
                <Text style={styles.moreText}>
                  +{provider.services.length - 3}
                </Text>
              </View>
            )}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons
                name="briefcase-outline"
                size={14}
                color={Colors.text.secondary}
              />
              <Text style={styles.statText}>
                {provider.completedJobs || 0}+ jobs
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={Colors.text.secondary}
              />
              <Text style={styles.statText}>
                {provider.responseTime || "~1h"}
              </Text>
            </View>
          </View>

          {/* Badges */}
          {renderBadges()}

          {/* Price and Action */}
          {showActions && (
            <View style={styles.actionRow}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Starting at</Text>
                <Text style={styles.priceValue}>
                  ${provider.priceRange?.min || 0}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => onPress(provider)}
              >
                <Text style={styles.bookButtonText}>Book Now</Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={Colors.surface}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGridVariant = () => (
    <TouchableOpacity
      style={[styles.card, styles.gridCard]}
      onPress={() => onPress(provider)}
      activeOpacity={0.7}
    >
      <View style={styles.gridContent}>
        {/* Provider Image */}
        <View style={styles.gridImageContainer}>
          {provider.profileImage ? (
            <Image
              source={{ uri: provider.profileImage }}
              style={styles.gridProviderImage}
            />
          ) : (
            <LinearGradient
              colors={[Colors.primary + "80", Colors.primary]}
              style={styles.gridInitialsContainer}
            >
              <Text style={styles.gridInitialsText}>
                {getInitials(provider.businessName || provider.name || "")}
              </Text>
            </LinearGradient>
          )}
          {provider.verified && (
            <View style={styles.gridVerifiedIcon}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={Colors.primary}
              />
            </View>
          )}
        </View>

        {/* Provider Info */}
        <Text style={styles.gridProviderName} numberOfLines={1}>
          {provider.businessName || provider.name || "Service Provider"}
        </Text>

        {/* Rating */}
        <View style={styles.gridRatingContainer}>
          <RatingStars rating={provider.rating || 0} size={12} />
          <Text style={styles.gridRatingCount}>
            ({provider.reviewCount || 0})
          </Text>
        </View>

        {/* Service Type */}
        <Text style={styles.gridServiceType} numberOfLines={1}>
          {provider.services && provider.services.length > 0
            ? typeof provider.services[0] === "string"
              ? provider.services[0]
              : (provider.services[0] as any).serviceName ||
                (provider.services[0] as any).name ||
                "Various Services"
            : "Various Services"}
        </Text>

        {/* Distance */}
        {showDistance && provider.distance && (
          <View style={styles.gridDistance}>
            <Ionicons
              name="location-outline"
              size={12}
              color={Colors.text.secondary}
            />
            <Text style={styles.gridDistanceText}>
              {provider.distance.toFixed(1)} km
            </Text>
          </View>
        )}

        {/* Price */}
        <View style={styles.gridPriceContainer}>
          <Text style={styles.gridPriceLabel}>From</Text>
          <Text style={styles.gridPriceValue}>
            ${provider.priceRange?.min || 0}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHorizontalVariant = () => (
    <TouchableOpacity
      style={[styles.card, styles.horizontalCard]}
      onPress={() => onPress(provider)}
      activeOpacity={0.7}
    >
      <View style={styles.horizontalContent}>
        {/* Provider Image */}
        <View style={styles.horizontalImageContainer}>
          {provider.profileImage ? (
            <Image
              source={{ uri: provider.profileImage }}
              style={styles.horizontalProviderImage}
            />
          ) : (
            <LinearGradient
              colors={[Colors.primary + "80", Colors.primary]}
              style={styles.horizontalInitialsContainer}
            >
              <Text style={styles.horizontalInitialsText}>
                {getInitials(provider.businessName || provider.name || "")}
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* Provider Info */}
        <View style={styles.horizontalInfo}>
          <Text style={styles.horizontalProviderName} numberOfLines={1}>
            {provider.businessName || provider.name || "Service Provider"}
          </Text>

          <View style={styles.horizontalRating}>
            <RatingStars rating={provider.rating || 0} size={12} />
            <Text style={styles.horizontalReviewCount}>
              ({provider.reviewCount || 0})
            </Text>
          </View>

          <View style={styles.horizontalFooter}>
            <View style={styles.horizontalPrice}>
              <Text style={styles.horizontalPriceLabel}>from</Text>
              <Text style={styles.horizontalPriceValue}>
                ${provider.priceRange?.min || 0}
              </Text>
            </View>

            {showDistance && provider.distance && (
              <View style={styles.horizontalDistance}>
                <Ionicons
                  name="location-outline"
                  size={12}
                  color={Colors.text.secondary}
                />
                <Text style={styles.horizontalDistanceText}>
                  {provider.distance.toFixed(1)} km
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (variant === "grid") return renderGridVariant();
  if (variant === "horizontal") return renderHorizontalVariant();
  return renderListVariant();
};

// Styles remain exactly the same...
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  listCard: {
    marginBottom: 12,
  },
  listContent: {
    flexDirection: "row",
    padding: 16,
  },
  imageContainer: {
    position: "relative",
    marginRight: 16,
  },
  providerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  initialsContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.surface,
  },
  verifiedIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewCount: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  serviceTag: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  serviceText: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  moreTag: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  moreText: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    marginLeft: 4,
    fontSize: 11,
    color: Colors.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedBadge: {
    backgroundColor: Colors.primary,
  },
  insuredBadge: {
    backgroundColor: Colors.success,
  },
  expertBadge: {
    backgroundColor: Colors.warning,
  },
  badgeText: {
    fontSize: 10,
    color: Colors.surface,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginRight: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  bookButtonText: {
    fontSize: 13,
    color: Colors.surface,
    fontWeight: "500",
  },
  // Grid Variant Styles
  gridCard: {
    width: (width - 48) / 2,
    marginBottom: 12,
  },
  gridContent: {
    padding: 12,
  },
  gridImageContainer: {
    position: "relative",
    alignItems: "center",
    marginBottom: 8,
  },
  gridProviderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  gridInitialsContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  gridInitialsText: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.surface,
  },
  gridVerifiedIcon: {
    position: "absolute",
    bottom: 0,
    right: 20,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  gridProviderName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: 4,
  },
  gridRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gridRatingCount: {
    marginLeft: 4,
    fontSize: 11,
    color: Colors.text.secondary,
  },
  gridServiceType: {
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: 4,
  },
  gridDistance: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  gridDistanceText: {
    marginLeft: 4,
    fontSize: 11,
    color: Colors.text.secondary,
  },
  gridPriceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  gridPriceLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginRight: 4,
  },
  gridPriceValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  // Horizontal Variant Styles
  horizontalCard: {
    width: 280,
    marginRight: 12,
  },
  horizontalContent: {
    flexDirection: "row",
    padding: 12,
  },
  horizontalImageContainer: {
    marginRight: 12,
  },
  horizontalProviderImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  horizontalInitialsContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  horizontalInitialsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.surface,
  },
  horizontalInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  horizontalProviderName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  horizontalRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  horizontalReviewCount: {
    marginLeft: 4,
    fontSize: 11,
    color: Colors.text.secondary,
  },
  horizontalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  horizontalPrice: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  horizontalPriceLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginRight: 2,
  },
  horizontalPriceValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  horizontalDistance: {
    flexDirection: "row",
    alignItems: "center",
  },
  horizontalDistanceText: {
    marginLeft: 2,
    fontSize: 11,
    color: Colors.text.secondary,
  },
});
