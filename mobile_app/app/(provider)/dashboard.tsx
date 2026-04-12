import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/app/context/ThemeContext';
import { ThemeColors } from '@/app/constants/Colors';
import { useProviderStore } from '@/app/store/providerStore';
import { useProviderQueries } from '@/hooks/useProviderQueries';
import { useProviderNotificationCount } from '@/hooks/useProviderNotifications';
import * as pusherClient from '@/app/services/pusherClient';
import { PriceText } from '@/components/common/PriceText';
import { API_BASE_URL } from '@/app/config/api';
import { useConversations } from '@/hooks/useChat';
import { RecentMessagesModal } from '@/components/provider/RecentMessagesModal';
import type { RequestStatus, ServiceRequest } from '../types/provider.types';
import { formatCurrency, formatTimeAgo, formatDate, formatTime } from "../utils/formatters";
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const { width } = Dimensions.get('window');

export default function ProviderDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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

  const sidebarAnim = React.useRef(new Animated.Value(-260)).current;
  const SIDEBAR_WIDTH = 260;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) sidebarAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) closeMenu();
        else Animated.spring(sidebarAnim, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const openMenu = () => {
    setShowHamburgerMenu(true);
    Animated.timing(sidebarAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    Animated.timing(sidebarAnim, { toValue: -SIDEBAR_WIDTH, duration: 200, useNativeDriver: true }).start(() => setShowHamburgerMenu(false));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), notificationCountQuery.refetch()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (profile?.providerID) {
      pusherClient.subscribeToUserUpdates("provider", profile.providerID, () => refetch());
      return () => {
        pusherClient.unsubscribeFromUserUpdates("provider", profile.providerID);
      };
    }
  }, [profile?.providerID]);

  const renderHeader = () => (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark || colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: Math.max(insets.top + 16, 32) }]}
    >
      <View style={styles.topSection}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.profileName}>
            {profile?.fullname || profile?.businessName || 'Provider'}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
          <Ionicons name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowRecentMessages(true)}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.surface} />
            {conversations?.some((c: any) => (c.unread_count || 0) > 0) && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {conversations.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(provider)/notifications')}>
            <Ionicons name="notifications-outline" size={24} color={colors.surface} />
            {unreadNotificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(provider)/profile')}>
            <Image
              source={{ 
                uri: (() => {
                  const pic = (profile as any)?.profilePicture || 
                               (profile as any)?.profile_picture || 
                               (profile as any)?.profileImage;
                  if (!pic) return 'https://via.placeholder.com/40';
                  return pic.startsWith('http') ? pic : `${API_BASE_URL.replace('/api', '')}/${pic}`;
                })()
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.availabilityCard}>
        <View style={styles.availabilityInfo}>
          <View style={[styles.dot, { backgroundColor: profile?.isAvailable ? colors.success : colors.error }]} />
          <Text style={styles.availabilityLabel}>{profile?.isAvailable ? 'Available for work' : 'Not available'}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.toggleBtn, { backgroundColor: profile?.isAvailable ? colors.success + '20' : colors.error + '20' }]} 
          onPress={toggleAvailability}
        >
          <Text style={[styles.toggleText, { color: profile?.isAvailable ? colors.success : colors.error }]}>
            {profile?.isAvailable ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statBox} onPress={() => router.push('/(provider)/earnings')}>
          <PriceText style={styles.statAmount} amount={earnings?.today || 0} />
          <Text style={styles.statPeriod}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statBox} onPress={() => router.push('/(provider)/earnings')}>
          <PriceText style={styles.statAmount} amount={earnings?.week || 0} />
          <Text style={styles.statPeriod}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statBox} onPress={() => router.push('/(provider)/earnings')}>
          <PriceText style={styles.statAmount} amount={earnings?.month || 0} />
          <Text style={styles.statPeriod}>Month</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderTabs = () => (
    <View style={styles.tabsRow}>
      {['today', 'pending', 'upcoming'].map((tab) => (
        <TouchableOpacity 
          key={tab} 
          style={[styles.tabBtn, selectedTab === tab && styles.tabBtnActive]} 
          onPress={() => setSelectedTab(tab as any)}
        >
          <Text style={[styles.tabBtnText, selectedTab === tab && styles.tabBtnTextActive]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
          {tab === 'pending' && (pendingRequests?.length || 0) > 0 && (
            <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{pendingRequests.length}</Text></View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderListContent = () => {
    if (isLoading) return <LoadingSpinner />;
    
    const data = selectedTab === 'pending' ? pendingRequests : todaySchedule;
    
    if (!data || data.length === 0) {
      return (
        <EmptyState 
          icon="calendar-outline"
          title={`No ${selectedTab === 'pending' ? 'Pending' : "Today's"} Requests`}
          message={`You don't have any ${selectedTab} requests at the moment.`} 
        />
      );
    }

    return (
      <View style={styles.listContainer}>
        {data.map((req: ServiceRequest) => (
          <View key={req.id} style={styles.requestCard}>
            <View style={styles.cardHeader}>
              <View style={styles.customerInfo}>
                <Image 
                  source={{ 
                    uri: req.customerImage || 'https://via.placeholder.com/40' 
                  }} 
                  style={styles.customerImage} 
                />
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{req.customerName || 'Customer'}</Text>
                  <Text style={styles.requestNumber}>#{req.requestNumber || req.id.slice(-6)}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (colors as any)[req.status] ? (colors as any)[req.status] + '15' : colors.primary + '15' }]}>
                <Text style={[styles.statusText, { color: (colors as any)[req.status] || colors.primary }]}>{req.status.replace('_', ' ')}</Text>
              </View>
            </View>
            
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailName}>{req.serviceName}</Text>
                <PriceText style={styles.priceValue} amount={req.estimatedPrice || req.finalPrice || 0} />
              </View>
              <Text style={styles.detailText}>
                {req.scheduledDate ? formatDate(req.scheduledDate) : ''} • {req.scheduledTime ? formatTime(req.scheduledTime) : ''}
              </Text>
            </View>

            {selectedTab === 'pending' && (
              <View style={styles.cardActions}>
                <View style={styles.pendingActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn]} 
                    onPress={() => router.push(`/(provider)/requests/${req.id}`)}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.acceptBtn]} 
                    onPress={() => acceptRequest.mutateAsync(req.id)}
                  >
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {selectedTab !== 'pending' && (
              <TouchableOpacity 
                style={styles.viewDetailsBtn}
                onPress={() => router.push(`/(provider)/requests/${req.id}`)}
              >
                <Text style={styles.viewDetailsText}>View Details</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {renderHeader()}
        {renderTabs()}
        <View style={styles.mainContent}>
          {renderListContent()}
        </View>
      </ScrollView>

      {showHamburgerMenu && (
        <Modal transparent visible={showHamburgerMenu} animationType="none">
          <View style={styles.drawerOverlay}>
            <Animated.View {...panResponder.panHandlers} style={[styles.drawer, { transform: [{ translateX: sidebarAnim }] }]}>
              <View
                style={[
                  styles.drawerHeader,
                  { paddingTop: Math.max(insets.top + 24, 40) },
                ]}
              >
                <Image
                  source={{ 
                    uri: (() => {
                      const pic = (profile as any)?.profilePicture || 
                                   (profile as any)?.profile_picture || 
                                   (profile as any)?.profileImage;
                      if (!pic) return 'https://via.placeholder.com/80';
                      return pic.startsWith('http') ? pic : `${API_BASE_URL.replace('/api', '')}/${pic}`;
                    })()
                  }}
                  style={styles.drawerAvatar}
                />
                <Text style={styles.drawerName}>{profile?.fullname || 'Provider'}</Text>
                <Text style={styles.drawerEmail}>{profile?.email}</Text>
              </View>

              <ScrollView style={styles.drawerContent}>
                <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); router.push('/'); }}>
                  <Ionicons name="home-outline" size={22} color={colors.text.primary} />
                  <Text style={styles.drawerItemText}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); router.push('/(provider)/dashboard'); }}>
                  <Ionicons name="grid-outline" size={22} color={colors.primary} />
                  <Text style={styles.drawerItemText}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); router.push('/(provider)/profile'); }}>
                  <Ionicons name="person-outline" size={22} color={colors.text.primary} />
                  <Text style={styles.drawerItemText}>My Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); router.push('/(provider)/earnings'); }}>
                  <Ionicons name="wallet-outline" size={22} color={colors.text.primary} />
                  <Text style={styles.drawerItemText}>Earnings</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); router.push('/(provider)/requests'); }}>
                  <Ionicons name="list-outline" size={22} color={colors.text.primary} />
                  <Text style={styles.drawerItemText}>Service Requests</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); router.push('/(provider)/schedule'); }}>
                  <Ionicons name="calendar-outline" size={22} color={colors.text.primary} />
                  <Text style={styles.drawerItemText}>My Schedule</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); router.push('/(provider)/reviews'); }}>
                  <Ionicons name="star-outline" size={22} color={colors.text.primary} />
                  <Text style={styles.drawerItemText}>Reviews & Ratings</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.drawerItem} onPress={() => { closeMenu(); router.push('/(provider)/disputes'); }}>
                  <Ionicons name="alert-circle-outline" size={22} color={colors.text.primary} />
                  <Text style={styles.drawerItemText}>Disputes</Text>
                </TouchableOpacity>

                <View style={styles.drawerDivider} />

                <TouchableOpacity style={styles.drawerItem} onPress={async () => { 
                  closeMenu(); 
                  const { api } = await import('@/app/services/api');
                  await api.clearAll();
                  useProviderStore.getState().reset(); 
                  router.replace('/login'); 
                }}>
                  <Ionicons name="log-out-outline" size={22} color={colors.error} />
                  <Text style={[styles.drawerItemText, { color: colors.error }]}>Logout</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
            <TouchableOpacity style={styles.drawerClose} onPress={closeMenu} />
          </View>
        </Modal>
      )}
      {showRecentMessages && (
        <RecentMessagesModal
          visible={showRecentMessages}
          onClose={() => setShowRecentMessages(false)}
          conversations={conversations || []}
          onSelectConversation={(id) => router.push(`/(provider)/chat/${id}`)}
          onSeeAll={() => { setShowRecentMessages(false); router.push('/(provider)/messages'); }}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  topSection: { alignItems: 'center', marginBottom: 20 },
  welcomeSection: { alignItems: 'center' },
  welcomeText: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: colors.surface },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  menuButton: { backgroundColor: colors.surface, borderRadius: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: colors.error, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  profileButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatar: { width: '100%', height: '100%' },
  availabilityCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 16 },
  availabilityInfo: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  availabilityLabel: { color: colors.surface, fontSize: 14, fontWeight: '500' },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  toggleText: { fontSize: 12, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
  statBox: { flex: 1, backgroundColor: colors.surface, padding: 12, borderRadius: 16, alignItems: 'center', elevation: 2 },
  statAmount: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  statPeriod: { fontSize: 11, color: colors.text.secondary, marginTop: 2 },
  tabsRow: { flexDirection: 'row', padding: 20, gap: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  tabBtnTextActive: { color: colors.surface },
  tabBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: colors.error, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  tabBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  mainContent: { paddingHorizontal: 20, paddingBottom: 100 },
  listContainer: { gap: 12, marginTop: 10 },
  requestCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  customerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customerImage: { width: 40, height: 40, borderRadius: 20 },
  customerDetails: { gap: 2 },
  customerName: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary },
  requestNumber: { fontSize: 11, color: colors.text.secondary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  detailsContainer: { gap: 8, marginBottom: 15 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text.primary },
  priceValue: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
  detailText: { fontSize: 13, color: colors.text.secondary },
  cardActions: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15 },
  pendingActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { backgroundColor: colors.primary },
  acceptBtnText: { color: colors.surface, fontSize: 14, fontWeight: 'bold' },
  rejectBtn: { backgroundColor: colors.error + '15', borderWidth: 1, borderColor: colors.error + '30' },
  rejectBtnText: { color: colors.error, fontSize: 14, fontWeight: 'bold' },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  viewDetailsText: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  drawer: { width: 260, backgroundColor: colors.surface, height: '100%', elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 10 },
  drawerClose: { flex: 1 },
  drawerHeader: { padding: 30, backgroundColor: colors.primary, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 20 },
  drawerAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.surface, marginBottom: 15 },
  drawerName: { fontSize: 18, fontWeight: 'bold', color: colors.surface, marginBottom: 4 },
  drawerEmail: { fontSize: 13, color: colors.surface + 'CC' },
  drawerContent: { flex: 1, paddingHorizontal: 15 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 5 },
  drawerItemText: { fontSize: 16, fontWeight: '500', color: colors.text.primary, marginLeft: 15 },
  drawerDivider: { height: 1, backgroundColor: colors.border, marginVertical: 15, marginHorizontal: 15 },
});
