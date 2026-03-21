// app/(customer)/requests/[id].tsx
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useServiceRequest, useCancelRequest, useConfirmCompletion } from '../../../hooks/useCustomerQueries';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { api } from "@/app/services/api";
import { ReviewModal } from '../../../components/customer/ReviewModal';
import { ComplaintModal } from '../../../components/customer/ComplaintModal';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: Colors.warning,
  accepted: Colors.info,
  confirmed: Colors.info,
  in_progress: Colors.primary,
  waiting_customer_confirmation: Colors.info,
  completed: Colors.success,
  cancelled: Colors.error,
  disputed: Colors.error,
};

const STATUS_ICONS = {
  pending: 'time-outline',
  accepted: 'checkmark-circle-outline',
  confirmed: 'checkmark-circle-outline',
  in_progress: 'construct-outline',
  waiting_customer_confirmation: 'shield-checkmark-outline',
  completed: 'checkmark-done-outline',
  cancelled: 'close-circle-outline',
  disputed: 'alert-circle-outline',
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Request Sent', icon: 'send-outline' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline' },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  { key: 'in_progress', label: 'In Progress', icon: 'construct-outline' },
  { key: 'waiting_customer_confirmation', label: 'Job Done', icon: 'shield-checkmark-outline' },
  { key: 'completed', label: 'Finalized', icon: 'checkmark-done-outline' },
];

