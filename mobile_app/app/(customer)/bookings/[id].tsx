// app/(customer)/bookings/[id].tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useBookingDetails, useCancelBooking, useBookingStatus, useTrackProvider } from '@/hooks/useCustomerBookings';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ReviewModal } from '../../../components/customer/ReviewModal';
import { ComplaintModal } from '../../../components/customer/ComplaintModal';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: Colors.warning,
  accepted: Colors.info,
  completed: Colors.success,
  cancelled: Colors.error,
  rejected: Colors.error,
  expired: Colors.text.secondary,
  disputed: Colors.error,
};

const STATUS_ICONS = {
  pending: 'time-outline',
  accepted: 'checkmark-circle-outline',
  completed: 'checkmark-done-outline',
  cancelled: 'close-circle-outline',
  rejected: 'close-circle-outline',
  expired: 'alert-circle-outline',
  disputed: 'alert-circle-outline',
};

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  expired: 'Expired',
  disputed: 'Disputed',
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Request Sent', icon: 'send-outline' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-done-outline' },
];

export default function BookingDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedTab, setSelectedTab] = useState<'details' | 'timeline'>('details');

  const { data: bookingData, isLoading } = useBookingDetails(id as string);
  const { data: statusData } = useBookingStatus(id as string);
  const { data: trackingData } = useTrackProvider(id as string);
  const cancelBooking = useCancelBooking();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!bookingData?.success || !bookingData.data) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const booking = bookingData.data;
  const status = booking.status;

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || Colors.text.secondary;
  };

  const getStatusIcon = (status: string) => {
    return STATUS_ICONS[status as keyof typeof STATUS_ICONS] || 'help-outline';
  };

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  };

  const getCurrentStep = () => {
    if (status === 'completed') return 2;
    if (status === 'accepted') return 1;
    if (status === 'pending') return 0;
    return -1; // For cancelled/rejected/expired
  };

  const handleCallProvider = () => {
    if (booking.provider?.phone) {
      Linking.openURL(`tel:${booking.provider.phone}`);
    } else {
      Alert.alert('Info', 'Phone number not available');
    }
  };

  const handleMessageProvider = () => {
    router.push(`/(customer)/chat/${booking.providerID}`);
  };

  const handleTrackProvider = () => {
    if (trackingData?.data?.location) {
      // Open in maps
      const { latitude, longitude } = trackingData.data.location;
      const url = Platform.select({
        ios: `maps://app?daddr=${latitude},${longitude}`,
        android: `google.navigation:q=${latitude},${longitude}`,
      });
      if (url) {
        Linking.openURL(url);
      }
    } else {
      Alert.alert('Info', 'Live tracking not available yet');
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    try {
      const response = await cancelBooking.mutateAsync({
        id: id as string,
        reason: cancelReason
      });

      setShowCancelModal(false);

      if (response.success) {
        Alert.alert(
          'Success',
          response.data?.refund_message || 'Booking cancelled successfully'
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to cancel booking');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to cancel booking');
    }
  };

  const handlePayNow = () => {
    // Implement payment flow
    Alert.alert('Info', 'Payment integration coming soon');
  };

  const handleReportIssue = () => {
    setShowComplaintModal(true);
  };

  const handleReview = () => {
    setShowReviewModal(true);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, 'MMMM d, yyyy'),
      time: format(date, 'h:mm a'),
    };
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: getStatusColor(status) }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
          <Ionicons
            name={getStatusIcon(status) as any}
            size={20}
            color={getStatusColor(status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
            {getStatusLabel(status)}
          </Text>
        </View>
        <Text style={styles.requestNumber}>#{booking.bookingID}</Text>
      </View>

      {booking.expires_at && status === 'pending' && (
        <View style={styles.expiryContainer}>
          <Ionicons name="time-outline" size={16} color={Colors.warning} />
          <Text style={styles.expiryText}>
            Expires {format(new Date(booking.expires_at), 'h:mm a')}
          </Text>
        </View>
      )}
    </View>
  );

  const renderProviderInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Service Provider</Text>
      <View style={styles.providerCard}>
        <Image
          source={{ uri: booking.provider?.profilePicture || 'https://via.placeholder.com/60' }}
          style={styles.providerImage}
        />
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>
            {booking.provider?.businessName || booking.provider?.fullname || 'Provider'}
          </Text>
          {booking.provider?.rating && (
            <View style={styles.providerRating}>
              <Ionicons name="star" size={16} color={Colors.warning} />
              <Text style={styles.ratingText}>{booking.provider.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={styles.providerActions}>
          <TouchableOpacity style={styles.providerAction} onPress={handleCallProvider}>
            <Ionicons name="call" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.providerAction} onPress={handleMessageProvider}>
            <Ionicons name="chatbubble" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderServiceDetails = () => {
    const scheduled = formatDateTime(booking.scheduledDate);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="construct-outline" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue}>{booking.service?.title || 'Service'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {scheduled.date} at {scheduled.time}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {booking.service_address || 'Location pinned on map'}
              </Text>
            </View>
          </View>

          {booking.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Special Instructions</Text>
                <Text style={styles.detailValue}>{booking.notes}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderPaymentDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Details</Text>
      <View style={styles.paymentCard}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Agreed Price</Text>
          <Text style={styles.priceValue}>ETB {booking.agreed_price.toFixed(2)}</Text>
        </View>

        {booking.payment?.status === 'paid' ? (
          <View style={styles.paidContainer}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.paidText}>Payment Completed</Text>
          </View>
        ) : status === 'completed' ? (
          <TouchableOpacity style={styles.payButton} onPress={handlePayNow}>
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pendingPayment}>
            <Ionicons name="time-outline" size={20} color={Colors.warning} />
            <Text style={styles.pendingPaymentText}>
              Payment will be processed after service completion
            </Text>
          </View>
        )}

        {booking.refund_amount ? (
          <View style={styles.refundContainer}>
            <Ionicons name="refresh-outline" size={20} color={Colors.info} />
            <Text style={styles.refundText}>
              Refund of ETB {booking.refund_amount.toFixed(2)} processed
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const renderTimeline = () => {
    const currentStep = getCurrentStep();

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Timeline</Text>
        <View style={styles.timelineCard}>
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index <= currentStep;
            const isCurrent = index === currentStep;

            return (
              <View key={step.key} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineIcon,
                    isCompleted && styles.timelineIconCompleted,
                    isCurrent && styles.timelineIconCurrent,
                  ]}>
                    <Ionicons
                      name={step.icon as any}
                      size={16}
                      color={isCompleted ? Colors.surface : Colors.text.secondary}
                    />
                  </View>
                  {index < STATUS_STEPS.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      isCompleted && styles.timelineLineCompleted,
                    ]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineLabel,
                    isCompleted && styles.timelineLabelCompleted,
                  ]}>
                    {step.label}
                  </Text>
                  {isCurrent && (
                    <Text style={styles.timelineTime}>
                      {status === 'accepted' && booking.accepted_at
                        ? `Accepted at ${format(new Date(booking.accepted_at), 'h:mm a')}`
                        : status === 'completed' && booking.completed_at
                          ? `Completed at ${format(new Date(booking.completed_at), 'h:mm a')}`
                          : 'Current step'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderActions = () => {
    if (['cancelled', 'rejected', 'expired', 'completed'].includes(status)) {
      return null;
    }

    return (
      <View style={styles.actionsContainer}>
        {status === 'accepted' && (
          <TouchableOpacity style={styles.trackButton} onPress={handleTrackProvider}>
            <Ionicons name="location-outline" size={20} color={Colors.surface} />
            <Text style={styles.trackButtonText}>Track Provider</Text>
          </TouchableOpacity>
        )}

        {['pending', 'accepted'].includes(status) && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCancelModal(true)}
          >
            <Ionicons name="close-circle" size={20} color={Colors.error} />
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.helpButton} onPress={handleReportIssue}>
          <Ionicons name="alert-circle" size={20} color={Colors.warning} />
          <Text style={styles.helpButtonText}>Report an Issue</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {['details', 'timeline'].map((tab) => (
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
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView showsVerticalScrollIndicator={false}>
        {renderProviderInfo()}
        {renderTabs()}

        {selectedTab === 'details' && (
          <>
            {renderServiceDetails()}
            {renderPaymentDetails()}
          </>
        )}

        {selectedTab === 'timeline' && renderTimeline()}

        {renderActions()}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Cancel Booking Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            <Text style={styles.modalSubtitle}>
              Please tell us why you're cancelling this booking
            </Text>

            {[
              'Changed my mind',
              'Found another provider',
              'Service no longer needed',
              'Provider unresponsive',
              'Price too high',
              'Other',
            ].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reasonOption}
                onPress={() => setCancelReason(reason)}
              >
                <View style={styles.radioButton}>
                  {cancelReason === reason && <View style={styles.radioSelected} />}
                </View>
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !cancelReason && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleCancelBooking}
                disabled={!cancelReason || cancelBooking.isPending}
              >
                <Text style={styles.modalConfirmText}>
                  {cancelBooking.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.refundNote}>
              Note: Full refund before service date, 50% refund on service date
            </Text>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        bookingId={id as string}
        providerName={booking.provider?.fullname || 'Provider'}
        serviceName={booking.service?.title || 'Service'}
        onSuccess={() => {
          // Refresh booking data
        }}
      />

      {/* Complaint Modal */}
      <ComplaintModal
        visible={showComplaintModal}
        onClose={() => setShowComplaintModal(false)}
        bookingId={id as string}
        providerName={booking.provider?.fullname || 'Provider'}
      />
    </View>
  );
}

// Reuse the styles from your original file, just update the sectionTitle style to remove duplicate
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  menuButton: {
    padding: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  requestNumber: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  expiryText: {
    marginLeft: 6,
    fontSize: 12,
    color: Colors.warning,
  },
  section: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  providerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  providerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerAction: {
    padding: 8,
    backgroundColor: Colors.primary + '10',
    borderRadius: 20,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  paymentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  paidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.success + '10',
    borderRadius: 12,
  },
  paidText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
  },
  payButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  pendingPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.warning + '10',
    borderRadius: 12,
  },
  pendingPaymentText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.warning,
    flex: 1,
  },
  refundContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.info + '10',
    borderRadius: 12,
  },
  refundText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.info,
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  timelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 50,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    zIndex: 1,
  },
  timelineIconCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timelineIconCurrent: {
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    width: 2,
    height: 40,
    backgroundColor: Colors.border,
  },
  timelineLineCompleted: {
    backgroundColor: Colors.primary,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 20,
  },
  timelineLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  timelineLabelCompleted: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
  timelineTime: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  actionsContainer: {
    padding: 20,
    gap: 12,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  trackButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error + '10',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  cancelButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  helpButtonText: {
    color: Colors.warning,
    fontSize: 14,
  },
  bottomPadding: {
    height: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 24,
  },
  backButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  reasonText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.error,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
  refundNote: {
    marginTop: 16,
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});