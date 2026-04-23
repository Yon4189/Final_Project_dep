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
  Platform,
  Alert,
  Share,
  Linking,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/app/context/ThemeContext";
import { Colors, ThemeColors } from "@/app/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
const { width } = Dimensions.get("window");
import { useLocation } from "../../hooks/useLocation";
import { useSearch } from "../../hooks/useSearch";
import { useTopRatedProviders, useUnreadNotificationsCount } from "@/hooks/useCustomerQueries";
import { useConversations } from "@/hooks/useChat";
import { ServiceSearch } from "../../components/customer/ServiceSearch";
import { ProviderCard } from "../../components/customer/ProviderCard";
import { FilterModal } from "../../components/customer/FilterModal";
import { ServiceRequestModal } from "../../components/customer/ServiceRequestModal";
import { RecentMessagesModal } from "../../components/customer/RecentMessagesModal";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { api } from "@/app/services/api";
import { API_BASE_URL } from "@/app/config/api";
import { customerService } from "@/app/services/customer.service";
import { paymentService } from "@/app/services/payment.service";
import type { ServiceProvider } from "@/app/types/customer.types";
import { ActivityIndicator } from "react-native";
import * as SecureStore from 'expo-secure-store';
import { useCustomerStore } from "@/app/store/customerStore";
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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
  const [showRecentMessages, setShowRecentMessages] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const { data: unreadNotifications = 0 } = useUnreadNotificationsCount();
  const { data: conversationsResponse } = useConversations();
  const conversations = conversationsResponse?.data || [];
  const recentChats = Array.isArray(conversations) ? conversations.slice(0, 5) : [];
  // Add these with your other useState declarations
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [pendingComplaints, setPendingComplaints] = useState(0);
  
  // Sidebar animation and gesture handling
  const sidebarAnim = React.useRef(new Animated.Value(0)).current;
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const SIDEBAR_WIDTH = 260; // Slightly narrower as requested

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging to the left (negative dx)
        if (gestureState.dx < 0) {
          sidebarAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100 || gestureState.vx < -0.5) {
          // Close if swiped far enough or fast enough
          closeMenu();
        } else {
          // Snap back to open
          Animated.spring(sidebarAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    })
  ).current;

  const openMenu = () => {
    setShowHamburgerMenu(true);
    sidebarAnim.setValue(0); // Reset position
  };

  const closeMenu = () => {
    Animated.timing(sidebarAnim, {
      toValue: -SIDEBAR_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowHamburgerMenu(false);
    });
  };

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
      // Block frozen accounts from creating new bookings
      if (user?.account_status === 'frozen') {
        Alert.alert(
          'Account Frozen',
          'Your account is frozen due to an overdue payment. Please complete the outstanding payment to restore access.',
          [
            { text: 'Pay Now', onPress: () => router.push('/(customer)/bookings') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

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

  const handleLogout = async () => {
    closeMenu();
    Alert.alert(t('common.logout', 'Logout'), t('auth.confirmLogout', 'Are you sure you want to logout?'), [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      { 
        text: t('common.logout', 'Logout'), 
        style: 'destructive',
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('user_data');
            useCustomerStore.getState().reset();
            router.replace('/(auth)/login');
          } catch (error) {
            console.error('Logout error:', error);
          }
        }
      }
    ]);
  };

  const renderHamburgerMenu = () => {
    const menuItems = [
      {
        label: t('common.home', 'Home'),
        icon: 'home' as const,
        color: Colors.primary,
        onPress: () => {
          setShowHamburgerMenu(false);
          router.replace('/');
        },
      },
      {
        label: t('common.messages', 'Messages'),
        icon: 'chatbubble-ellipses-outline' as const,
        color: Colors.info || '#007AFF',
        onPress: () => {
          setShowHamburgerMenu(false);
          setShowRecentMessages(true);
        },
      },
      {
        label: t('common.bookings', 'Bookings'),
        icon: 'calendar-outline' as const,
        color: Colors.primary,
        onPress: () => {
          setShowHamburgerMenu(false);
          router.push('/(customer)/bookings');
        },
      },
      {
        label: t('common.disputes', 'Disputes'),
        icon: 'warning-outline' as const,
        color: Colors.warning || '#FF9500',
        onPress: () => {
          setShowHamburgerMenu(false);
          router.push('/(customer)/complaints');
        },
      },
      {
        label: t('common.logout', 'Logout'),
        icon: 'log-out-outline' as const,
        color: Colors.error || '#FF3B30',
        onPress: handleLogout,
      },
    ];

    return (
      <Modal
        visible={showHamburgerMenu}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeMenu}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </TouchableOpacity>
          
          <Animated.View 
            style={[
              styles.menuDropdown,
              { transform: [{ translateX: sidebarAnim }] }
            ]}
            {...panResponder.panHandlers}
          >
            <View
              style={[
                styles.menuHeader,
                {
                  backgroundColor: colors.primary,
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  paddingTop: Math.max(insets.top + 16, 28),
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 15 }}>
                <Image
                  source={{ 
                    uri: (() => {
                      const pic = user?.profilePicture || user?.profile_picture || user?.profileImage;
                      if (!pic) return 'https://via.placeholder.com/60';
                      return pic.startsWith('http') ? pic : `${API_BASE_URL.replace('/api', '')}/${pic}`;
                    })()
                  }}
                  style={styles.menuAvatar}
                />
                <TouchableOpacity 
                  onPress={closeMenu}
                  style={[styles.menuCloseButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              <View>
                <Text style={[styles.menuName, { color: 'white' }]}>{user?.fullname || user?.firstName || 'Customer'}</Text>
                <Text style={[styles.menuEmail, { color: 'rgba(255,255,255,0.8)' }]}>{user?.email || 'Customer Account'}</Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    index < menuItems.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => {
                    closeMenu();
                    item.onPress();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: item.color + '18' }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
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
      <View
        style={[
          styles.header,
          {
            flexDirection: 'column',
            paddingTop: Math.max(insets.top + 16, 32),
          },
        ]}
      >
        {/* Row 1: Greeting Only */}
        <View style={[styles.headerTopRow, { justifyContent: 'center', marginBottom: 12 }]}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>
              {t("customerDashboard.welcomeBack", "Welcome back,")} {loadingUser ? "👋" : displayName}
            </Text>
            <Text style={styles.subtitle}>{t("customerDashboard.findProviders", "Find trusted service providers")}</Text>
          </View>
        </View>

        {/* Row 2: Hamburger (Left) and Utilities (Right) */}
        <View style={[styles.navigationRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 0 }]}>
          {/* Left Side: Hamburger */}
          <View style={styles.leftIconColumn}>
            <TouchableOpacity
              style={styles.hamburgerButton}
              onPress={openMenu}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Right Side: Notifications & Profile */}
          <View style={[styles.headerActions, { position: 'relative', right: 0 }]}>
            <TouchableOpacity
              style={[styles.iconButton, { marginRight: 4 }]}
              onPress={() => router.push("/(customer)/notifications")}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={colors.primary}
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
                      color={colors.primary}
                    />
                  </View>
                );
              })()}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderCategories = () => {
    if (loadingCategories) {
      return (
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("customerDashboard.serviceCategories", "Service Categories")}</Text>
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
          <Text style={styles.sectionTitle}>{t("customerDashboard.serviceCategories", "Service Categories")}</Text>
          <TouchableOpacity onPress={handleViewAllCategories}>
            <Text style={styles.seeAllText}>{t("common.seeAll", "See All")}</Text>
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

  const renderRecentChats = () => {
    if (!recentChats || recentChats.length === 0) return null;

    return (
      <View style={styles.recentChatsSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t("customerDashboard.recentChats", "Recent Chats")}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(customer)/chat/index")}>
            <Text style={styles.seeAllText}>{t("common.seeAll", "See All")}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentChatsScroll}
        >
          {recentChats.map((item: any) => {
            const provider = item.other_party;
            if (!provider) return null;

            return (
              <TouchableOpacity
                key={item.conversationID}
                style={styles.recentChatCard}
                onPress={() => router.push(`/(customer)/chat/${provider.providerID || provider.id}`)}
              >
                <View style={styles.recentChatAvatarContainer}>
                  <Image
                    source={{
                      uri: provider.profilePicture
                        ? (provider.profilePicture.startsWith('http')
                          ? provider.profilePicture
                          : `${API_BASE_URL.replace('/api', '')}/${provider.profilePicture}`)
                        : 'https://via.placeholder.com/50'
                    }}
                    style={styles.recentChatAvatar}
                  />
                  {item.unread_count > 0 && (
                    <View style={styles.recentChatUnreadBadge} />
                  )}
                </View>
                <Text style={styles.recentChatName} numberOfLines={1}>
                  {provider.businessName || provider.fullname || 'Provider'}
                </Text>
              </TouchableOpacity>
            );
          })}
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
            <Ionicons name="star" size={20} color={colors.warning} />
            <Text style={styles.sectionTitle}>{t("customerDashboard.topRatedPros", "Top Rated Pros")}</Text>
          </View>
          <TouchableOpacity onPress={handleViewAllTopRated}>
            <Text style={styles.seeAllText}>{t("common.viewAll", "View All")}</Text>
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
                <Ionicons name="star" size={14} color={colors.warning} />
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
          color={!showMapView ? colors.primary : colors.text.secondary}
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
          color={showMapView ? colors.primary : colors.text.secondary}
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
    const markers = providers
      .filter((provider) => provider.location)
      .map((provider) => {
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

  if (locationLoading && !providers.length) {
    return (
      <View style={styles.initialLoading}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Finding providers near you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      {/* Account frozen banner */}
      {user?.account_status === 'frozen' && (
        <TouchableOpacity
          style={{ backgroundColor: Colors.error, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={() => router.push('/(customer)/bookings')}
        >
          <Ionicons name="lock-closed" size={18} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Account Frozen</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>
              Your account is frozen due to an overdue payment. Tap to pay and restore access.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      )}

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
            {renderRecentChats()}
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
                {renderRecentChats()}
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

      <RecentMessagesModal
        visible={showRecentMessages}
        onClose={() => setShowRecentMessages(false)}
        conversations={conversations}
        onSelectConversation={(providerId) => {
          router.push(`/(customer)/chat/${providerId}`);
        }}
        onSeeAll={() => {
          setShowRecentMessages(false);
          router.push("/(customer)/chat/index");
        }}
      />

      {renderHamburgerMenu()}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  greetingContainer: {
    alignItems: 'center',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  leftIconColumn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
    zIndex: 1,
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    marginLeft: 4,
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  profilePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  content: {
    flex: 1,
  },
  categoriesSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  seeAllText: {
    color: colors.primary,
    fontWeight: '600',
  },
  categoriesScroll: {
    marginLeft: -20,
    paddingLeft: 20,
    marginBottom: 10,
  },
  categoryCard: {
    width: 85,
    alignItems: 'center',
    marginRight: 15,
    padding: 10,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryCardSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  recentChatsSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  recentChatsScroll: {
    paddingBottom: 5,
    marginLeft: -20,
    paddingLeft: 20,
  },
  recentChatCard: {
    width: 75,
    marginRight: 15,
    alignItems: 'center',
  },
  recentChatAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  recentChatAvatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentChatUnreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  recentChatName: {
    fontSize: 11,
    color: colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  topRatedSection: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  topRatedScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  topRatedCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 12,
    marginRight: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topRatedImage: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  topRatedName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  topRatedRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  topRatedRatingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  topRatedReviews: {
    fontSize: 10,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  topRatedDistance: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  viewToggleActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  viewToggleTextActive: {
    color: colors.primary,
  },
  mapContainer: {
    height: 400,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  journeyCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 25,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  journeyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  journeySubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  journeySteps: {
    gap: 0,
  },
  journeyStep: {
    flexDirection: 'row',
    gap: 15,
  },
  journeyStepLeft: {
    alignItems: 'center',
    width: 30,
  },
  journeyNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  journeyNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  journeyConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.primary + '30',
    marginVertical: 4,
  },
  journeyStepContent: {
    flex: 1,
    paddingBottom: 25,
  },
  journeyStepLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  journeyStepDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  providersList: {
    paddingBottom: 100,
  },
  initialLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.text.secondary,
  },
  bottomPadding: {
    height: 100,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuDropdown: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 260,
    height: '100%',
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 10,
  },
  menuName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuEmail: {
    fontSize: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
    marginHorizontal: 15,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  menuCloseButton: {
    padding: 6,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRadius: 0,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  skeletonCard: {
    backgroundColor: colors.skeleton,
    opacity: 0.5,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  actionCardLabel: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
