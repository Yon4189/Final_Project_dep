// app/(customer)/notifications.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatTimeAgo } from '../utils/formatters';
import { customerService } from '@/app/services/customer.service';
import { api } from '@/app/services/api';

interface CustomerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, any>;
  image?: string;
  relatedBookingId?: string;
}

const normalizeNotification = (n: any): CustomerNotification => ({
  id: n.notificationID?.toString() ?? String(n.id ?? Math.random()),
  type: n.type ?? n.notification_type ?? 'system',
  title: n.title ?? '',
  message: n.message ?? '',
  timestamp: n.created_at ?? '',
  read: Boolean(n.is_seen ?? n.read),
  data: typeof n.data === 'string' ? (() => { try { return JSON.parse(n.data); } catch { return {}; } })() : (n.data || {}),
  image: n.data?.image,
  relatedBookingId: n.related_booking_id?.toString(),
});

export default function CustomerNotifications() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(
    async ({ page = 1, showSpinner = true }: { page?: number; showSpinner?: boolean } = {}) => {
      if (showSpinner) setLoading(true);

      try {
        const response = await customerService.getNotifications(page);

        if (response.success && response.data) {
          const payload = response.data.notifications;

          let raw: any[] = [];
          if (payload && Array.isArray(payload.data)) {
            raw = payload.data;
          } else if (Array.isArray(payload)) {
            raw = payload;
          } else if (Array.isArray(response.data)) {
            raw = response.data as any[];
          }

          const normalized = raw.map(n => {
            try { return normalizeNotification(n); } catch { return null; }
          }).filter(Boolean) as CustomerNotification[];

          setNotifications(prev => page === 1 ? normalized : [...prev, ...normalized]);
          if (payload?.current_page) setPage(payload.current_page);
          setHasMore((payload?.last_page ?? 1) > (payload?.current_page ?? 1));
          setUnreadCount(response.data.unread_count ?? 0);
        }
      } catch (error) {
        console.error('Failed to load customer notifications:', error);
      } finally {
        if (showSpinner) setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchNotifications({ page: 1 });
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications({ page: 1, showSpinner: false });
  };

  const handleLoadMore = () => {
    if (loading || refreshing || !hasMore) return;
    fetchNotifications({ page: page + 1, showSpinner: false });
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.patch<any>(`/customer/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.patch<any>('/customer/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationPress = (notification: CustomerNotification) => {
    void markAsRead(notification.id);

    const bookingId = notification.relatedBookingId
      || notification.data?.booking_id
      || notification.data?.bookingId;

    setTimeout(() => {
      switch (notification.type) {
        case 'booking_accepted':
        case 'booking_confirmed':
        case 'booking_rejected':
        case 'booking_cancelled':
        case 'booking_completed':
        case 'payment_received':
        case 'payment_reminder_24h':
        case 'payment_reminder_48h':
        case 'payment_overdue':
          if (bookingId) {
            router.push(`/(customer)/requests/${bookingId}`);
          } else {
            router.push('/(customer)/bookings');
          }
          break;
        case 'new_message':
          router.push('/(customer)/chat/index');
          break;
        case 'dispute':
          if (notification.data?.disputeID) {
            router.push(`/(customer)/complaints/${notification.data.disputeID}`);
          } else {
            router.push('/(customer)/complaints');
          }
          break;
        default:
          if (bookingId) {
            router.push(`/(customer)/requests/${bookingId}`);
          }
          break;
      }
    }, 100);
  };

  const getNotificationIcon = (type: string, read: boolean) => {
    const color = read ? Colors.text.secondary : Colors.primary;
    const size = 24;

    switch (type) {
      case 'booking_accepted':
      case 'booking_confirmed':
        return <Ionicons name="checkmark-circle" size={size} color={Colors.success} />;
      case 'booking_rejected':
      case 'booking_cancelled':
        return <Ionicons name="close-circle" size={size} color={Colors.error} />;
      case 'booking_completed':
        return <Ionicons name="briefcase" size={size} color={color} />;
      case 'payment_received':
        return <Ionicons name="wallet" size={size} color={Colors.success} />;
      case 'payment_reminder_24h':
      case 'payment_reminder_48h':
        return <Ionicons name="time" size={size} color="#f59e0b" />;
      case 'payment_overdue':
        return <Ionicons name="warning" size={size} color={Colors.error} />;
      case 'new_message':
        return <Ionicons name="chatbubble" size={size} color={color} />;
      case 'dispute':
        return <Ionicons name="warning" size={size} color={Colors.warning} />;
      case 'reminder':
        return <Ionicons name="alarm" size={size} color="#f59e0b" />;
      case 'system':
        return <Ionicons name="information-circle" size={size} color={color} />;
      default:
        return <Ionicons name="notifications" size={size} color={color} />;
    }
  };

  const renderNotificationItem = ({ item }: { item: CustomerNotification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, !item.read && styles.unreadIconContainer]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.notificationImage} />
        ) : (
          getNotificationIcon(item.type, item.read)
        )}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadText]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>

        <View style={styles.notificationFooter}>
          <Text style={styles.notificationTime}>{formatTimeAgo(item.timestamp)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + (insets.top > 0 ? 0 : 40) }]}>
      <View style={[styles.headerTop, { paddingTop: insets.top > 0 ? 10 : 0 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title', 'Notifications')}</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>{t('notifications.markAllRead', 'Mark all read')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'unread', 'read'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.activeFilterTab]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
              {f === 'all'
                ? t('notifications.filterAll', 'All')
                : f === 'unread'
                ? `${t('notifications.filterUnread', 'Unread')} (${unreadCount})`
                : t('notifications.filterRead', 'Read')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title={t('notifications.noNotifications', 'No notifications')}
            message={
              filter === 'unread'
                ? t('notifications.noUnread', "You don't have any unread notifications")
                : t('notifications.noNotificationsAny', "You'll be notified when providers respond to your requests")
            }
          />
        }
        ListFooterComponent={<View style={styles.bottomPadding} />}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  markAllButton: { padding: 4 },
  markAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  activeFilterTab: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: Colors.surface,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: Colors.primary + '05',
    borderColor: Colors.primary + '30',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  unreadIconContainer: {
    backgroundColor: Colors.primary + '20',
  },
  notificationImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  contentContainer: { flex: 1 },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
    flexShrink: 0,
  },
  notificationMessage: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  bottomPadding: { height: 40 },
});
