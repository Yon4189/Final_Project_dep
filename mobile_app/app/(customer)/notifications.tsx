// app/(customer)/notifications.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  relatedBookingId?: string;
}

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  booking_request:   'send-outline',
  booking_accepted:  'checkmark-circle-outline',
  booking_rejected:  'close-circle-outline',
  booking_cancelled: 'close-circle-outline',
  booking_completed: 'checkmark-done-outline',
  payment_received:  'cash-outline',
  payment_failed:    'alert-circle-outline',
  review:            'star-outline',
  reminder:          'time-outline',
  system:            'information-circle-outline',
  new_request:       'send-outline',
};

const NOTIFICATION_COLORS: Record<string, string> = {
  booking_accepted:  Colors.success,
  booking_rejected:  Colors.error,
  booking_cancelled: Colors.error,
  booking_completed: Colors.success,
  payment_received:  Colors.success,
  payment_failed:    Colors.error,
  booking_request:   Colors.primary,
  reminder:          Colors.warning,
  system:            Colors.info,
};

const normalizeNotification = (n: any): CustomerNotification => ({
  id: n.notificationID?.toString() ?? String(n.id ?? Math.random()),
  type: n.type ?? n.notification_type ?? 'system',
  title: n.title,
  message: n.message,
  timestamp: n.created_at,
  read: Boolean(n.is_seen ?? n.read),
  data: n.data ?? {},
  relatedBookingId: n.related_booking_id?.toString(),
});

export default function CustomerNotifications() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get<any>('/customer/notifications');
      if (response.success) {
        const raw = response.data?.notifications?.data
          || response.data?.data
          || response.data
          || [];
        const arr = Array.isArray(raw) ? raw : [];
        setNotifications(arr.map(normalizeNotification));
        setUnreadCount(response.data?.unread_count ?? 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      console.log('📖 Marking notification as read:', notificationId);
      await api.patch<any>(`/customer/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('📖 Marking all notifications as read');
      await api.patch<any>('/customer/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
    }
  };

  const handleNotificationPress = (notification: CustomerNotification) => {
    if (!notification.read) markAsRead(notification.id);

    const bookingId = notification.relatedBookingId
      || notification.data?.booking_id
      || notification.data?.bookingId;

    switch (notification.type) {
      case 'booking_accepted':
      case 'booking_confirmed':
        // Navigate to request details, where Pay Now button will be visible
        if (bookingId) {
          router.push(`/(customer)/requests/${bookingId}`);
        }
        break;
      case 'booking_rejected':
        if (bookingId) {
          router.push(`/(customer)/requests/${bookingId}`);
        }
        break;
      case 'booking_completed':
        if (bookingId) {
          router.push(`/(customer)/requests/${bookingId}`);
        }
        break;
      case 'payment_received':
        if (bookingId) {
          router.push(`/(customer)/requests/${bookingId}`);
        }
        break;
      default:
        if (bookingId) {
          router.push(`/(customer)/requests/${bookingId}`);
        }
    }
  };

  const handlePayNow = (notification: CustomerNotification) => {
    const bookingId = notification.relatedBookingId
      || notification.data?.booking_id
      || notification.data?.bookingId;
    const amount = notification.data?.amount;
    if (bookingId) {
      router.push({
        pathname: '/(customer)/payment',
        params: {
          bookingId,
          amount: amount?.toString(),
          serviceName: notification.data?.service_name,
        },
      });
    }
  };

  const renderNotification = ({ item }: { item: CustomerNotification }) => {
    const isAccepted = item.type === 'booking_accepted' || item.type === 'booking_confirmed';
    const iconName = NOTIFICATION_ICONS[item.type] ?? 'notifications-outline';
    const iconColor = NOTIFICATION_COLORS[item.type] ?? Colors.primary;
    const bookingId = item.relatedBookingId
      || item.data?.booking_id
      || item.data?.bookingId;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.75}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.read && styles.unreadTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.time}>{formatTimeAgo(item.timestamp)}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          {item.type === 'booking_rejected' && item.data?.reason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{item.data.reason}</Text>
            </View>
          )}

          {/* Action Buttons */}
          {isAccepted && bookingId && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.payNowButton}
                onPress={() => handlePayNow(item)}
              >
                <Ionicons name="card-outline" size={14} color={Colors.surface} />
                <Text style={styles.payNowText}> Pay Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewRequestButton}
                onPress={() => router.push(`/(customer)/requests/${bookingId}`)}
              >
                <Text style={styles.viewRequestText}>View Request</Text>
              </TouchableOpacity>
            </View>
          )}

          {(item.type === 'booking_rejected' || item.type === 'booking_cancelled') && bookingId && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.viewRequestButton}
                onPress={() => router.push(`/(customer)/requests/${bookingId}`)}
              >
                <Text style={styles.viewRequestText}>View Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Unread dot */}
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 80 }} />}
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
            Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
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

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="mail-unread-outline" size={16} color={Colors.primary} />
          <Text style={styles.unreadBannerText}> {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</Text>
        </View>
      )}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="No notifications"
            message="You'll be notified when providers respond to your requests"
          />
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : undefined}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  activeFilterTab: {
    backgroundColor: Colors.primary + '15',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  activeFilterText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  unreadBannerText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  unreadItem: {
    backgroundColor: Colors.primary + '06',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
    color: Colors.text.secondary,
    flexShrink: 0,
  },
  message: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  payNowText: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: '600',
  },
  viewRequestButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  viewRequestText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    position: 'absolute',
    top: 14,
    right: 14,
  },
  reasonContainer: {
    backgroundColor: Colors.error + '10',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  reasonText: {
    fontSize: 12,
    color: Colors.text.primary,
    fontStyle: 'italic',
  },
});
