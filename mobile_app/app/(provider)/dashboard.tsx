import React, { useState, useEffect, useMemo } from 'react';
import {
  Platform,
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
import type { RequestStatus } from '../types/provider.types';

const { width } = Dimensions.get('window');

export default function ProviderDashboard() {
  const router = useRouter();
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
      style={styles.header}
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

  return (
    <View style={styles.mainContainer}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {renderHeader()}
        {renderTabs()}
        <View style={styles.mainContent}>
          {/* List content would go here */}
        </View>
      </ScrollView>

      {showHamburgerMenu && (
        <Modal transparent visible={showHamburgerMenu} animationType="none">
          <View style={styles.drawerOverlay}>
            <Animated.View {...panResponder.panHandlers} style={[styles.drawer, { transform: [{ translateX: sidebarAnim }] }]}>
              <View style={styles.drawerHeader}>
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
  header: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
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
  mainContent: { paddingHorizontal: 20 },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  drawer: { width: 260, backgroundColor: colors.surface, height: '100%', elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 10 },
  drawerClose: { flex: 1 },
  drawerHeader: { padding: 30, paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: colors.primary, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 20 },
  drawerAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 15 },
  drawerName: { fontSize: 20, fontWeight: 'bold', color: colors.surface },
  drawerEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  drawerContent: { flex: 1, paddingHorizontal: 15 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 5 },
  drawerItemText: { fontSize: 16, fontWeight: '500', color: colors.text.primary, marginLeft: 15 },
  drawerDivider: { height: 1, backgroundColor: colors.border, marginVertical: 15, marginHorizontal: 15 },
});
