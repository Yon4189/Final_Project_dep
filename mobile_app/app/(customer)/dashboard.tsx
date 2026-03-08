// app/(customer)/dashboard.tsx
import React, { useState, useEffect, useCallback } from "react";
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
  Alert,
  Share,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/app/constants/Colors";
import { useLocation } from "../../hooks/useLocation";
import { useSearch } from "../../hooks/useSearch";
import { useTopRatedProviders } from "@/hooks/useCustomerQueries";
import { ServiceSearch } from "../../components/customer/ServiceSearch";
import { ProviderCard } from "../../components/customer/ProviderCard";
import { FilterModal } from "../../components/customer/FilterModal";
import { ServiceRequestModal } from "../../components/customer/ServiceRequestModal";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { api } from "@/app/services/api";
import { API_BASE_URL } from "@/app/config/api";
import { customerService } from "@/app/services/customer.service";
import { paymentService } from "@/app/services/payment.service";
import type { ServiceProvider } from "@/app/types/customer.types";
import { ActivityIndicator } from "react-native";
// Import the appropriate map based on platform
let MapComponent: any;
if (Platform.OS === "web") {
  // For web, use the Leaflet mapF
  MapComponent = require("../../components/Map/index").default;
} else {
  // For mobile, use the React Native Maps component
  MapComponent = require("../../components/Map").default;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { location, loading: locationLoading } = useLocation();

  console.log("Dashboard - Location:", location);
  console.log("Dashboard - Location Loading:", locationLoading);

  const {
    query,
    setQuery,
    filters,
    updateFilters,
    results: providers,
    loading: searchLoading,
    loadMore,
    refresh: refreshSearch,
  } = useSearch();

  console.log("Dashboard - Search Hook - Query:", query);
  console.log("Dashboard - Search Hook - Loading:", searchLoading);
  console.log("Dashboard - Search Hook - Providers:", providers.length);

  const { data: topRatedProviders, isLoading: topRatedLoading } =
    useTopRatedProviders(5);

  const [showMapView, setShowMapView] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<ServiceProvider | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  // Add these with your other useState declarations
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [pendingComplaints, setPendingComplaints] = useState(0);
  // Load user data and service categories on mount
  // Add this with your other functions
  const loadComplaints = async () => {
    try {
      setLoadingComplaints(true);
      const response = await customerService.getMyComplaints();
      if (response.success && response.data) {
        const complaintsData = response.data;
        setComplaints(complaintsData);

        // Count pending complaints
        const pending = complaintsData.filter(
          (c: any) => c.status === "pending" || c.status === "under_review",
        ).length;

        setPendingComplaints(pending);
      }
    } catch (error) {
      console.error("Error loading complaints:", error);
    } finally {
      setLoadingComplaints(false);
    }
  };
  useEffect(() => {
    loadUserData();
    loadServiceCategories();
    loadUnreadNotifications();
  }, []);

  // Trigger initial search when location becomes available
  useEffect(() => {
    if (location && !locationLoading) {
      console.log(
        "Dashboard - Location available, triggering initial search...",
      );
      refreshSearch();
    }
  }, [location, locationLoading, refreshSearch]);

  const loadUserData = async () => {
    try {
      setLoadingUser(true);

      // First try to get user data from stored data
      const userData = await api.getUserData();
      console.log("Stored user data:", userData);

      if (userData) {
        setUser(userData);
      } else {
        // If no stored data, try to fetch profile
        try {
          const profileResponse = await customerService.getProfile();
          if (profileResponse.success) {
            setUser(profileResponse.data);
            await api.setUserData(profileResponse.data);
          }
        } catch (error) {
          console.error("Failed to load profile:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoadingUser(false);
    }
  };

  const loadUnreadNotifications = async () => {
    try {
      const response = await api.get("/customer/notifications/unread-count");
      console.log("Notification response:", response);

      if (response.success && response.data) {
        // Handle different possible response structures
        if (typeof response.data === "object") {
          const data = response.data as any;
          // Check for count in different possible locations
          if (data.count !== undefined) {
            setUnreadNotifications(data.count);
          } else if (data.unread !== undefined) {
            setUnreadNotifications(data.unread);
          } else if (data.total !== undefined) {
            setUnreadNotifications(data.total);
          }
        }
      }
    } catch (error) {
      console.log("Error fetching notifications count:", error);
    }
  };

  const loadServiceCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await customerService.getServiceCategories();
      if (response.success && response.data) {
        // Transform the data to ensure consistent format
        const transformedCategories = response.data.map((category: any) => ({
          id: (category.catagoryID ?? category.id ?? "").toString(),
          name: category.name ?? "Service",
          icon: category.icon || "🔧",
          description: category.description || "",
        }));
        setServiceCategories(transformedCategories);
      }
    } catch (error) {
      console.error("Failed to load service categories:", error);
      // Fallback to empty array if API fails
      setServiceCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Generate search suggestions based on query
  useEffect(() => {
    console.log("Dashboard - Query changed:", query);
    console.log("Dashboard - Location available:", !!location);
    console.log("Dashboard - Providers count:", providers.length);

    if (query.length > 1) {
      // Get suggestions from API
      const fetchSuggestions = async () => {
        try {
          const response = await customerService.getSearchSuggestions(query);
          if (response.success) {
            setSuggestions(response.data || []);
          }
        } catch (error) {
          // Fallback to mock suggestions
          const mockSuggestions = [
            `${query} plumbing`,
            `${query} electrician`,
            `${query} cleaning`,
            `${query} repair`,
          ];
          setSuggestions(mockSuggestions);
        }
      };

      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query, location, providers.length]);

  const handleCategorySelect = (categoryId: string) => {
    console.log("Dashboard - Category selected:", categoryId);
    setSelectedCategory(categoryId);

    // Navigate to search results with category filter
    router.push({
      pathname: "/(customer)/search/results",
      params: {
        categoryId,
        sortBy: "rating",
        minRating: "0",
        maxDistance: "50",
      },
    });
  };

  const handleViewAllCategories = () => {
    router.push("/(customer)/categories");
  };

  const handleProviderSelect = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setShowRequestModal(true);
  };

  const handleFilterApply = (newFilters: any) => {
    updateFilters(newFilters);
  };

  const handleVoiceSearch = () => {
    Alert.alert("Voice Search", "Voice search feature coming soon!");
  };

  const handleServiceRequest = async (requestData: any) => {
    try {
      // Create service request
      const bookingResponse = await customerService.createBooking({
        provider_id: selectedProvider?.id || "",
        service_id: requestData.serviceId || "",
        scheduled_date: requestData.scheduledDate || "",
        scheduled_time: requestData.scheduledTime || "",
        address: requestData.address || "",
        description: requestData.description || "",
        estimated_price: requestData.estimatedPrice || 0,
      });

      if (bookingResponse.success) {
        // Initialize payment
        const paymentResponse = await paymentService.initializeChapaPayment({
          amount: requestData.estimatedPrice || 0,
          email: user?.email || "customer@example.com",
          firstName: user?.fullname?.split(" ")[0] || "Customer",
          lastName: user?.fullname?.split(" ").slice(1).join(" ") || "User",
          phoneNumber: user?.phone,
          customerId: user?.customerID,
          bookingId: bookingResponse.data.id,
          paymentMethod: requestData.paymentMethod,
          description: `Payment for ${requestData.serviceName}`,
        });

        if (paymentResponse.checkoutUrl) {
          // Close modal and redirect to payment
          setShowRequestModal(false);
          setSelectedProvider(null);

          // Open payment URL in browser/webview
          if (Platform.OS === "web") {
            window.open(paymentResponse.checkoutUrl, "_blank");
          } else {
            router.push({
              pathname: "/(customer)/payment",
              params: { url: paymentResponse.checkoutUrl },
            });
          }
        }
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to process service request. Please try again.",
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSearch();
    await loadUnreadNotifications();
    await loadServiceCategories();
    setRefreshing(false);
  };

  const renderHeader = () => {
    // Get user's first name from fullname
    let displayName = "User";
    if (user?.fullname) {
      displayName = user.fullname.split(" ")[0]; // Get first name
    } else if (user?.firstName) {
      displayName = user.firstName.split(" ")[0];
    }

    return (
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {loadingUser ? "👋" : displayName}! 👋
          </Text>
          <Text style={styles.subtitle}>Find trusted service providers</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push("/(customer)/chat/index")}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={24}
              color={Colors.text.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push("/(customer)/notifications")}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={Colors.text.primary}
            />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push("/(customer)/complaints")}
          >
            <Ionicons
              name="alert-circle-outline"
              size={24}
              color={Colors.text.primary}
            />
            {pendingComplaints > 0 && (
              <View style={[styles.badge, styles.complaintBadge]}>
                <Text style={styles.badgeText}>{pendingComplaints}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/(customer)/profile")}
          >
            {(() => {
              const pic = user?.profilePicture || user?.profile_picture;
              if (pic) {
                return (
                  <Image
                    source={{
                      uri: pic.startsWith("http")
                        ? pic
                        : `${API_BASE_URL.replace("/api", "")}/${pic}`,
                    }}
                    style={styles.profileImage}
                  />
                );
              }
              return (
                <Ionicons
                  name="person-circle"
                  size={40}
                  color={Colors.primary}
                />
              );
            })()}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCategories = () => {
    if (loadingCategories) {
      return (
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Service Categories</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {[1, 2, 3, 4, 5].map((index) => (
              <View
                key={index}
                style={[styles.categoryCard, styles.skeletonCard]}
              />
            ))}
          </ScrollView>
        </View>
      );
    }

    if (!serviceCategories.length) {
      return null;
    }

    // Show only first 8 categories horizontally
    const displayedCategories = serviceCategories.slice(0, 8);

    return (
      <View style={styles.categoriesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Service Categories</Text>
          <TouchableOpacity onPress={handleViewAllCategories}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          {displayedCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategory === category.id && styles.categoryCardSelected,
              ]}
              onPress={() => handleCategorySelect(category.id)}
            >
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
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
      return <LoadingSpinner />;
    }

    if (!topRatedProviders?.length) {
      return null;
    }

    const handleViewAllTopRated = () => {
      // Navigate to search results with top rated filters
      router.push({
        pathname: "/(customer)/search/results",
        params: {
          sortBy: "rating",
          minRating: "4",
          // You can add more filters here
          // categoryId: filters.categoryId || '',
          // maxDistance: '50',
        },
      });
    };

    const handleProviderPress = (provider: ServiceProvider) => {
      // Navigate to provider details page where they can book
      router.push(`/(customer)/provider/${provider.id}`);
    };

    return (
      <View style={styles.topRatedSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="star" size={20} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Top Rated Pros</Text>
          </View>
          <TouchableOpacity onPress={handleViewAllTopRated}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.topRatedScroll}
        >
          {topRatedProviders.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={styles.topRatedCard}
              onPress={() => handleProviderPress(provider)}
            >
              <Image
                source={{
                  uri:
                    provider.profileImage || "https://via.placeholder.com/60",
                }}
                style={styles.topRatedImage}
              />
              <Text style={styles.topRatedName} numberOfLines={1}>
                {provider.businessName}
              </Text>
              <View style={styles.topRatedRating}>
                <Ionicons name="star" size={14} color={Colors.warning} />
                <Text style={styles.topRatedRatingText}>
                  {provider.rating.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.topRatedReviews}>
                ({provider.reviewCount} reviews)
              </Text>
              {provider.distance && (
                <Text style={styles.topRatedDistance}>
                  {provider.distance < 1
                    ? `${Math.round(provider.distance * 1000)}m`
                    : `${provider.distance.toFixed(1)}km`}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderViewToggle = () => (
    <View style={styles.viewToggle}>
      <TouchableOpacity
        style={[
          styles.viewToggleButton,
          !showMapView && styles.viewToggleActive,
        ]}
        onPress={() => setShowMapView(false)}
      >
        <Ionicons
          name="list"
          size={20}
          color={!showMapView ? Colors.primary : Colors.text.secondary}
        />
        <Text
          style={[
            styles.viewToggleText,
            !showMapView && styles.viewToggleTextActive,
          ]}
        >
          List
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.viewToggleButton,
          showMapView && styles.viewToggleActive,
        ]}
        onPress={() => setShowMapView(true)}
      >
        <Ionicons
          name="map"
          size={20}
          color={showMapView ? Colors.primary : Colors.text.secondary}
        />
        <Text
          style={[
            styles.viewToggleText,
            showMapView && styles.viewToggleTextActive,
          ]}
        >
          Map
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMapView = () => {
    // Convert providers to markers format
    const markers = providers
      .filter((provider) => provider.location) // Filter out providers without location
      .map((provider) => {
        // TypeScript assertion to ensure location exists after filter
        const location = provider.location!;
        return {
          position:
            Platform.OS === "web"
              ? [location.latitude, location.longitude]
              : { latitude: location.latitude, longitude: location.longitude },
          title: provider?.businessName ?? provider?.name ?? "Service Provider",
          description: `Rating: ${provider.rating || 0} ⭐ • ${provider.reviewCount || 0} reviews${provider.distance ? ` • ${provider.distance < 1 ? `${Math.round(provider.distance * 1000)}m` : `${provider.distance.toFixed(1)}km`} away` : ""}`,
          rating: provider.rating || 0,
          reviewCount: provider.reviewCount || 0,
          distance: provider.distance,
          onPress: () => handleProviderSelect(provider),
        };
      });

    // Prepare center coordinates
    const center = location
      ? Platform.OS === "web"
        ? [location.latitude, location.longitude]
        : { latitude: location.latitude, longitude: location.longitude }
      : Platform.OS === "web"
        ? [9.03, 38.74]
        : { latitude: 9.03, longitude: 38.74 };

    return (
      <View style={styles.mapContainer}>
        <MapComponent
          center={center}
          markers={markers}
          style={{ height: "100%", width: "100%" }}
          zoom={13}
          showUserLocation={true}
          onMarkerPress={(marker: any) => marker.onPress && marker.onPress()}
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
          onPress={() => router.push(`/(customer)/provider/${item.id}`)}
          onBookPress={() => handleProviderSelect(item)}
          onChatPress={() => router.push(`/(customer)/chat/${item.id}`)}
          onCallPress={() => {
            if (item.phone) {
              Linking.openURL(`tel:${item.phone}`);
            } else {
              Alert.alert('Error', 'Provider phone number not available');
            }
          }}
          onSharePress={async () => {
            try {
              const providerName = item.businessName || item.name || "this provider";
              const shareUrl = `${API_BASE_URL.replace('/api', '')}/provider/${item.id}`;
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
          showDistance={true}
          showBadges={true}
          showActions={true}
          showServices={true}
          showCategory={true}
        />
      )}
      contentContainerStyle={styles.providersList}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={searchLoading ? <LoadingSpinner /> : null}
      ListEmptyComponent={
        !searchLoading && !locationLoading ? (
          <EmptyState
            icon="search-outline"
            title="No providers found"
            message="Try adjusting your search or filters"
            actionLabel="Clear Filters"
            onAction={() => {
              setQuery("");
              updateFilters({});
            }}
            variant="default"
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
          onSearch={() => refreshSearch()}
          onFilterPress={() => setShowFilterModal(true)}
          onVoicePress={handleVoiceSearch}
          onCategorySelect={handleCategorySelect}
          suggestions={suggestions}
          searchResults={providers}
          categories={serviceCategories.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
          }))}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTopRated()}

        {query || filters.categoryId ? (
          <>
            {renderViewToggle()}

            {showMapView ? renderMapView() : renderProviderList()}
          </>
        ) : null}

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
        userLocation={
          location
            ? {
              latitude: location.latitude,
              longitude: location.longitude,
            }
            : undefined
        }
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: Colors.surface,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16, // Adds consistent spacing between all header buttons
    marginRight: 4, // Prevents elements from sticking too closely to edge on smaller devices
  },
  notificationButton: {
    position: "relative",
    padding: 4,
  },
  headerButton: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: "bold",
  },
  complaintBadge: {
    backgroundColor: Colors.warning,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: "bold",
  },
  profileButton: {
    padding: 2,
    marginLeft: 4,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
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
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.primary,
    marginLeft: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
  },
  categoriesScroll: {
    paddingLeft: 20,
    marginBottom: 29,
  },
  categoryCard: {
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: "center",
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
    alignItems: "center",
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
    fontWeight: "500",
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: 4,
  },
  topRatedRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  topRatedRatingText: {
    marginLeft: 2,
    fontSize: 11,
    color: Colors.text.primary,
    fontWeight: "500",
  },
  topRatedReviews: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  topRatedDistance: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "500",
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  viewToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
  },
  viewToggleActive: {
    backgroundColor: Colors.primary + "20",
  },
  viewToggleText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  viewToggleTextActive: {
    color: Colors.primary,
    fontWeight: "500",
  },
  mapContainer: {
    height: 500,
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
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
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 16,
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  popularItem: {
    width: "33.33%",
    padding: 5,
  },
  popularItemText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  popularItemIcon: {
    fontSize: 24,
    textAlign: "center",
    color: Colors.primary,
  },
  bottomPadding: {
    height: 80,
  },
  skeletonCard: {
    backgroundColor: "#e0e0e0",
    opacity: 0.7,
  },
  initialLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.text.secondary,
  },
});