export default function RequestDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedTab, setSelectedTab] = useState<'details' | 'timeline' | 'messages'>('details');

  const { data: request, isLoading } = useServiceRequest(id as string);
  const cancelRequest = useCancelRequest();
  const confirmCompletion = useConfirmCompletion();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Request not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || Colors.text.secondary;
  };

  const getStatusIcon = (status: string) => {
    return STATUS_ICONS[status as keyof typeof STATUS_ICONS] || 'help-outline';
  };

  const getCurrentStep = () => {
    const statusIndex = STATUS_STEPS.findIndex(step => step.key === request.status);
    return statusIndex >= 0 ? statusIndex : 0;
  };

  const handleCallProvider = () => {
    if (request.providerPhone) {
      Linking.openURL(`tel:${request.providerPhone}`);
    }
  };

  const handleMessageProvider = async () => {
    if (request?.providerId) {
      try {
        // Option 1: Try to get/create conversation via API
        const response = await api.post<any>('/chat/conversations', {
          providerID: parseInt(request.providerId),
          bookingID: parseInt(id as string)
        });

        if (response.success && response.data.conversation) {
          router.push(`/(customer)/chat/${request.providerId}`);
        } else {
          // Fallback if API fails but we have provider phone
          if (request.providerPhone) {
            Linking.openURL(`sms:${request.providerPhone}`);
          }
        }
      } catch (error) {
        console.error('Error opening chat:', error);
        // Fallback to SMS
        if (request.providerPhone) {
          Linking.openURL(`sms:${request.providerPhone}`);
        }
      }
    } else if (request?.providerPhone) {
      Linking.openURL(`sms:${request.providerPhone}`);
    }
  };

  const handleTrackProvider = () => {
    Alert.alert('Coming Soon', 'Live tracking is not available yet.');
  };

  const handleCancelRequest = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    try {
      await cancelRequest.mutateAsync({ id: id as string, reason: cancelReason });
      setShowCancelModal(false);
      Alert.alert('Success', 'Request cancelled successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel request');
    }
  };

  const handlePayNow = () => {
    router.push({
      pathname: '/(customer)/payment',
      params: {
        bookingId: id as string,
        amount: request.estimatedPrice?.toString(),
        providerId: request.providerId,
        serviceName: request.serviceName,
      },
    });
  };

  const handleReportIssue = () => {
    setShowComplaintModal(true);
  };

  const handleReview = () => {
    setShowReviewModal(true);
  };

  const handleConfirmCompletion = async () => {
    Alert.alert(
      'Confirm Completion',
      'By confirming, you agree that the service has been performed satisfactorily and the payment will be released to the provider.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await confirmCompletion.mutateAsync(id as string);
              Alert.alert('Success', 'Service completion confirmed. Thank you!');
            } catch (error) {
              Alert.alert('Error', 'Failed to confirm completion. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: getStatusColor(request.status) }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
          <Ionicons
            name={getStatusIcon(request.status) as keyof typeof Ionicons.glyphMap}
            size={20}
            color={getStatusColor(request.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {request.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.requestNumber}>#{request.requestNumber}</Text>
      </View>
    </View>
  );

  const renderProviderInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Service Provider</Text>
      <View style={styles.providerCard}>
        <Image
          source={{ uri: request.providerImage || 'https://via.placeholder.com/60' }}
          style={styles.providerImage}
        />
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{request.providerName}</Text>
          <View style={styles.providerRating}>
            <Ionicons name="star" size={16} color={Colors.warning} />
            <Text style={styles.ratingText}>{request.providerRating?.toFixed(1) || '4.8'}</Text>
            <Text style={styles.reviewCount}>({request.providerReviewCount || 127} reviews)</Text>
          </View>
          <View style={styles.providerStats}>
            <View style={styles.statItem}>
              <Ionicons name="briefcase-outline" size={14} color={Colors.text.secondary} />
              <Text style={styles.statText}>{request.providerJobs || 150}+ jobs</Text>
            </View>
            {request.providerVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
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

  const renderServiceDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Service Details</Text>
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Ionicons name="construct-outline" size={20} color={Colors.primary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{request.serviceName}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {format(new Date(request.scheduledDate), 'MMMM d, yyyy')} at {request.scheduledTime}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={20} color={Colors.primary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{request.address}</Text>
          </View>
        </View>

        {request.specialInstructions && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Special Instructions</Text>
              <Text style={styles.detailValue}>{request.specialInstructions}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderPaymentDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Details</Text>
      <View style={styles.paymentCard}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Service Price</Text>
          <Text style={styles.priceValue}>${request.estimatedPrice.toFixed(2)}</Text>
        </View>

        {request.paymentStatus === 'paid' ? (
          <View style={styles.paidContainer}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.paidText}>Payment Completed</Text>
          </View>
        ) : request.status === 'waiting_customer_confirmation' ? (
          <View style={styles.confirmationRequired}>
            <View style={styles.pendingPayment}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
              <Text style={[styles.pendingPaymentText, { color: Colors.info }]}>
                Provider marked job as done. Please confirm completion.
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.payButton, { marginTop: 12, backgroundColor: Colors.success }]} 
              onPress={handleConfirmCompletion}
              disabled={confirmCompletion.isPending}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.surface} style={{ marginRight: 8 }} />
              <Text style={styles.payButtonText}>
                {confirmCompletion.isPending ? 'Confirming...' : 'Confirm Service Completion'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (['accepted', 'confirmed'].includes(request.status as string)) ? (
          <TouchableOpacity style={styles.payButton} onPress={handlePayNow}>
            <Ionicons name="card-outline" size={18} color={Colors.surface} style={{ marginRight: 8 }} />
            <Text style={styles.payButtonText}>Pay Now — ETB {request.estimatedPrice?.toFixed(2)}</Text>
          </TouchableOpacity>
        ) : request.status === 'completed' && (request.paymentStatus as string) !== 'paid' ? (
          <TouchableOpacity style={styles.payButton} onPress={handlePayNow}>
            <Ionicons name="card-outline" size={18} color={Colors.surface} style={{ marginRight: 8 }} />
            <Text style={styles.payButtonText}>Pay Now — ETB {request.estimatedPrice?.toFixed(2)}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pendingPayment}>
            <Ionicons name="time-outline" size={20} color={Colors.warning} />
            <Text style={styles.pendingPaymentText}>
              {request.status === 'pending'
                ? 'Waiting for provider to accept your request'
                : 'Payment pending after service completion'}
            </Text>
          </View>
        )}
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
                      {request.status === 'in_progress' ? 'In progress now' : 'Current step'}
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
    if (request.status === 'cancelled' || request.status === 'completed') {
      return null;
    }

    return (
      <View style={styles.actionsContainer}>
        {request.status === 'confirmed' && (
          <TouchableOpacity style={styles.trackButton} onPress={handleTrackProvider}>
            <Ionicons name="location" size={20} color={Colors.surface} />
            <Text style={styles.trackButtonText}>Track Provider</Text>
          </TouchableOpacity>
        )}

        {request.status === 'in_progress' && (
          <TouchableOpacity style={styles.trackButton} onPress={handleTrackProvider}>
            <Ionicons name="location" size={20} color={Colors.surface} />
            <Text style={styles.trackButtonText}>Track Live Location</Text>
          </TouchableOpacity>
        )}

        {['pending', 'confirmed'].includes(request.status) && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCancelModal(true)}
          >
            <Ionicons name="close-circle" size={20} color={Colors.error} />
            <Text style={styles.cancelButtonText}>Cancel Request</Text>
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
      {['details', 'timeline', 'messages'].map((tab) => (
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

        {selectedTab === 'messages' && (
          <View style={styles.messagesPlaceholder}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.text.secondary} />
            <Text style={styles.messagesTitle}>No messages yet</Text>
            <Text style={styles.messagesSubtitle}>
              Start a conversation with {request.providerName}
            </Text>
            <TouchableOpacity style={styles.startChatButton} onPress={handleMessageProvider}>
              <Text style={styles.startChatButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {renderActions()}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Cancel Request Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Request</Text>
            <Text style={styles.modalSubtitle}>
              Please tell us why you're cancelling this request
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
                onPress={handleCancelRequest}
                disabled={!cancelReason || cancelRequest.isPending}
              >
                <Text style={styles.modalConfirmText}>
                  {cancelRequest.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        bookingId={id as string}
        providerName={request.providerName || 'Provider'}
        serviceName={request.serviceName || 'Service'}
        onSuccess={() => {
          // Refresh request data
        }}
      />

      {/* Complaint Modal */}
      <ComplaintModal
        visible={showComplaintModal}
        onClose={() => setShowComplaintModal(false)}
        bookingId={id as string}
        providerName={request.providerName || 'Provider'}
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
    marginBottom: 6,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  providerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.primary,
  },
  providerActions: {
    justifyContent: 'center',
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
  messagesPlaceholder: {
    alignItems: 'center',
    padding: 40,
  },
  messagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  messagesSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  startChatButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startChatButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
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
  confirmationRequired: {
    marginTop: 8,
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
});