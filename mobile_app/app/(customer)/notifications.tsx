// app/(customer)/notifications.tsx
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { formatTimeAgo } from '@/app/utils/formatters';

// Types for notifications
interface Notification {
  id: string;
  type: 'request_update' | 'provider_response' | 'payment' | 'reminder' | 'promo' | 'review';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: {
    requestId?: string;
    providerId?: string;
    bookingId?: string;
    amount?: number;
  };
  image?: string;
}

// Mock notifications data (replace with API data)
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'request_update',
    title: 'Service Request Accepted',
    message: 'John from ABC Plumbing has accepted your service request for leak repair.',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
    read: false,
    data: { requestId: 'req123', providerId: 'prov1' },
    image: 'https://via.placeholder.com/40',
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment Successful',
    message: 'Your payment of ETB 1,500 for plumbing service has been processed successfully.',
    timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(), // 2 hours ago
    read: false,
    data: { bookingId: 'book456', amount: 1500 },
  },
  {
    id: '3',
    type: 'provider_response',
    title: 'Provider Responded',
    message: 'Sarah from CleanPro has sent you a message about your cleaning appointment.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60000).toISOString(), // 1 day ago
    read: true,
    data: { requestId: 'req789', providerId: 'prov2' },
    image: 'https://via.placeholder.com/40',
  },
  {
    id: '4',
    type: 'reminder',
    title: 'Upcoming Service Reminder',
    message: 'Your electrical installation is scheduled for tomorrow at 2:00 PM.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60000).toISOString(), // 1 day ago
    read: true,
    data: { bookingId: 'book101' },
  },
  {
    id: '5',
    type: 'review',
    title: 'How was your service?',
    message: 'Please rate your experience with Mike\'s Plumbing. Your feedback helps others!',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(), // 2 days ago
    read: true,
    data: { bookingId: 'book202', providerId: 'prov3' },
  },
  {
    id: '6',
    type: 'promo',
    title: 'Special Offer!',
    message: 'Get 20% off on your next cleaning service. Offer valid until end of month.',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString(), // 3 days ago
    read: true,
  },
];

export default function Notifications() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);

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

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case 'request_update':
      case 'provider_response':
        if (notification.data?.requestId) {
          router.push(`/(customer)/requests/${notification.data.requestId}`);
        } else {
          router.push('/(customer)/requests');
        }
        break;
      case 'payment':
        if (notification.data?.bookingId) {
          router.push(`/(customer)/requests/${notification.data.bookingId}`);
        } else {
          router.push('/(customer)/bookings');
        }
        break;
      case 'reminder':
        if (notification.data?.bookingId) {
          router.push(`/(customer)/requests/${notification.data.bookingId}`);
        } else {
          router.push('/(customer)/bookings');
        }
        break;
      case 'review':
        router.push('/(customer)/requests');
        break;
      case 'promo':
        // Stay on notifications page or go to promotions
        break;
      default:
        // Stay on current page
        break;
    }
  };

  const getNotificationIcon = (type: string, read: boolean) => {
    const iconColor = read ? Colors.text.secondary : Colors.primary;
    
    switch (type) {
      case 'request_update':
        return <Ionicons name="refresh-circle" size={24} color={iconColor} />;
      case 'provider_response':
        return <Ionicons name="chatbubble" size={24} color={iconColor} />;
      case 'payment':
        return <Ionicons name="wallet" size={24} color={iconColor} />;
      case 'reminder':
        return <Ionicons name="alarm" size={24} color={iconColor} />;
      case 'review':
        return <Ionicons name="star" size={24} color={iconColor} />;
      case 'promo':
        return <Ionicons name="pricetag" size={24} color={iconColor} />;
      default:
        return <Ionicons name="notifications" size={24} color={iconColor} />;
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
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
        
        <Text style={styles.notificationTime}>
          {formatTimeAgo(item.timestamp)}
        </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    //paddingTop: Platform.OS === 'android' ? 40 : 10,
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
  notificationTime: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  bottomPadding: {
    height: 40,
  },
});