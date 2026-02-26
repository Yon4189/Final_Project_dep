// app/(provider)/notifications.tsx
import React, { useState } from 'react';
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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useProviderQueries } from '../../hooks/useProviderQueries';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatTimeAgo } from '../utils/formatters';

// Types for provider notifications
interface ProviderNotification {
  id: string;
  type: 'new_request' | 'request_accepted' | 'request_cancelled' | 'payment_received' | 'withdrawal' | 'review' | 'reminder' | 'system';
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
}

// Mock notifications data (replace with API data)
const MOCK_NOTIFICATIONS: ProviderNotification[] = [
  {
    id: '1',
    type: 'new_request',
    title: 'New Service Request',
    message: 'John Doe requested a plumbing service at your location.',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutes ago
    read: false,
    data: { requestId: 'req123', customerName: 'John Doe' },
  },
  {
    id: '2',
    type: 'payment_received',
    title: 'Payment Received',
    message: 'You received ETB 1,500 for plumbing service from Jane Smith.',
    timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(), // 2 hours ago
    read: false,
    data: { amount: 1500, customerName: 'Jane Smith', transactionId: 'txn456' },
  },
  {
    id: '3',
    type: 'review',
    title: 'New 5-Star Review',
    message: 'Mike Johnson left you a 5-star review for electrical work.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60000).toISOString(), // 1 day ago
    read: true,
    data: { customerName: 'Mike Johnson', requestId: 'req789' },
  },
  {
    id: '4',
    type: 'withdrawal',
    title: 'Withdrawal Processed',
    message: 'Your withdrawal of ETB 2,000 has been processed successfully.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(), // 2 days ago
    read: true,
    data: { amount: 2000 },
  },
  {
    id: '5',
    type: 'reminder',
    title: 'Upcoming Service Reminder',
    message: 'You have a plumbing service scheduled tomorrow at 10:00 AM.',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString(), // 3 days ago
    read: true,
    data: { requestId: 'req456', customerName: 'Sarah Williams' },
  },
  {
    id: '6',
    type: 'request_cancelled',
    title: 'Request Cancelled',
    message: 'A service request has been cancelled by the customer.',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60000).toISOString(), // 4 days ago
    read: true,
    data: { requestId: 'req101' },
  },
  {
    id: '7',
    type: 'system',
    title: 'Profile Verification',
    message: 'Your profile has been verified successfully. You can now receive more requests.',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString(), // 7 days ago
    read: true,
  },
];

export default function ProviderNotifications() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<ProviderNotification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);

  // Use provider queries to fetch real notifications when API is ready
  // const { notifications: apiNotifications, isLoading, refetch } = useProviderQueries();

  // Filter notifications based on selected filter
  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    Alert.alert('Success', 'All notifications marked as read');
  };

  const handleNotificationPress = (notification: ProviderNotification) => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case 'new_request':
      case 'request_accepted':
      case 'request_cancelled':
      case 'reminder':
        if (notification.data?.requestId) {
          router.push(`/(provider)/requests/${notification.data.requestId}`);
        } else {
          router.push('/(provider)/requests');
        }
        break;
      case 'payment_received':
      case 'withdrawal':
        router.push('/(provider)/earnings');
        break;
      case 'review':
        router.push('/(provider)/reviews');
        break;
      case 'system':
        router.push('/(provider)/profile');
        break;
      default:
        // Stay on current page
        break;
    }
  };

  const getNotificationIcon = (type: string, read: boolean) => {
    const iconColor = read ? Colors.text.secondary : Colors.primary;
    const iconSize = 24;
    
    switch (type) {
      case 'new_request':
        return <Ionicons name="alert-circle" size={iconSize} color={iconColor} />;
      case 'request_accepted':
        return <Ionicons name="checkmark-circle" size={iconSize} color={iconColor} />;
      case 'request_cancelled':
        return <Ionicons name="close-circle" size={iconSize} color={Colors.error} />;
      case 'payment_received':
        return <Ionicons name="wallet" size={iconSize} color={iconColor} />;
      case 'withdrawal':
        return <Ionicons name="cash" size={iconSize} color={iconColor} />;
      case 'review':
        return <Ionicons name="star" size={iconSize} color={iconColor} />;
      case 'reminder':
        return <Ionicons name="alarm" size={iconSize} color={iconColor} />;
      case 'system':
        return <Ionicons name="information-circle" size={iconSize} color={iconColor} />;
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
    <View style={styles.header}>
      <View style={styles.headerTop}>
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
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
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
      />
    </SafeAreaView>
  );
}

// Import formatCurrency if not already imported
import { formatCurrency } from '../utils/formatters';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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