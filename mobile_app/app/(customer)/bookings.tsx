// app/(customer)/bookings.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useMyRequests } from '../../hooks/useCustomerQueries';
import { useCancelRequest } from '../../hooks/useCustomerQueries';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import type { ServiceRequest } from '@/app/types/customer.types';

const { width } = Dimensions.get('window');

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings, isLoading, error, refetch } = useMyRequests();
  const cancelRequest = useCancelRequest();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBookingPress = (booking: ServiceRequest) => {
    router.push(`/(customer)/requests/${booking.id}`);
  };

  const handleCancelBooking = (booking: ServiceRequest) => {
    Alert.alert(
      t('bookings.cancelBooking', 'Cancel Booking'),
      t('bookings.cancelConfirm', 'Are you sure you want to cancel this booking?'),
      [
        { text: t('common.cancel', 'No'), style: 'cancel' },
        {
          text: t('common.accept', 'Yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRequest.mutateAsync({
                id: booking.id,
                reason: 'Cancelled by customer',
              });
              await refetch();
            } catch (e) {
              Alert.alert(t('common.error', 'Error'), t('bookings.cancelError', 'Failed to cancel booking. Please try again.'));
            }
          },
        },
      ]
    );
  };

  const handleRateProvider = (booking: ServiceRequest) => {
    router.push(`/(customer)/requests/${booking.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return Colors.warning;
      case 'confirmed': return Colors.primary;
      case 'completed': return Colors.success;
      case 'cancelled': return Colors.error;
      case 'rejected': return Colors.error;
      case 'disputed': return Colors.warning;
      case 'refunded': return Colors.text.secondary;
      default: return Colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'completed': return 'checkmark-done-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      case 'rejected': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const getFilteredBookings = () => {
    if (!bookings) return [];
    if (selectedStatus === 'all') return bookings;
    return (bookings as ServiceRequest[]).filter(booking => booking.status.toLowerCase() === selectedStatus.toLowerCase());
  };

  const renderStatusTabs = () => (
    <View style={styles.statusTabs}>
      {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.statusTab,
            selectedStatus === status && styles.statusTabActive
          ]}
          onPress={() => setSelectedStatus(status)}
        >
          <Text style={[
            styles.statusTabText,
            selectedStatus === status && styles.statusTabTextActive
          ]}>
            {t(`bookings.status.${status}`, status.charAt(0).toUpperCase() + status.slice(1))}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBookingCard = (booking: ServiceRequest) => (
    <View key={booking.id} style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.providerInfo}>
          <Image
            source={{ uri: booking.providerImage || 'https://via.placeholder.com/40' }}
            style={styles.providerAvatar}
          />
          <View style={styles.providerDetails}>
            <Text style={styles.providerName}>
              {booking.providerName || 'Provider'}
            </Text>
            <Text style={styles.serviceName}>{booking.serviceName || 'Service'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { borderColor: getStatusColor(booking.status) }]}>
          <Ionicons name={getStatusIcon(booking.status)} size={14} color={getStatusColor(booking.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {t(`bookings.status.${booking.status.toLowerCase()}`, booking.status)}
          </Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.detailText}>
            {new Date(booking.scheduledDate).toLocaleDateString()} {t('common.at', 'at')} {booking.scheduledTime}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.detailText} numberOfLines={1}>
            {booking.address}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="pricetag-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.detailText}>
            {t('common.currency', 'ETB')} {booking.estimatedPrice?.toFixed(2) || '0.00'}
          </Text>
        </View>

      </View>

      <View style={styles.bookingActions}>
        {booking.status === 'pending' && (
          <>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleCancelBooking(booking)}>
              <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => handleBookingPress(booking)}
            >
              <Text style={styles.viewButtonText}>{t('bookings.viewDetails', 'View Details')}</Text>
            </TouchableOpacity>
          </>
        )}
        {booking.status === 'confirmed' && (
          <>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleCancelBooking(booking)}>
              <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => handleBookingPress(booking)}
            >
              <Text style={styles.viewButtonText}>{t('bookings.viewDetails', 'View Details')}</Text>
            </TouchableOpacity>
          </>
        )}
        {booking.status === 'completed' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.rateButton]}
              onPress={() => handleRateProvider(booking)}
            >
              <Text style={styles.rateButtonText}>{t('bookings.rateProvider', 'Rate Provider')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => handleBookingPress(booking)}
            >
              <Text style={styles.viewButtonText}>{t('bookings.viewDetails', 'View Details')}</Text>
            </TouchableOpacity>
          </>
        )}
        {booking.status === 'cancelled' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleBookingPress(booking)}
          >
            <Text style={styles.viewButtonText}>{t('bookings.viewDetails', 'View Details')}</Text>
          </TouchableOpacity>
        )}
        {(booking.status as any) === 'rejected' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleBookingPress(booking)}
          >
            <Text style={styles.viewButtonText}>{t('bookings.viewDetails', 'View Details')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (insets.top > 0 ? 10 : 40) }]}>
        <Text style={styles.headerTitle}>{t('bookings.myBookings', 'My Bookings')}</Text>
        <TouchableOpacity onPress={() => router.push('/(customer)/search/results')}>
          <Ionicons name="search-outline" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (insets.top > 0 ? 10 : 40) }]}>
        <Text style={styles.headerTitle}>{t('bookings.myBookings', 'My Bookings')}</Text>
        <TouchableOpacity onPress={() => router.push('/(customer)/search/results')}>
          <Ionicons name="search-outline" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorTitle}>{t('bookings.failedToLoad', 'Failed to Load Bookings')}</Text>
        <Text style={styles.errorText}>{t('bookings.checkConnection', 'Please check your internet connection and try again.')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>{t('bookings.tryAgain', 'Try Again')}</Text>
        </TouchableOpacity>
      </View>
      </View>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
    <View style={[styles.header, { paddingTop: insets.top + (insets.top > 0 ? 10 : 40) }]}>
      <Text style={styles.headerTitle}>{t('bookings.myBookings', 'My Bookings')}</Text>
      <TouchableOpacity onPress={() => router.push('/(customer)/search/results')}>
        <Ionicons name="search-outline" size={24} color={Colors.text.primary} />
      </TouchableOpacity>
    </View>

      {renderStatusTabs()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredBookings.length > 0 ? (
          filteredBookings.map(renderBookingCard)
        ) : (
          <EmptyState
            icon="calendar-outline"
            title={t('bookings.noBookings', 'No Bookings Found')}
            message={t('bookings.noBookingsMessage', { 
                          status: t(`bookings.status.${selectedStatus}`, selectedStatus),
                          defaultValue: `No ${selectedStatus} bookings found. Start by searching for services to book.`
                        })}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  statusTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.background,
  },
  statusTabActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  statusTabText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  statusTabTextActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  bookingCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  bookingDetails: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: Colors.background,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  viewButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  viewButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  rateButton: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  rateButtonText: {
    color: '#78350f',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  retryButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});