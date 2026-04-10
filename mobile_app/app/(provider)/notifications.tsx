// app/(provider)/notifications.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatTimeAgo, formatCurrency } from '../utils/formatters';
import { providerService } from '@/app/services/provider.service';
import { api } from '@/app/services/api';
import type { ProviderNotificationPayload, ProviderNotificationType } from '@/app/types/provider.types';

// Types for provider notifications
interface ProviderNotification {
  id: string;
  type: ProviderNotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: {
    requestId?: string;
    customerId?: string;
    customerName?: string;
    amount?: number;
    transactionId?: string;
  };
  image?: string;
  relatedBookingId?: string;
}

type ProviderNotificationRaw = ProviderNotificationPayload & { related_booking_id?: string };

const normalizeNotification = (notification: ProviderNotificationRaw): ProviderNotification => ({
  id: notification.notificationID?.toString() ?? `${notification.type}-${notification.created_at}`,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  timestamp: notification.created_at,
  read: Boolean(notification.is_seen),
  data: notification.data,
  image: notification.data?.image,
  relatedBookingId: notification.related_booking_id,
});

export default function ProviderNotifications() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<ProviderNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const insets = useSafeAreaInsets();

  const normalizedNotifications = useCallback(
    (items: ProviderNotificationRaw[]) => items.map(normalizeNotification),
    []
  );

  const fetchNotifications = useCallback(
    async ({ page = 1, showSpinner = true }: { page?: number; showSpinner?: boolean } = {}) => {
      if (showSpinner) {
        setLoading(true);
      }

      try {
        const response = await providerService.getNotifications(page);

        if (response.success && response.data) {
          const payload = response.data.notifications;
          const normalized = Array.isArray(payload?.data)
            ? normalizedNotifications(payload.data)
            : [];

          setNotifications(prev =>
            page === 1 ? normalized : [...prev, ...normalized]
          );
          setPage(payload?.current_page ?? page);
          setHasMore((payload?.last_page ?? page) > (payload?.current_page ?? page));

          // Automatically mark all as read if there are unreads
          if (response.data.unread_count > 0 && page === 1) {
            markAllAsRead();
          }
        }
      } catch (error) {
        console.error('Failed to load provider notifications', error);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [normalizedNotifications]
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

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );

    try {
      await providerService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    try {
      await api.post('/provider/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationPress = (notification: ProviderNotification) => {
    // Mark as read immediately to update UI
    void markAsRead(notification.id);

    // Prevent navigation transit crash by giving state time to settle
    setTimeout(() => {
      // Navigate based on notification type
      switch (notification.type) {
        case 'new_request':
        case 'booking_request':
        case 'request_accepted':
        case 'booking_accepted':
        case 'request_cancelled':
        case 'booking_cancelled':
        case 'booking_completed':
        case 'reminder':
          if (notification.relatedBookingId) {
            router.push(`/(provider)/requests/${notification.relatedBookingId}`);
          } else if (notification.data?.requestId) {
            router.push(`/(provider)/requests/${notification.data.requestId}`);
          } else {
            router.push('/(provider)/requests');
          }
          break;
        case 'payment_received':
        case 'payment_released':
        case 'withdrawal':
          router.push('/(provider)/earnings');
          break;
        case 'review':
          router.push('/(provider)/reviews');
          break;
        case 'system':
        case 'provider_approved':
        case 'provider_rejected':
          router.push('/(provider)/profile');
          break;
        default:
          // Stay on current page
          break;
      }
    }, 100);
  };

  const getNotificationIcon = (type: string, read: boolean) => {
    const iconColor = read ? Colors.text.secondary : Colors.primary;
    const iconSize = 24;
    
    switch (type) {
      case 'new_request':
      case 'booking_request':
        return <Ionicons name="alert-circle" size={iconSize} color={iconColor} />;
      case 'request_accepted':
      case 'booking_accepted':
        return <Ionicons name="checkmark-circle" size={iconSize} color={iconColor} />;
      case 'request_cancelled':
      case 'booking_cancelled':
        return <Ionicons name="close-circle" size={iconSize} color={Colors.error} />;
      case 'booking_completed':
        return <Ionicons name="briefcase" size={iconSize} color={iconColor} />;
      case 'payment_received':
      case 'payment_released':
        return <Ionicons name="wallet" size={iconSize} color={iconColor} />;
      case 'withdrawal':
        return <Ionicons name="cash" size={iconSize} color={iconColor} />;
      case 'review':
        return <Ionicons name="star" size={iconSize} color={iconColor} />;
      case 'reminder':
        return <Ionicons name="alarm" size={iconSize} color={iconColor} />;
      case 'system':
        return <Ionicons name="information-circle" size={iconSize} color={iconColor} />;
      case 'provider_approved':
        return <Ionicons name="ribbon" size={iconSize} color={Colors.success} />;
      case 'provider_rejected':
        return <Ionicons name="alert-circle" size={iconSize} color={Colors.error} />;
      default:
        return <Ionicons name="notifications" size={iconSize} color={iconColor} />;
    }
  };

  const renderNotificationItem = ({ item }: { item: ProviderNotification }) => (
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
          <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        
        <View style={styles.notificationFooter}>
          <Text style={styles.notificationTime}>
            {formatTimeAgo(item.timestamp)}
          </Text>
          {item.data?.amount && (
            <Text style={styles.amountText}>
              {formatCurrency(item.data.amount)}
            </Text>
          )}
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
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'read' && styles.activeFilterTab]}
          onPress={() => setFilter('read')}
        >
          <Text style={[styles.filterText, filter === 'read' && styles.activeFilterText]}>
            Read
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No notifications"
            message={filter === 'unread' 
              ? "You don't have any unread notifications" 
              : "You don't have any notifications yet"}
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  markAllButton: {
    padding: 4,
  },
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
    padding: 20,
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
  },
  unreadIconContainer: {
    backgroundColor: Colors.primary + '20',
  },
  notificationImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  contentContainer: {
    flex: 1,
  },
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
    fontWeight: '600',
    color: Colors.text.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
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
  amountText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  bottomPadding: {
    height: 40,
  },
});
