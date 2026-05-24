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
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useServiceRequest, useCancelRequest, useConfirmCompletion } from '../../../hooks/useCustomerQueries';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { api } from "@/app/services/api";
import { ReviewModal } from '../../../components/customer/ReviewModal';
import { ComplaintModal } from '../../../components/customer/ComplaintModal';
import { format } from 'date-fns';
import { formatDate } from '../../utils/formatters';
import { useQueryClient } from '@tanstack/react-query';
import Map from '../../../components/Map/index';
import { useTrackProvider, bookingKeys } from '@/hooks/useCustomerBookings';
import * as pusherClient from '@/app/services/pusherClient';
import { useEffect } from 'react';
import { useConversations } from '@/hooks/useConversations';
import type { Conversation } from '@/app/types/customer.types';

const STATUS_COLORS = {
  pending: Colors.warning,
  accepted: Colors.info,
  arrived: Colors.primary,
  in_progress: Colors.primary,
  waiting_customer_confirmation: Colors.info,
  completed: Colors.success,
  cancelled: Colors.error,
  disputed: Colors.error,
};

const STATUS_ICONS = {
  pending: 'time-outline',
  accepted: 'checkmark-circle-outline',
  arrived: 'pin-outline',
  in_progress: 'construct-outline',
  waiting_customer_confirmation: 'shield-checkmark-outline',
  completed: 'checkmark-done-outline',
  cancelled: 'close-circle-outline',
  disputed: 'alert-circle-outline',
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Request Sent', icon: 'send-outline' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline' },
  { key: 'arrived', label: 'Arrived', icon: 'pin-outline' },
  { key: 'in_progress', label: 'In Progress', icon: 'construct-outline' },
  { key: 'waiting_customer_confirmation', label: 'Job Done', icon: 'shield-checkmark-outline' },
  { key: 'completed', label: 'Finalized', icon: 'checkmark-done-outline' },
];

