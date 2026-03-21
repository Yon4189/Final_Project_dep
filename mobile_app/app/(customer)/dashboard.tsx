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
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/app/constants/Colors";
const { width } = Dimensions.get("window");
import { useLocation } from "../../hooks/useLocation";
import { useSearch } from "../../hooks/useSearch";
import { useTopRatedProviders, useUnreadNotificationsCount } from "@/hooks/useCustomerQueries";
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
  const { data: unreadNotifications = 0 } = useUnreadNotificationsCount();
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
        providerID: selectedProvider?.id || "",
        serviceID: requestData.serviceId || "",
        scheduledDate: requestData.scheduledDate || "",
        agreed_price: requestData.estimatedPrice || 0,
        location_source: 'gps', // Default to GPS for current flow
        latitude: location?.latitude,
        longitude: location?.longitude,
        full_address: requestData.address || "",
        notes: requestData.description || "",
      });

      if (bookingResponse.success) {
        // Close modal
        setShowRequestModal(false);
        setSelectedProvider(null);

        // Show success message
        Alert.alert(
          "Request Sent",
          "Your service request has been sent successfully. You will be notified once the provider accepts your request. After acceptance, you can proceed to payment.",
          [
            {
              text: "View My Bookings",
              onPress: () => router.push("/(customer)/bookings"),
            },
            {
              text: "OK",
            },
          ]
        );
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
        <TouchableOpacity
          style={[styles.iconButton, {
            backgroundColor: Colors.primary + '15',
            borderRadius: 20,
            padding: 8,
            marginRight: 12
          }]}
          onPress={() => router.replace("/")}
        >
          <Ionicons name="home" size={24} color={Colors.primary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            Welcome back, {loadingUser ? "👋" : displayName}
          </Text>
          <Text style={styles.subtitle}>Find trusted service providers</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/(customer)/chat/index")}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color={Colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/(customer)/notifications")}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={Colors.primary}
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
                <View style={styles.profilePlaceholder}>
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={Colors.primary}
                  />
                </View>
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

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(customer)/bookings')}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: Colors.primary + '10' }]}>
            <Ionicons name="calendar-outline" size={26} color={Colors.primary} />
          </View>
          <Text style={styles.actionCardLabel}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(customer)/wallet/index')}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: Colors.success + '10' }]}>
            <Ionicons name="card-outline" size={26} color={Colors.success} />
          </View>
          <Text style={styles.actionCardLabel}>Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(customer)/chat/index')}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: Colors.info + '10' }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={26} color={Colors.info} />
          </View>
          <Text style={styles.actionCardLabel}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(customer)/complaints')}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: Colors.warning + '10' }]}>
            <Ionicons name="shield-outline" size={26} color={Colors.warning} />
          </View>
          <Text style={styles.actionCardLabel}>Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
          name="list-outline"
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
          name="map-outline"
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

  // renderProviderList has been integrated into the main return to avoid nested VirtualizedLists

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

      <View style={styles.mainContent}>
        {showMapView && (query || filters.categoryId) ? (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {renderQuickActions()}
            {renderTopRated()}
            {renderViewToggle()}
            {renderMapView()}
            <View style={styles.bottomPadding} />
          </ScrollView>
        ) : (
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
            ListHeaderComponent={
              <>
                {renderQuickActions()}
                {renderTopRated()}
                {!query && !filters.categoryId && (
                  <View style={styles.journeyCard}>
                    <Text style={styles.journeyTitle}>How the booking journey works</Text>
                    <Text style={styles.journeySubtitle}>Complete the steps below to secure your service smoothly.</Text>
                    <View style={styles.journeySteps}>
                      {[
                        { num: '1', icon: 'search', label: 'Book a service', desc: 'Pick a provider, select time, send the request.' },
                        { num: '2', icon: 'time-outline', label: 'Wait for acceptance', desc: 'Provider accepts or rejects your request. Check Notifications.' },
                        { num: '3', icon: 'card-outline', label: 'Pay after confirmation', desc: 'Tap "Pay Now" in your notification or request details to pay.' },
                      ].map((step, idx) => (
                        <View key={step.num} style={styles.journeyStep}>
                          <View style={styles.journeyStepLeft}>
                            <View style={styles.journeyNumBadge}>
                              <Text style={styles.journeyNum}>{step.num}</Text>
                            </View>
                            {idx < 2 && <View style={styles.journeyConnector} />}
                          </View>
                          <View style={styles.journeyStepContent}>
                            <Text style={styles.journeyStepLabel}>{step.label}</Text>
                            <Text style={styles.journeyStepDesc}>{step.desc}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {(query || filters.categoryId) && renderViewToggle()}
              </>
            }
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
            ListFooterComponent={searchLoading ? <LoadingSpinner /> : <View style={styles.bottomPadding} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.providersList}
          />
        )}
      </View>

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
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    backgroundColor: Colors.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
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
    zIndex: 10,
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
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionsContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2, // 2 columns with gap
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionCardLabel: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  journeyCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  journeyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  journeySubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  journeySteps: {
    marginTop: 10,
  },
  journeyStep: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  journeyStepLeft: {
    alignItems: 'center',
    width: 30,
    marginRight: 15,
  },
  journeyNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  journeyNum: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  journeyConnector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.primary + '30',
    marginVertical: 4,
  },
  journeyStepContent: {
    flex: 1,
    paddingBottom: 25,
  },
  journeyStepLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  journeyStepDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});
