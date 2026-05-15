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
  payment_reminder_24h: 'time-outline',
  payment_reminder_48h: 'alarm-outline',
  payment_overdue:   'warning-outline',
  account_frozen:    'lock-closed-outline',
  review:            'star-outline',
  reminder:          'time-outline',
  system:            'information-circle-outline',
  new_request:       'send-outline',
  payment_success:   'cash-outline',
  provider_arriving: 'car-outline',
  new_message:       'chatbubble-outline',
  provider_started:  'play-outline',
  provider_arrived:  'pin-outline',
};

const NOTIFICATION_COLORS: Record<string, string> = {
  booking_accepted:  Colors.success,
  booking_rejected:  Colors.error,
  booking_cancelled: Colors.error,
  booking_completed: Colors.success,
  payment_received:  Colors.success,
  payment_failed:    Colors.error,
  payment_reminder_24h: Colors.warning,
  payment_reminder_48h: Colors.error,
  payment_overdue:   Colors.error,
  account_frozen:    Colors.error,
  booking_request:   Colors.primary,
  reminder:          Colors.warning,
  system:            Colors.info,
  provider_arriving: Colors.info,
  new_message:       Colors.primary,
  provider_started:  Colors.success,
  provider_arrived:  Colors.success,
};

const parseJsonSafely = (data: any) => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data || {};
};

const normalizeNotification = (n: any): CustomerNotification => ({
  id: n.notificationID?.toString() ?? String(n.id ?? Math.random()),
  type: n.type ?? n.notification_type ?? 'system',
  title: n.title,
  message: n.message,
  timestamp: n.created_at,
  read: Boolean(n.is_seen ?? n.read),
  data: parseJsonSafely(n.data),
  relatedBookingId: n.related_booking_id?.toString(),
});

export default function CustomerNotifications() {
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const insets = useSafeAreaInsets();

  const fetchNotifications = useCallback(async (options: { showSpinner?: boolean } = { showSpinner: true }) => {
    try {
      if (options.showSpinner) {
        setLoading(true);
      }
      
      console.log('📡 Fetching customer notifications...');
      const response = await customerService.getNotifications();
      console.log('✅ Notifications response:', {
        success: response.success,
        hasData: !!response.data,
        notificationsCount: (response.data as any)?.notifications?.total || (response.data as any)?.notifications?.data?.length || 0,
        unreadCount: response.data?.unread_count
      });

      if (response.success && response.data) {
        const payload = response.data.notifications;
        let raw: any[] = [];
        
        if (Array.isArray(payload)) {
          raw = payload;
        } else if (payload && Array.isArray(payload.data)) {
          raw = payload.data;
        } else if (Array.isArray(response.data)) {
          raw = response.data;
        }
        
        console.log(`📦 Received ${raw.length} raw notifications`);
        if (raw.length > 0) {
          console.log('🔍 Sample notification structure:', JSON.stringify(raw[0], null, 2));
        }
        
        const normalized = raw.map(n => {
          try {
            return normalizeNotification(n);
          } catch (e) {
            console.error('❌ Normalization failed for:', n, e);
            return null;
          }
        }).filter(n => n !== null) as CustomerNotification[];
        
        console.log(`✅ Successfully normalized ${normalized.length} notifications`);
        setNotifications(normalized);
        setUnreadCount(response.data.unread_count ?? 0);
        
        // Use a timeout to log the state after it has hopefully updated
        setTimeout(() => {
          console.log('📊 Current notifications in state:', normalized.length);
        }, 100);
      } else {
        console.warn('⚠️ Response unsuccessful or missing data:', response);
      }
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications({ showSpinner: true });
    
    // Background polling every 30s without showing the full screen spinner
    const interval = setInterval(() => {
      fetchNotifications({ showSpinner: false });
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications({ showSpinner: false });
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
      case 'payment_reminder_24h':
      case 'payment_reminder_48h':
      case 'payment_overdue':
        if (bookingId) {
          router.push({ pathname: '/(customer)/payment', params: { bookingId } });
        }
        break;
      case 'account_frozen':
        router.push('/(customer)/bookings');
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
    const isPaymentReminder = item.type === 'payment_reminder_24h' || item.type === 'payment_reminder_48h' || item.type === 'payment_overdue';
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
              <Text style={styles.reasonLabel}>{t('notifications.reason', 'Reason:')}</Text>
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
                <Text style={styles.payNowText}> {t('notifications.payNow', 'Pay Now')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewRequestButton}
                onPress={() => router.push(`/(customer)/requests/${bookingId}`)}
              >
                <Text style={styles.viewRequestText}>{t('notifications.viewRequest', 'View Request')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {(item.type === 'booking_rejected' || item.type === 'booking_cancelled') && bookingId && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.viewRequestButton}
                onPress={() => router.push(`/(customer)/requests/${bookingId}`)}
              >
                <Text style={styles.viewRequestText}>{t('notifications.viewDetails', 'View Details')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Payment reminder action */}
          {isPaymentReminder && bookingId && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.payNowButton, { backgroundColor: item.type === 'payment_overdue' ? Colors.error : Colors.warning }]}
                onPress={() => handlePayNow(item)}
              >
                <Ionicons name="card-outline" size={14} color={Colors.surface} />
                <Text style={styles.payNowText}> {item.type === 'payment_overdue' ? 'Pay Now (Overdue)' : 'Pay Now'}</Text>
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
    <View style={[styles.headerContainer, { paddingTop: insets.top + (insets.top > 0 ? 0 : 40) }]}>
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 10 : 0 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title', 'Notifications')}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>{t('notifications.markAllRead', 'Mark all read')}</Text>
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
            {t('notifications.filterAll', 'All')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
            {t('notifications.filterUnread', 'Unread')} {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'read' && styles.activeFilterTab]}
          onPress={() => setFilter('read')}
        >
          <Text style={[styles.filterText, filter === 'read' && styles.activeFilterText]}>
            {t('notifications.filterRead', 'Read')}
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
    <View style={styles.container}>
      {renderHeader()}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="mail-unread-outline" size={16} color={Colors.primary} />
          <Text style={styles.unreadBannerText}> {unreadCount} {unreadCount !== 1 ? t('notifications.unreadMessages', 'unread notifications') : t('notifications.unreadMessage', 'unread notification')}</Text>
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
            title={t('notifications.noNotifications', 'No notifications')}
            message={t('notifications.noNotificationsSub', "You'll be notified when providers respond to your requests")}
          />
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    paddingBottom: 16,
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