export default function RequestDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedTab, setSelectedTab] = useState<'details' | 'timeline' | 'messages'>('details');

  const STATUS_STEPS = [
    { key: 'pending', label: t('requests.steps.pending', 'Request Sent'), icon: 'send-outline' },
    { key: 'accepted', label: t('requests.steps.accepted', 'Accepted'), icon: 'checkmark-circle-outline' },
    { key: 'arrived', label: t('requests.steps.arrived', 'Arrived'), icon: 'pin-outline' },
    { key: 'in_progress', label: t('requests.steps.in_progress', 'In Progress'), icon: 'construct-outline' },
    { key: 'waiting_customer_confirmation', label: t('requests.steps.waiting_customer_confirmation', 'Job Done'), icon: 'shield-checkmark-outline' },
    { key: 'completed', label: t('requests.steps.completed', 'Finalized'), icon: 'checkmark-done-outline' },
  ];

  const { data: request, isLoading } = useServiceRequest(id as string);
  const cancelRequest = useCancelRequest();
  const confirmCompletion = useConfirmCompletion();
  const queryClient = useQueryClient();
  
  // Only track provider when on Details tab
  const shouldTrack = selectedTab === 'details';
  const { data: trackingResponse } = useTrackProvider(id as string, request?.status, shouldTrack);
  const trackingData = trackingResponse?.data || trackingResponse; // Handle both nested and direct data
  const { data: conversationsData, isLoading: conversationsLoading } = useConversations();

  const [liveLocation, setLiveLocation] = useState<{
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  } | null>(null);

  // Real-time updates
  useEffect(() => {
    if (request && id) {
      // Live GPS tracking channel
      pusherClient.subscribeToBookingTracking(id as string, (data) => {
        console.log('[Reverb] Live location received:', data);
        setLiveLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
        });
        
        // Invalidate tracking query to get fresh ETA/history if needed
        queryClient.invalidateQueries({ queryKey: bookingKeys.track(id as string) });
      });

      return () => {
        pusherClient.unsubscribeFromBookingTracking(id as string);
      };
    }
  }, [request?.id, id]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>{t('requests.notFound', 'Request not found')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('requests.goBack', 'Go Back')}</Text>
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
    setSelectedTab('details');
    // We could scroll to map here if needed
    Alert.alert(t('requests.trackingActive', 'Tracking Active'), t('requests.trackingMessage', 'You can now view the provider location on the map below.'));
  };

  const handleCancelRequest = async () => {
    if (!cancelReason.trim()) {
      Alert.alert(t('common.error', 'Error'), t('requests.cancelReasonRequired', 'Please provide a reason for cancellation'));
      return;
    }

    try {
      await cancelRequest.mutateAsync({ id: id as string, reason: cancelReason });
      setShowCancelModal(false);
      Alert.alert(t('common.success', 'Success'), t('requests.cancelSuccess', 'Request cancelled successfully'));
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('requests.cancelError', 'Failed to cancel request'));
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
      t('requests.confirmCompletion', 'Confirm Completion'),
      t('requests.confirmCompletionMsg', 'By confirming, you agree that the service has been performed satisfactorily and the payment will be released to the provider.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.confirm', 'Confirm'),
          onPress: async () => {
            try {
              const response = await confirmCompletion.mutateAsync(id as string);
              
              // Check if final payment is required
              if (response?.data?.requires_final_payment) {
                // Redirect to payment screen for final 80% payment
                Alert.alert(
                  'Final Payment Required',
                  'Please proceed to pay the remaining 80% of the service cost.',
                  [
                    {
                      text: 'Pay Now',
                      onPress: () => {
                        router.push({
                          pathname: '/(customer)/payment',
                          params: { bookingId: id }
                        });
                      }
                    }
                  ]
                );
              }
              // Note: Review modal will be shown after final payment is completed in the payment screen
            } catch (error) {
              Alert.alert(t('common.error', 'Error'), t('common.failedToConfirm', 'Failed to confirm completion. Please try again.'));
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
        <Text style={styles.headerTitle}>{t('requests.requestDetails', 'Request Details')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
          <Ionicons
            name={getStatusIcon(request.status) as keyof typeof Ionicons.glyphMap}
            size={20}
            color={getStatusColor(request.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {t(`bookings.status.${request.status.toLowerCase()}`, request.status.replace('_', ' ').toUpperCase())}
          </Text>
        </View>
        <Text style={styles.requestNumber}>#{request.requestNumber}</Text>
      </View>
    </View>
  );

  const renderProviderInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('requests.serviceProvider', 'Service Provider')}</Text>
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
            <Text style={styles.reviewCount}>({request.providerReviewCount || 127} {t('providerProfile.reviews', 'reviews')})</Text>
          </View>
          <View style={styles.providerStats}>
            <View style={styles.statItem}>
              <Ionicons name="briefcase-outline" size={14} color={Colors.text.secondary} />
              <Text style={styles.statText}>{request.providerJobs || 150}+ {t('providerProfile.jobs', 'jobs')}</Text>
            </View>
            {request.providerVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.verifiedText}>{t('requests.verified', 'Verified')}</Text>
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
    <View style={styles.tabContent}>
      {renderLiveTracking()}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('requests.serviceDetails', 'Service Details')}</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="construct-outline" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('requests.service', 'Service')}</Text>
              <Text style={styles.detailValue}>{request.serviceName}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('requests.dateTime', 'Date & Time')}</Text>
              <Text style={styles.detailValue}>
                {formatDate(request.scheduledDate)} at {request.scheduledTime}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={Colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t('requests.location', 'Location')}</Text>
              <Text style={styles.detailValue}>{request.address}</Text>
            </View>
          </View>

          {request.specialInstructions && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t('requests.specialInstructions', 'Special Instructions')}</Text>
                <Text style={styles.detailValue}>{request.specialInstructions}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderLiveTracking = () => {
    const showTrack = ['accepted', 'arrived', 'in_progress'].includes(request.status);
    if (!showTrack) return null;

    // Use live location if available, fallback to latest fetched tracking data, then fallback to request start
    const providerPos = liveLocation || (trackingData?.provider && 
      trackingData.provider.latitude && 
      trackingData.provider.longitude ? {
      latitude: parseFloat(trackingData.provider.latitude),
      longitude: parseFloat(trackingData.provider.longitude),
    } : null);

    // Customer location - only use if valid coordinates exist
    const destinationPos = (request.latitude && request.longitude) ? {
      latitude: request.latitude,
      longitude: request.longitude,
    } : null;

    // Determine center for map
    const mapCenter = providerPos 
      ? [providerPos.latitude, providerPos.longitude] as [number, number]
      : destinationPos 
        ? [destinationPos.latitude, destinationPos.longitude] as [number, number]
        : undefined;

    return (
      <View style={styles.section}>
        <View style={styles.liveTrackingHeader}>
          <Text style={styles.sectionTitle}>{t('requests.liveTracking', 'Live Tracking')}</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t('requests.live', 'LIVE')}</Text>
          </View>
        </View>
        
        <View style={styles.mapContainer}>
          {(providerPos || destinationPos) ? (
            <Map
              center={mapCenter}
              userLocation={destinationPos || undefined}
              markers={providerPos ? [
                {
                  position: [providerPos.latitude, providerPos.longitude],
                  title: request.providerName || 'Provider',
                  description: 'Current Location'
                }
              ] : []}
              style={{ height: 250, width: '100%' }}
            />
          ) : (
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>{t('requests.waitingForLocation', 'Waiting for location data...')}</Text>
            </View>
          )}
          
          {(providerPos || destinationPos) && !providerPos && (
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>{t('requests.waitingForLocation', 'Waiting for provider location...')}</Text>
            </View>
          )}
        </View>

        {trackingData?.eta && (
          <View style={styles.etaCard}>
            <View style={styles.etaItem}>
              <Text style={styles.etaLabel}>{t('requests.distance', 'Distance')}</Text>
              <Text style={styles.etaValue}>{trackingData.eta.distance_km || '0'} {t('common.km', 'km')}</Text>
            </View>
            <View style={styles.etaDivider} />
            <View style={styles.etaItem}>
              <Text style={styles.etaLabel}>{t('requests.estArrival', 'Est. Arrival')}</Text>
              <Text style={styles.etaValue}>{trackingData.eta.minutes || '?' } {t('common.min', 'min')}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderPaymentDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('requests.paymentDetails', 'Payment Details')}</Text>
      <View style={styles.paymentCard}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>{t('requests.servicePrice', 'Service Price')}</Text>
          <Text style={styles.priceValue}>ETB {request.estimatedPrice.toFixed(2)}</Text>
        </View>

        {request.paymentStatus === 'paid' ? (
          <View style={styles.paidContainer}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.paidText}>{t('requests.paymentCompleted', 'Payment Completed')}</Text>
          </View>
        ) : request.status === 'service_confirmed' ? (
          <View style={styles.confirmationRequired}>
            <View style={styles.pendingPayment}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
              <Text style={[styles.pendingPaymentText, { color: Colors.info }]}>
                {t('requests.finalPaymentRequired', 'Service confirmed. Please pay the remaining 80% to complete.')}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.payButton, { marginTop: 12, backgroundColor: Colors.primary }]} 
              onPress={handlePayNow}
            >
              <Ionicons name="card-outline" size={18} color={Colors.surface} style={{ marginRight: 8 }} />
              <Text style={styles.payButtonText}>
                {t('requests.payFinalAmount', 'Pay Final Amount')} — ETB {(request.estimatedPrice * 0.80).toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        ) : request.status === 'waiting_customer_confirmation' ? (
          <View style={styles.confirmationRequired}>
            <View style={styles.pendingPayment}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
              <Text style={[styles.pendingPaymentText, { color: Colors.info }]}>
                {t('requests.providerMarkedDone', 'Provider marked job as done. Please confirm completion.')}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.payButton, { marginTop: 12, backgroundColor: Colors.success }]} 
              onPress={handleConfirmCompletion}
              disabled={confirmCompletion.isPending}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.surface} style={{ marginRight: 8 }} />
              <Text style={styles.payButtonText}>
                {confirmCompletion.isPending ? t('requests.confirming', 'Confirming...') : t('requests.confirmServiceBtn', 'Confirm Service Completion')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (['accepted', 'arrived'].includes(request.status as string)) ? (
          <TouchableOpacity style={styles.payButton} onPress={handlePayNow}>
            <Ionicons name="card-outline" size={18} color={Colors.surface} style={{ marginRight: 8 }} />
            <Text style={styles.payButtonText}>{t('requests.payNow', 'Pay Now')} — ETB {request.estimatedPrice?.toFixed(2)}</Text>
          </TouchableOpacity>
        ) : request.status === 'completed' && (request.paymentStatus as string) !== 'paid' ? (
          <TouchableOpacity style={styles.payButton} onPress={handlePayNow}>
            <Ionicons name="card-outline" size={18} color={Colors.surface} style={{ marginRight: 8 }} />
            <Text style={styles.payButtonText}>{t('requests.payNow', 'Pay Now')} — ETB {request.estimatedPrice?.toFixed(2)}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pendingPayment}>
            <Ionicons name="time-outline" size={20} color={Colors.warning} />
            <Text style={styles.pendingPaymentText}>
              {request.status === 'pending'
                ? t('requests.waitingAcceptance', 'Waiting for provider to accept your request')
                : t('requests.paymentPending', 'Payment pending after service completion')}
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
        <Text style={styles.sectionTitle}>{t('requests.progressTimeline', 'Progress Timeline')}</Text>
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
                      {request.status === 'in_progress' ? t('requests.inProgressNow', 'In progress now') : t('requests.currentStep', 'Current step')}
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
    if (request.status === 'cancelled') {
      return null;
    }

    if (request.status === 'completed' && request.review) {
      return null;
    }

    return (
      <View style={styles.actionsContainer}>
        {request.status === 'confirmed' && (
          <TouchableOpacity style={styles.trackButton} onPress={handleTrackProvider}>
            <Ionicons name="location" size={20} color={Colors.surface} />
            <Text style={styles.trackButtonText}>{t('requests.trackProvider', 'Track Provider')}</Text>
          </TouchableOpacity>
        )}

        {request.status === 'in_progress' && (
          <TouchableOpacity style={styles.trackButton} onPress={handleTrackProvider}>
            <Ionicons name="location" size={20} color={Colors.surface} />
            <Text style={styles.trackButtonText}>{t('requests.trackLive', 'Track Live Location')}</Text>
          </TouchableOpacity>
        )}

        {['pending', 'accepted'].includes(request.status) && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCancelModal(true)}
          >
            <Ionicons name="close-circle" size={20} color={Colors.error} />
            <Text style={styles.cancelButtonText}>{t('requests.cancelRequest', 'Cancel Request')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.helpButton} onPress={handleReportIssue}>
          <Ionicons name="alert-circle" size={20} color={Colors.warning} />
          <Text style={styles.helpButtonText}>{t('requests.reportIssue', 'Report an Issue')}</Text>
        </TouchableOpacity>

        {request.status === 'completed' && !request.review && selectedTab !== 'messages' && (
          <TouchableOpacity 
            style={styles.reviewButton} 
            onPress={() => setShowReviewModal(true)}
          >
            <Ionicons name="star" size={20} color={Colors.surface} />
            <Text style={styles.reviewButtonText}>{t('requests.rateReviewService', 'Rate & Review Service')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderReview = () => {
    if (!request.review) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('requests.yourReview', 'Your Review')}</Text>
        <View style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= request.review!.rating ? 'star' : 'star-outline'}
                  size={16}
                  color={star <= request.review!.rating ? '#FFD700' : Colors.text.secondary}
                />
              ))}
            </View>
            <Text style={styles.reviewDate}>
              {request.review.createdAt ? format(new Date(request.review.createdAt.toString()), 'PP') : ''}
            </Text>
          </View>
          {request.review.comment && (
            <Text style={styles.reviewComment}>{request.review.comment}</Text>
          )}
          {request.review.is_anonymous && (
            <Text style={styles.anonymousBadge}>{t('requests.submittedAnonymously', 'Submitted Anonymously')}</Text>
          )}
        </View>
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
            {t(`requests.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
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
          <>
            {conversationsLoading ? (
              <View style={styles.messagesPlaceholder}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.messagesTitle}>{t('requests.loadingConversations', 'Loading conversations...')}</Text>
              </View>
            ) : conversationsData?.data && conversationsData.data.length > 0 ? (
              <View style={styles.conversationList}>
                {(() => {
                  // Deduplicate conversations by providerID - keep only the most recent one per provider
                  const uniqueConversations = conversationsData.data.reduce((acc: Conversation[], conversation: Conversation) => {
                    const existingIndex = acc.findIndex(c => c.providerID === conversation.providerID);
                    if (existingIndex === -1) {
                      // Provider not seen yet, add this conversation
                      acc.push(conversation);
                    } else {
                      // Provider already exists, keep the one with more recent last_message_at
                      const existing = acc[existingIndex];
                      if (!existing.last_message_at || 
                          (conversation.last_message_at && conversation.last_message_at > existing.last_message_at)) {
                        acc[existingIndex] = conversation;
                      }
                    }
                    return acc;
                  }, []);

                  return uniqueConversations.map((conversation: Conversation) => (
                    <TouchableOpacity
                      key={conversation.conversationID}
                      style={styles.conversationItem}
                      onPress={() => router.push(`/(customer)/chat/${conversation.providerID}`)}
                    >
                      <Image
                        source={{ uri: conversation.other_party?.profilePicture || 'https://via.placeholder.com/50' }}
                        style={styles.conversationAvatar}
                      />
                      <View style={styles.conversationContent}>
                        <View style={styles.conversationHeader}>
                          <Text style={styles.conversationName} numberOfLines={1}>
                            {(conversation.other_party as any)?.fullname || 
                             conversation.other_party?.name || 
                             (conversation.other_party?.firstName && conversation.other_party?.lastName 
                               ? `${conversation.other_party.firstName} ${conversation.other_party.lastName}` 
                               : 'Provider')}
                          </Text>
                          {conversation.last_message_at && (
                            <Text style={styles.conversationTime}>
                              {formatDate(conversation.last_message_at)}
                            </Text>
                          )}
                        </View>
                        <View style={styles.conversationFooter}>
                        <Text style={styles.conversationMessage} numberOfLines={1}>
                          {conversation.last_message || 'No messages yet'}
                        </Text>
                        {conversation.unread_count && conversation.unread_count > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>{conversation.unread_count}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  ));
                })()}
              </View>
            ) : (
              <View style={styles.messagesPlaceholder}>
                <Ionicons name="chatbubbles-outline" size={48} color={Colors.text.secondary} />
                <Text style={styles.messagesTitle}>{t('requests.noMessages', 'No messages yet')}</Text>
                <Text style={styles.messagesSubtitle}>
                  {t('requests.startConversation', { name: request.providerName, defaultValue: `Start a conversation with ${request.providerName}` })}
                </Text>
                <TouchableOpacity style={styles.startChatButton} onPress={handleMessageProvider}>
                  <Text style={styles.startChatButtonText}>{t('requests.sendMessage', 'Send Message')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {renderReview()}

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
            <Text style={styles.modalTitle}>{t('requests.cancelModalTitle', 'Cancel Request')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('requests.cancelModalSubtitle', "Please tell us why you're cancelling this request")}
            </Text>

            {[
              { key: 'changedMind', label: t('requests.reasons.changedMind', 'Changed my mind') },
              { key: 'foundAnother', label: t('requests.reasons.foundAnother', 'Found another provider') },
              { key: 'noLongerNeeded', label: t('requests.reasons.noLongerNeeded', 'Service no longer needed') },
              { key: 'unresponsive', label: t('requests.reasons.unresponsive', 'Provider unresponsive') },
              { key: 'priceHigh', label: t('requests.reasons.priceHigh', 'Price too high') },
              { key: 'other', label: t('requests.reasons.other', 'Other') },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.reasonOption}
                onPress={() => setCancelReason(option.label)}
              >
                <View style={styles.radioButton}>
                  {cancelReason === option.label && <View style={styles.radioSelected} />}
                </View>
                <Text style={styles.reasonText}>{option.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelText}>{t('requests.goBack', 'Go Back')}</Text>
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
                  {cancelRequest.isPending ? t('requests.confirming', 'Cancelling...') : t('requests.cancelRequest', 'Confirm Cancellation')}
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
        providerId={request.providerId}
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
    paddingTop: 100,
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
  tabContent: {
    padding: 0,
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
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  reviewButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  anonymousBadge: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 8,
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
  liveTrackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.error,
  },
  mapContainer: {
    height: 250,
    backgroundColor: Colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapOverlayText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  etaCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  etaItem: {
    flex: 1,
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  etaValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  etaDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  conversationList: {
    padding: 16,
    backgroundColor: Colors.background,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  conversationMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
});