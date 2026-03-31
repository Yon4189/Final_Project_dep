// app/(provider)/dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  FlatList,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { useProviderStore } from '../store/providerStore';
import { useProviderQueries } from '../../hooks/useProviderQueries';
import { useProviderNotificationCount } from '../../hooks/useProviderNotifications';
import * as pusherClient from '@/app/services/pusherClient';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatTimeAgo } from '../utils/formatters';
import { PriceText } from '../../components/common/PriceText';
import { API_BASE_URL } from '../config/api';
import { useConversations } from '../../hooks/useChat';
import { RecentMessagesModal } from '../../components/provider/RecentMessagesModal';
import type { ServiceRequest } from '../types/provider.types';
import type { RequestStatus } from '../types/provider.types';
const { width } = Dimensions.get('window');
const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: Colors.warning,
  accepted: Colors.info,
  confirmed: Colors.primary,
  arrived: Colors.primary,
  in_progress: Colors.info,
  waiting_customer_confirmation: Colors.warning,
  completed: Colors.success,
  cancelled: Colors.error,
  disputed: Colors.warning,
};
const STATUS_ICONS: Record<RequestStatus, keyof typeof Ionicons.glyphMap> = {
  pending: 'time-outline',
  accepted: 'checkmark-circle-outline',
  confirmed: 'card-outline',
  arrived: 'navigate-outline',
  in_progress: 'construct-outline',
  waiting_customer_confirmation: 'hourglass-outline',
  completed: 'checkmark-done-outline',
  cancelled: 'close-circle-outline',
  disputed: 'alert-circle-outline',
};

export default function ProviderDashboard() {
  const router = useRouter();
  const { profile, toggleAvailability } = useProviderStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'today' | 'upcoming'>('today');
  const [showRecentMessages, setShowRecentMessages] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

  const {
    stats,
    todaySchedule,
    pendingRequests,
    earnings,
    isLoading,
    refetch,
    acceptRequest,
    rejectRequest,
    arriveRequest,
    startService,
    completeService,
  } = useProviderQueries();
  const { data: conversations, isLoading: isChatsLoading } = useConversations();
  const notificationCountQuery = useProviderNotificationCount();
  const unreadNotificationCount = notificationCountQuery.data ?? 0;

  // Debug logging
  useEffect(() => {
    if (profile) {
      console.log('🔥 FULL Provider profile:', JSON.stringify(profile, null, 2));
      console.log('🔥 profilePicture field:', profile.profilePicture);
      console.log('🔥 profileImage field:', (profile as any).profileImage);
      console.log('🔥 All keys:', Object.keys(profile));
    } else {
      console.log('🔥 Profile is null');
    }
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), notificationCountQuery.refetch()]);
    setRefreshing(false);
  };

  // Real-time updates
  useEffect(() => {
    if (profile?.providerID) {
      pusherClient.subscribeToUserUpdates(
        "provider",
        profile.providerID,
        (data: any) => {
          console.log("[Pusher] Dashboard update received:", data);
          refetch(); // Refresh whole dashboard on any booking update
        }
      );

      return () => {
        pusherClient.unsubscribeFromUserUpdates("provider", profile.providerID);
      };
    }
  }, [profile?.providerID]);

  const renderHeader = () => (
    <LinearGradient
      colors={[Colors.primary, Colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { flexDirection: 'column' }]}
    >

      {/* Row 1: Greeting Only */}
      <View style={{ justifyContent: 'center', marginBottom: 16, alignItems: 'center' }}>
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { textAlign: 'center', marginRight: 0 }]}>Welcome back,</Text>
          <Text style={[styles.profileName, { textAlign: 'center', marginRight: 0 }]}>
            {profile?.fullname || profile?.businessName || 'Provider'}
          </Text>
        </View>
      </View>

        {/* Row 2: Hamburger (Left) and Utilities (Right) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 }}>
          {/* Left Side: Hamburger */}
          <TouchableOpacity
            style={{ 
              backgroundColor: Colors.surface, 
              borderRadius: 14, 
              width: 44, 
              height: 44, 
              justifyContent: 'center', 
              alignItems: 'center',
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            }}
            onPress={() => setShowHamburgerMenu(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={Colors.primary} />
          </TouchableOpacity>

          {/* Right Side: Notifications & Profile */}
          <View style={[styles.headerActions, { position: 'relative', right: 0 }]}>
            <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setShowRecentMessages(true)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.surface} />
            {conversations?.some((c: any) => c.unread_count > 0) && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {conversations.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/(provider)/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.surface} />
            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/(provider)/profile')}
          >
            <Image
              source={{
                uri: (() => {
                  const pic = (profile as any)?.profile_picture || profile?.profilePicture || (profile as any)?.profileImage;
                  if (!pic) return 'https://via.placeholder.com/40';
                  if (pic.startsWith('http')) return pic;
                  return `${API_BASE_URL.replace('/api', '')}/${pic}`;
                })()
              }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Availability Toggle */}
      <View style={styles.availabilityContainer}>
        <View style={styles.availabilityInfo}>
          <View style={[styles.availabilityDot, {
            backgroundColor: profile?.isAvailable ? Colors.success : Colors.error
          }]} />
          <Text style={styles.availabilityText}>
            {profile?.isAvailable ? 'Available for work' : 'Not available'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.availabilityToggle, {
            backgroundColor: profile?.isAvailable ? Colors.success + '20' : Colors.error + '20',
          }]}
          onPress={toggleAvailability}
        >
          <Text style={[styles.availabilityToggleText, {
            color: profile?.isAvailable ? Colors.success : Colors.error
          }]}>
            {profile?.isAvailable ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/(provider)/earnings')}
        >
          <PriceText style={styles.statValue} amount={earnings?.today || 0} />
          <Text style={styles.statLabel}>Today</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/(provider)/earnings')}
        >
          <PriceText style={styles.statValue} amount={earnings?.week || 0} />
          <Text style={styles.statLabel}>This Week</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/(provider)/earnings')}
        >
          <PriceText style={styles.statValue} amount={earnings?.month || 0} />
          <Text style={styles.statLabel}>This Month</Text>
        </TouchableOpacity>
      </View>

      {/* Rating Card */}
      <TouchableOpacity
        style={styles.ratingCard}
        onPress={() => router.push('/(provider)/reviews')}
      >
        <View style={styles.ratingLeft}>
          <Text style={styles.ratingValue}>{Number(profile?.rating || 0).toFixed(1) || '0.0'}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.floor(profile?.rating || 0) ? 'star' : 'star-outline'}
                size={16}
                color={Colors.warning}
              />
            ))}
          </View>
        </View>

        <View style={styles.ratingRight}>
          <Text style={styles.reviewCount}>{profile?.reviewCount || 0} reviews</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.surface} />
        </View>
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/(provider)/requests')}
      >
        <View style={[styles.actionIcon, { backgroundColor: Colors.primary + '20' }]}>
          <Ionicons name="clipboard-outline" size={24} color={Colors.primary} />
        </View>
        <Text style={styles.actionLabel}>Requests</Text>
        {pendingRequests?.length > 0 && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{pendingRequests.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/(provider)/schedule')}
      >
        <View style={[styles.actionIcon, { backgroundColor: Colors.success + '20' }]}>
          <Ionicons name="calendar-outline" size={24} color={Colors.success} />
        </View>
        <Text style={styles.actionLabel}>Schedule</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setShowRecentMessages(true)}
      >
        <View style={[styles.actionIcon, { backgroundColor: Colors.info + '20' }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.info} />
        </View>
        <Text style={styles.actionLabel}>Messages</Text>
        {conversations?.some((c: any) => c.unread_count > 0) && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>
              {conversations.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/(provider)/earnings')}
      >
        <View style={[styles.actionIcon, { backgroundColor: Colors.warning + '20' }]}>
          <Ionicons name="wallet-outline" size={24} color={Colors.warning} />
        </View>
        <Text style={styles.actionLabel}>Earnings</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecentChats = () => {
    if (isChatsLoading || !conversations?.length) return null;

    return (
      <View style={styles.chatsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Chats</Text>
          <TouchableOpacity onPress={() => router.push('/(provider)/chat')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chatsScroll}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {conversations.slice(0, 5).map((chat: any) => {
            const customer = chat.other_party;
            if (!customer) return null;

            return (
              <TouchableOpacity
                key={chat.conversationID}
                style={styles.chatCard}
                onPress={() => router.push(`/(provider)/chat/${chat.conversationID}`)}
              >
                <View style={styles.chatAvatarContainer}>
                  <Image
                    source={{
                      uri: customer.profilePicture
                        ? (customer.profilePicture.startsWith('http')
                          ? customer.profilePicture
                          : `${API_BASE_URL.replace('/api', '')}/${customer.profilePicture}`)
                        : 'https://via.placeholder.com/60',
                    }}
                    style={styles.chatAvatar}
                  />
                  {chat.unread_count > 0 && (
                    <View style={styles.chatUnreadBadge} />
                  )}
                </View>
                <Text style={styles.chatName} numberOfLines={1}>
                  {customer.fullname || 'Customer'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {['today', 'pending', 'upcoming'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            selectedTab === tab && styles.tabActive,
          ]}
          onPress={() => setSelectedTab(tab as any)}
        >
          <Text style={[
            styles.tabText,
            selectedTab === tab && styles.tabTextActive,
          ]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
          {tab === 'pending' && pendingRequests?.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRequestCard = ({ item }: { item: ServiceRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => router.push(`/(provider)/requests/${item.id}`)}
    >
      <View style={styles.requestHeader}>
        <View style={styles.customerInfo}>
          <Image
            source={{ uri: item.customerImage || 'https://via.placeholder.com/40' }}
            style={styles.customerImage}
          />
          <View>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.serviceName}>{item.serviceName}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {item.payment && (item.status === 'confirmed' || item.payment.status === 'held' || item.payment.status === 'paid') && (
            <View style={[styles.statusBadge, { backgroundColor: Colors.success + '20' }]}>
              <Ionicons name="card" size={12} color={Colors.success} />
              <Text style={[styles.statusText, { color: Colors.success }]}>PAID</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
            <Ionicons
              name={STATUS_ICONS[item.status]}
              size={12}
              color={STATUS_COLORS[item.status]}
            />
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.detailText}>
            {item.scheduledDate} at {item.scheduledTime}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.customerAddress}
          </Text>
        </View>

        {item.distance && (
          <View style={styles.detailRow}>
            <Ionicons name="navigate-outline" size={16} color={Colors.text.secondary} />
            <Text style={styles.detailText}>
              {item.distance.toFixed(1)} km • {item.travelTime} min drive
            </Text>
          </View>
        )}

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Est. Price:</Text>
          <PriceText style={styles.priceValue} amount={item.estimatedPrice} />
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptRequest(item.id)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectRequest(item.id)}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'confirmed' && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.primary, flex: 1, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 }]}
            onPress={() => arriveRequest.mutate(item.id)}
          >
            <Ionicons name="navigate-outline" size={18} color={Colors.surface} style={{ marginRight: 6 }} />
            <Text style={{ color: Colors.surface, fontWeight: 'bold' }}>Mark Arrived</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'arrived' && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.success, flex: 1, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 }]}
            onPress={() => startService.mutate(item.id)}
          >
            <Ionicons name="play-outline" size={18} color={Colors.surface} style={{ marginRight: 6 }} />
            <Text style={{ color: Colors.surface, fontWeight: 'bold' }}>Start Service</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'in_progress' && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.info, flex: 1, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 }]}
            onPress={() => completeService.mutate(item.id)}
          >
            <Ionicons name="checkmark-done-outline" size={18} color={Colors.surface} style={{ marginRight: 6 }} />
            <Text style={{ color: Colors.surface, fontWeight: 'bold' }}>Complete Work</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'waiting_customer_confirmation' && (
        <View style={[styles.statusBanner, { backgroundColor: Colors.warning + '20', marginTop: 10, padding: 8, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: Colors.warning }]}>
          <Text style={{ color: Colors.warning, fontSize: 12, fontWeight: '600' }}>
            Awaiting customer confirmation to release payment.
          </Text>
        </View>
      )}

      {['accepted'].includes(item.status) && (
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={() => router.push(`/(provider)/requests/${item.id}`)}
        >
          <Ionicons name="navigate" size={20} color={Colors.surface} />
          <Text style={styles.directionsButtonText}>View Details / Map</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const handleAcceptRequest = async (id: string) => {
    Alert.alert(
      'Accept Request',
      'Are you sure you want to accept this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptRequest.mutateAsync(id);
              // After success, query invalidation refreshes the list
            } catch (error) {
              // Error handled by mutation onError
            }
          }
        },
      ]
    );
  };

  const handleRejectRequest = (id: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: async () => {
            try {
              await rejectRequest.mutateAsync({ id, reason: 'Rejected by provider' });
            } catch (error) {
              // Error handled by mutation onError
            }
          },
          style: 'destructive'
        },
      ]
    );
  };

  const getCurrentRequests = () => {
    switch (selectedTab) {
      case 'today':
        return todaySchedule || [];
      case 'pending':
        return pendingRequests || [];
      case 'upcoming':
        return []; // Fetch upcoming requests
      default:
        return [];
    }
  };

  const renderHamburgerMenu = () => {
    const menuItems = [
      {
        label: 'Home',
        icon: 'home' as const,
        color: Colors.primary,
        onPress: () => { setShowHamburgerMenu(false); router.replace('/'); },
      },
      {
        label: 'Requests',
        icon: 'clipboard-outline' as const,
        color: Colors.primary,
        onPress: () => { setShowHamburgerMenu(false); router.push('/(provider)/requests'); },
      },
      {
        label: 'Schedule',
        icon: 'calendar-outline' as const,
        color: Colors.success,
        onPress: () => { setShowHamburgerMenu(false); router.push('/(provider)/schedule'); },
      },
      {
        label: 'Messages',
        icon: 'chatbubble-ellipses-outline' as const,
        color: Colors.info,
        onPress: () => { setShowHamburgerMenu(false); setShowRecentMessages(true); },
      },
      {
        label: 'Earnings & Withdraw',
        icon: 'wallet-outline' as const,
        color: Colors.warning,
        onPress: () => { setShowHamburgerMenu(false); router.push('/(provider)/earnings'); },
      },
      {
        label: 'Reviews',
        icon: 'star-outline' as const,
        color: Colors.warning || '#FF9500',
        onPress: () => { setShowHamburgerMenu(false); router.push('/(provider)/reviews'); },
      },
    ];

    return (
      <Modal visible={showHamburgerMenu} transparent animationType="fade" onRequestClose={() => setShowHamburgerMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowHamburgerMenu(false)}>
          <View style={styles.menuDropdown}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setShowHamburgerMenu(false)}>
                <Ionicons name="close" size={22} color={(Colors.text as any)?.primary || '#222'} />
              </TouchableOpacity>
            </View>
            {menuItems.map((item, index) => (
              <TouchableOpacity key={item.label} style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]} onPress={item.onPress} activeOpacity={0.7}>
                <View style={[styles.menuItemIcon, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={(Colors.text as any)?.secondary || '#888'} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderHeader()}
        {renderRecentChats()}
        {renderTabs()}

        <View style={styles.requestsSection}>
          <FlatList
            data={getCurrentRequests()}
            renderItem={renderRequestCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <EmptyState
                icon="calendar-outline"
                title="No requests"
                message={`You have no ${selectedTab} requests`}
              />
            }
            contentContainerStyle={styles.requestsList}
          />
        </View>



        <View style={styles.bottomPadding} />
      </ScrollView>

      <RecentMessagesModal
        visible={showRecentMessages}
        onClose={() => setShowRecentMessages(false)}
        conversations={conversations || []}
        onSelectConversation={(conversationId) => {
          router.push(`/(provider)/chat/${conversationId}`);
        }}
        onSeeAll={() => {
          setShowRecentMessages(false);
          router.push('/(provider)/chat');
        }}
      />
      {renderHamburgerMenu()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuDropdown: {
    marginTop: 140,
    marginLeft: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 8,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 4,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeSection: {
    marginRight: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.surface + 'CC',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    position: 'relative',
    marginRight: 16,
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 2,
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  availabilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface + '20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  availabilityText: {
    color: Colors.surface,
    fontSize: 14,
  },
  availabilityToggle: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  availabilityToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface + '20',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: Colors.surface + 'CC',
    fontSize: 12,
  },
  ratingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface + '20',
    borderRadius: 12,
    padding: 16,
  },
  ratingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    color: Colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 12,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  ratingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewCount: {
    color: Colors.surface,
    fontSize: 14,
    marginRight: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: Colors.surface,
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButton: {
    alignItems: 'center',
    position: 'relative',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadgeText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.surface,
  },
  tabBadge: {
    marginLeft: 6,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  requestsSection: {
    paddingHorizontal: 20,
  },
  requestsList: {
    paddingBottom: 16,
  },
  requestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.text.secondary,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  acceptButton: {
    backgroundColor: Colors.success + '10',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  acceptButtonText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: Colors.error + '10',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  rejectButtonText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  directionsButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  earningsSummary: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  earningsItem: {
    alignItems: 'center',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  withdrawSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  availableBalance: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  withdrawButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  withdrawButtonText: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  chatsSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  chatsScroll: {
    paddingBottom: 4,
  },
  chatCard: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  chatAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  chatAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatUnreadBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  chatName: {
    fontSize: 12,
    color: Colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  statusBanner: {
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
});

