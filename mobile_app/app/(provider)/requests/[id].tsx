// app/(provider)/requests/[id].tsx
import {
  formatCurrency,
  formatDateTime
} from "@/app/utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Map from "@/components/Map/index";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useProviderQueries, useProviderRequest } from "@/hooks/useProviderQueries";
import { useConfirmCompletion } from '@/hooks/useCustomerQueries';
import { PriceText } from '@/components/common/PriceText';
import { useQueryClient } from '@tanstack/react-query';
import { api } from "@/app/services/api";
import * as pusherClient from "@/app/services/pusherClient";
import { useTracking } from "@/hooks/useTracking";
import { useTheme } from "@/app/context/ThemeContext";
import { ThemeColors } from "@/app/constants/Colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STATUS_ICONS = {
  pending: "time-outline",
  accepted: "checkmark-circle-outline",
  confirmed: "card-outline",
  arrived: "pin-outline",
  in_progress: "construct-outline",
  waiting_customer_confirmation: "shield-checkmark-outline",
  completed: "checkmark-done-outline",
  cancelled: "close-circle-outline",
};



export default function RequestDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const STATUS_STEPS = [
    { key: "pending", label: t('requests.steps.pending', 'Requested'), icon: "mail-outline" },
    { key: "accepted", label: t('requests.steps.accepted', 'Accepted'), icon: "checkmark-circle-outline" },
    { key: "arrived", label: t('providerRequests.arrived', 'Arrived'), icon: "pin-outline" },
    { key: "in_progress", label: t('requests.steps.in_progress', 'Started'), icon: "construct-outline" },
    { key: "completed", label: t('requests.steps.completed', 'Completed'), icon: "checkmark-done-outline" },
  ];
  const STATUS_COLORS = useMemo(() => ({
    pending: colors.warning,
    accepted: colors.primary,
    confirmed: colors.primary,
    arrived: colors.primary,
    in_progress: colors.info,
    waiting_customer_confirmation: colors.info,
    completed: colors.success,
    cancelled: colors.error,
  }), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [request, setRequest] = useState<any>(null);

  const {
    isLoading: isRequestLoading,
    data: requestData,
    refetch: refetchRequest,
  } = useProviderRequest(id as string, { enabled: !!id });

  const {
    isPendingLoading,
    refetch: refetchQueries,
    acceptRequest,
    rejectRequest,
    rescheduleRequest,
    arriveRequest,
    startService,
    completeService,
  } = useProviderQueries();
  
  const isActiveStatus = request && ['accepted', 'confirmed', 'arrived', 'in_progress'].includes(request.status);
  const { isTracking } = useTracking(id as string, !!isActiveStatus);

  // Use the data from useProviderRequest
  useEffect(() => {
    if (requestData) {
      setRequest(requestData);
    }
  }, [requestData]);

  useEffect(() => {
    if (request?.customerLatitude && request?.customerLongitude) {
      setMapRegion({
        latitude: Number(request.customerLatitude),
        longitude: Number(request.customerLongitude),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [request]);

  // Real-time updates
  useEffect(() => {
    if (request?.providerID) {
      pusherClient.subscribeToUserUpdates(
        "provider",
        request.providerID,
        (data: any) => {
          console.log("[Pusher] Booking update received:", data);
          if (data.related_booking_id?.toString() === id?.toString()) {
            refetchRequest();
          }
        }
      );

      return () => {
        pusherClient.unsubscribeFromUserUpdates("provider", request.providerID);
      };
    }
  }, [request?.providerID, id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchRequest(), refetchQueries()]);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || colors.text.secondary;
  };

  const getStatusIcon = (status: string) => {
    return STATUS_ICONS[status as keyof typeof STATUS_ICONS] || "help-outline";
  };

  const getCurrentStep = () => {
    if (!request) return 0;
    if (request.status === 'completed') return 4;
    if (request.status === 'waiting_customer_confirmation' || request.status === 'in_progress') return 3;
    if (request.status === 'arrived') return 2;
    if (['accepted', 'confirmed'].includes(request.status)) return 1;
    if (request.status === 'pending') return 0;
    return 0;
  };

  const handleCall = () => {
    if (request?.customerPhone) {
      Linking.openURL(`tel:${request.customerPhone}`);
    }
  };

  const handleMessage = async () => {
    if (request?.customerId) {
      try {
        // Option 1: Try to get/create conversation via API
        const response = await api.post<any>('/chat/conversations', {
          customerID: parseInt(request.customerId),
          bookingID: parseInt(id as string)
        });

        if (response.success && response.data.conversation) {
          router.push(`/(provider)/chat/${response.data.conversation.conversationID}`);
        } else {
          // Fallback if API fails but we have customer phone
          if (request.customerPhone) {
            Linking.openURL(`sms:${request.customerPhone}`);
          }
        }
      } catch (error) {
        console.error('Error opening chat:', error);
        // Fallback to SMS
        if (request.customerPhone) {
          Linking.openURL(`sms:${request.customerPhone}`);
        }
      }
    } else if (request?.customerPhone) {
      Linking.openURL(`sms:${request.customerPhone}`);
    }
  };

  const handleOpenMaps = () => {
    let url = '';
    if (request?.customerLatitude && request?.customerLongitude) {
      const lat = request.customerLatitude;
      const lng = request.customerLongitude;
      url = Platform.select({
        ios: `maps://app?daddr=${lat},${lng}&dirflg=d`,
        android: `google.navigation:q=${lat},${lng}&mode=d`,
      }) || '';
    } else if (request?.customerAddress) {
      const encodedAddress = encodeURIComponent(request.customerAddress);
      url = Platform.select({
        ios: `maps://app?daddr=${encodedAddress}&dirflg=d`,
        android: `google.navigation:q=${encodedAddress}&mode=d`,
      }) || '';
    }

    if (url) {
      Linking.openURL(url);
    } else {
      Alert.alert(t("common.error", "Error"), t("providerRequests.navigationNotAvailable", "Location information not available for navigation."));
    }
  };

  const handleAccept = () => {
    Alert.alert(
      t("providerRequests.acceptConfirmTitle", "Accept Request"),
      t("providerRequests.acceptConfirmMsg", "Are you sure you want to accept this request?"),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("providerRequests.accept", "Accept"),
          onPress: async () => {
            try {
              await acceptRequest.mutateAsync(id as string);
            } catch (error) {
              // Error handled by hook
            }
          },
        },
      ],
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert(t("common.error", "Error"), t("providerRequests.provideReason", "Please provide a reason"));
      return;
    }

    try {
      await rejectRequest.mutateAsync({
        id: id as string,
        reason: rejectReason,
      });
      setShowActionModal(false);
      setRejectReason("");
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      Alert.alert(t("common.error", "Error"), t("providerRequests.provideDateTime", "Please select new date and time"));
      return;
    }

    try {
      await rescheduleRequest.mutateAsync({
        id: id as string,
        data: {
          scheduledDate: rescheduleDate,
          scheduledTime: rescheduleTime,
          reason: "Provider rescheduled",
        },
      });
      setShowScheduleModal(false);
      setRescheduleDate("");
      setRescheduleTime("");
      Alert.alert(t("common.success", "Success"), t("providerRequests.rescheduleSuccess", "Request rescheduled"));
    } catch (error) {
      Alert.alert(t("common.error", "Error"), t("providerRequests.rescheduleError", "Failed to reschedule request"));
    }
  };

  const handleArrive = () => {
    Alert.alert(t("providerRequests.confirmArrival", "Confirm Arrival"), t("providerRequests.arrivedMsg", "Have you arrived at the customer's location?"), [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      {
        text: t("providerRequests.arrivedBtn", "Arrived"),
        onPress: async () => {
          try {
            await arriveRequest.mutateAsync(id as string);
            Alert.alert(t("common.success", "Success"), t("providerRequests.arrivalConfirmed", "Arrival confirmed"));
          } catch (error) {
            Alert.alert(t("common.error", "Error"), t("providerRequests.failedArrive", "Failed to confirm arrival"));
          }
        },
      },
    ]);
  };

  const handleStart = () => {
    Alert.alert(t("providerRequests.startConfirmTitle", "Start Service"), t("providerRequests.startConfirmMsg", "Are you ready to start this service?"), [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      {
        text: t("common.start", "Start"),
        onPress: async () => {
          try {
            await startService.mutateAsync(id as string);
            Alert.alert(t("common.success", "Success"), t("providerRequests.startSuccess", "Service started"));
          } catch (error) {
            Alert.alert(t("common.error", "Error"), t("providerRequests.startError", "Failed to start service"));
          }
        },
      },
    ]);
  };

  const handleComplete = () => {
    Alert.alert(
      t("providerRequests.completeConfirmTitle", "Complete Service"),
      t("providerRequests.completeConfirmMsg", "Have you completed this service to the customer's satisfaction?"),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("providerRequests.complete", "Complete"),
          onPress: async () => {
            try {
              await completeService.mutateAsync(id as string);
              Alert.alert(
                t("common.success", "Success"),
                t("providerRequests.completeSuccessMsg", "Service completed. Payment will be released after customer confirmation."),
              );
            } catch (error) {
              Alert.alert(t("common.error", "Error"), t("providerRequests.completeError", "Failed to complete service"));
            }
          },
        },
      ],
    );
  };

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        { paddingTop: Math.max(insets.top + 16, 32) },
        { borderBottomColor: getStatusColor(request?.status || "pending") },
      ]}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("providerRequests.title", "Request Details")}</Text>
        <TouchableOpacity style={styles.menuButton} onPress={() => setShowActionModal(true)}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                getStatusColor(request?.status || "pending") + "20",
            },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(request?.status || "pending") }]}>
            {t(`bookings.status.${(request?.status || "pending").toLowerCase()}`, (request?.status || "pending").replace("_", " ").toUpperCase()) as string}
          </Text>
        </View>
          {isTracking && (
            <View style={styles.trackingIndicator}>
              <View style={styles.trackingDot} />
              <Text style={styles.trackingText}>{t("providerRequests.liveTrackingActive", "Live Tracking Active")}</Text>
            </View>
          )}
          <Text style={styles.requestNumber}>#{request?.requestNumber}</Text>
        </View>
      </View>
    );

  const renderCustomerInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("providerRequests.customerInfo", "Customer Information")}</Text>
      <View style={styles.customerCard}>
        <View style={styles.customerHeader}>
          <Image
            source={{
              uri: request?.customerImage || "https://via.placeholder.com/60",
            }}
            style={styles.customerImage}
          />
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{request?.customerName}</Text>
            <View style={styles.customerRating}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={styles.ratingText}>4.8</Text>
              <Text style={styles.reviewCount}>(127 {t("providerProfile.reviews", "reviews")})</Text>
            </View>
          </View>
        </View>

        <View style={styles.contactButtons}>
          <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
            <Ionicons name="call" size={20} color={colors.primary} />
            <Text style={styles.contactButtonText}>{t("providerRequests.call", "Call")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton} onPress={handleMessage}>
            <Ionicons name="chatbubble" size={20} color={colors.primary} />
            <Text style={styles.contactButtonText}>{t("providerRequests.message", "Message")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderServiceDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("providerRequests.serviceDetails", "Service Details")}</Text>
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Ionicons name="construct-outline" size={20} color={colors.primary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>{t("requests.service", "Service")}</Text>
            <Text style={styles.detailValue}>{request?.serviceName}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>{t("requests.dateTime", "Date & Time")}</Text>
            <Text style={styles.detailValue}>{request?.scheduledDate} at {request?.scheduledTime}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>{t("providerRequests.estimatedDuration", "Estimated Duration")}</Text>
            <Text style={styles.detailValue}>{request?.estimatedDuration} {t("providerRequests.minutes", "minutes")}</Text>
          </View>
        </View>
        {request?.description && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t("common.description", "Description")}</Text>
              <Text style={styles.detailValue}>{request.description}</Text>
            </View>
          </View>
        )}
        {request?.specialInstructions && (
          <View style={styles.detailRow}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>{t("requests.specialInstructions", "Special Instructions")}</Text>
              <Text style={[styles.detailValue, styles.instructionsText]}>{request.specialInstructions}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderLocation = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("providerRequests.serviceLocation", "Service Location")}</Text>
      <View style={styles.locationCard}>
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={styles.addressText}>{request?.customerAddress}</Text>
        </View>
        {request?.distance && (
          <View style={styles.distanceContainer}>
            <View style={styles.distanceItem}>
              <Ionicons name="navigate-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.distanceText}>{request.distance.toFixed(1)} {t("providerRequests.away", "km away")}</Text>
            </View>
            <View style={styles.distanceItem}>
              <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.distanceText}>~{request.travelTime} {t("providerRequests.minDrive", "min drive")}</Text>
            </View>
          </View>
        )}

        {mapRegion && (
          <TouchableOpacity
            style={styles.mapPreview}
            onPress={() => setShowDirections(true)}
          >
            <Map
              center={[mapRegion.latitude, mapRegion.longitude]}
              userLocation={request ? {
                latitude: request.customerLatitude,
                longitude: request.customerLongitude
              } : null}
              providers={[]}
              onProviderSelect={() => { }}
              style={{ height: 150, width: '100%' }}
              markers={[
                {
                  position: [mapRegion.latitude, mapRegion.longitude],
                  title: request?.customerName || t("providerRequests.serviceLocation", "Customer Location"),
                  description: request?.customerAddress,
                }
              ]}
            />
            <View style={styles.mapOverlay}>
              <Ionicons name="expand-outline" size={20} color={colors.surface} />
              <Text style={styles.mapOverlayText}>{t("providerRequests.viewOnMap", "View on map")}</Text>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.directionsButton} onPress={handleOpenMaps}>
          <Ionicons name="navigate" size={20} color={colors.surface} />
          <Text style={styles.directionsButtonText}>{t("providerRequests.startNavigation", "Start Navigation")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPayment = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("requests.paymentDetails", "Payment Details")}</Text>
      <View style={styles.paymentCard}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>{t("providerRequests.estimatedPrice", "Estimated Price")}</Text>
          <PriceText style={styles.priceValue} amount={request?.estimatedPrice || 0} />
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>{t("providerRequests.serviceFee", "Service Fee")}</Text>
          <PriceText style={styles.priceValue} amount={(request?.estimatedPrice || 0) * 0.05} />
        </View>

        <View style={styles.priceDivider} />

        <View style={styles.priceRow}>
          <Text style={styles.totalLabel}>{t("providerRequests.yourEarnings", "Your Earnings")}</Text>
          <PriceText style={styles.totalValue} amount={(request?.estimatedPrice || 0) * 0.95} />
        </View>

        {(request?.status === "completed" || request?.status === "waiting_customer_confirmation") && (
          <View style={styles.paymentStatus}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.paymentStatusText}>{t("providerRequests.paymentPendingCustomer", "Payment pending customer confirmation")}</Text>
          </View>
        )}
        {request?.status === "confirmed" && (
          <View style={styles.paymentStatus}>
            <Ionicons name="card-outline" size={20} color={colors.primary} />
            <Text style={[styles.paymentStatusText, { color: colors.primary }]}>{t("providerRequests.paymentHeld", "Payment Held - Ready to start")}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderTimeline = () => {
    const currentStep = getCurrentStep();

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("requests.progressTimeline", "Progress Timeline")}</Text>
        <View style={styles.timelineCard}>
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index <= currentStep;
            const isCurrent = index === currentStep;

            return (
              <View key={step.key} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotCompleted,
                      isCurrent && styles.timelineDotCurrent,
                    ]}
                  >
                    <Ionicons
                      name={step.icon as any}
                      size={14}
                      color={isCompleted ? colors.surface : colors.text.secondary}
                    />
                  </View>
                  {index < STATUS_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        isCompleted && styles.timelineLineCompleted,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineLabel,
                      isCompleted && styles.timelineLabelCompleted,
                    ]}
                  >
                    {step.label}
                  </Text>
                  {isCurrent && request?.status === "in_progress" && (
                    <Text style={styles.timelineTime}>
                      {t("providerRequests.startedAt", "Started at")}{" "}
                      {formatDateTime(request?.startedAt || new Date())}
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

  const renderActionButtons = () => {
    if (!request) return null;

    const isPending = request.status === "pending";
    const isAccepted = request.status === "accepted";
    const isConfirmed = request.status === "confirmed";
    const isArrived = request.status === "arrived";
    const isInProgress = request.status === "in_progress";
    const isWaitingConfirmation = request.status === "waiting_customer_confirmation";
    const isCompleted = request.status === "completed";
    const isCancelled = request.status === "cancelled";

    if (isCancelled) return null;

    return (
      <View style={styles.actionButtonsContainer}>
        {isPending && (
          <>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
              <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
              <Text style={styles.acceptButtonText}>{t("providerRequests.accept", "Accept Request")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton} onPress={() => setShowActionModal(true)}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
              <Text style={styles.rejectButtonText}>{t("providerRequests.reject", "Reject")}</Text>
            </TouchableOpacity>
          </>
        )}
        {(isConfirmed || isAccepted) && (
          <View style={styles.confirmedActions}>
            <TouchableOpacity style={styles.rescheduleButton} onPress={() => setShowScheduleModal(true)}>
              <Ionicons name="calendar" size={20} color={colors.warning} />
              <Text style={styles.rescheduleButtonText}>{t("providerRequests.reschedule", "Reschedule")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.arriveButton} onPress={handleArrive}>
              <Ionicons name="pin" size={20} color={colors.surface} />
              <Text style={styles.arriveButtonText}>{t("providerRequests.markArrived", "Mark Arrived")}</Text>
            </TouchableOpacity>
          </View>
        )}
        {isArrived && (
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Ionicons name="play-circle" size={20} color={colors.surface} />
            <Text style={styles.startButtonText}>{t("providerRequests.startServiceBtn", "Start Service")}</Text>
          </TouchableOpacity>
        )}
        {isInProgress && (
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Ionicons name="checkmark-done-circle" size={20} color={colors.surface} />
            <Text style={styles.completeButtonText}>{t("providerRequests.completeServiceBtn", "Complete Service")}</Text>
          </TouchableOpacity>
        )}
        {isWaitingConfirmation && (
          <View style={[styles.completedMessage, { backgroundColor: colors.info + '10' }]}>
            <Ionicons name="time-outline" size={24} color={colors.info} />
            <Text style={[styles.completedText, { color: colors.info }]}>
              {t("providerRequests.waitCustomerConfirm", "Service marked as complete. Waiting for customer to confirm and release payment.")}
            </Text>
          </View>
        )}
        {isCompleted && (
          <View style={styles.completedMessage}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.completedText}>{t("providerRequests.completeSuccessMsg", "Service completed successfully. Payment has been processed.")}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderActionModal = () => (
    <Modal
      visible={showActionModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowActionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("providerRequests.rejectRequest", "Reject Request")}</Text>
            <TouchableOpacity onPress={() => setShowActionModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>{t("providerRequests.reasonForRejection", "Reason for rejection")}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("providerRequests.provideReason", "Please provide a reason...")}
              placeholderTextColor={colors.text.secondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowActionModal(false);
                  setRejectReason("");
                }}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel", "Cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !rejectReason.trim() && styles.modalButtonDisabled,
                ]}
                onPress={handleReject}
                disabled={!rejectReason.trim()}
              >
                <Text style={styles.modalConfirmText}>{t("providerRequests.rejectRequest", "Reject Request")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const renderScheduleModal = () => (
    <Modal
      visible={showScheduleModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowScheduleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("providerRequests.rescheduleService", "Reschedule Service")}</Text>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>{t("providerRequests.newDate", "New Date")}</Text>
            <TouchableOpacity style={styles.modalPicker}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={styles.modalPickerText}>{rescheduleDate || t("providerRequests.selectDate", "Select date")}</Text>
            </TouchableOpacity>
            <Text style={styles.modalLabel}>{t("providerRequests.newTime", "New Time")}</Text>
            <TouchableOpacity style={styles.modalPicker}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.modalPickerText}>{rescheduleTime || t("providerRequests.selectTime", "Select time")}</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowScheduleModal(false);
                  setRescheduleDate("");
                  setRescheduleTime("");
                }}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel", "Cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  (!rescheduleDate || !rescheduleTime) &&
                  styles.modalButtonDisabled,
                ]}
                onPress={handleReschedule}
                disabled={!rescheduleDate || !rescheduleTime}
              >
                <Text style={styles.modalConfirmText}>{t("providerRequests.reschedule", "Confirm Reschedule")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDirectionsModal = () => (
    <Modal
      visible={showDirections}
      animationType="slide"
      onRequestClose={() => setShowDirections(false)}
    >
      <View style={styles.fullScreenModal}>
        <View
          style={[
            styles.directionsHeader,
            { paddingTop: Math.max(insets.top + 16, 32) },
          ]}
        >
          <TouchableOpacity onPress={() => setShowDirections(false)}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.directionsTitle}>{t("providerRequests.serviceLocation", "Customer Location")}</Text>
          <TouchableOpacity onPress={handleOpenMaps}>
            <Ionicons name="navigate" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {mapRegion && (
          <Map
            center={[mapRegion.latitude, mapRegion.longitude]}
            userLocation={request ? {
              latitude: request.customerLatitude,
              longitude: request.customerLongitude
            } : null}
            providers={[]}
            onProviderSelect={() => { }}
            style={{ flex: 1, height: '100%', width: '100%' }}
            markers={[
              {
                position: [mapRegion.latitude, mapRegion.longitude],
                title: request?.customerName || 'Customer Location',
                description: request?.customerAddress,
              }
            ]}
          />
        )}

        <View style={styles.directionsFooter}>
          <View style={styles.destinationInfo}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={styles.destinationAddress}>{request?.customerAddress}</Text>
          </View>
          {request?.distance && (
            <View style={styles.distanceInfo}>
              <View style={styles.distanceDetail}>
                <Ionicons name="navigate-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.distanceDetailText}>{request.distance.toFixed(1)} km</Text>
              </View>
              <View style={styles.distanceDetail}>
                <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.distanceDetailText}>~{request.travelTime} min</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if ((isRequestLoading || isPendingLoading) && !refreshing && !request) {
    return <LoadingSpinner fullScreen />;
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorText}>Request not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderHeader()}
        {renderCustomerInfo()}
        {renderServiceDetails()}
        {renderLocation()}
        {renderPayment()}
        {renderTimeline()}
        {renderActionButtons()}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderActionModal()}
      {renderScheduleModal()}
      {renderDirectionsModal()}
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingBottom: 16,
    borderBottomWidth: 3,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
  },
  menuButton: {
    padding: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  trackingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  trackingText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  requestNumber: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  section: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 12,
  },
  customerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  customerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 4,
  },
  customerRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
    color: colors.text.secondary,
  },
  contactButtons: {
    flexDirection: "row",
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "10",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text.primary,
  },
  instructionsText: {
    color: colors.warning,
    fontStyle: "italic",
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  distanceContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 16,
  },
  distanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  mapPreview: {
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: colors.primary + "CC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  mapOverlayText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "500",
  },
  markerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 4,
  },
  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  directionsButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  priceValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: "500",
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
  },
  paymentStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.success + "10",
    borderRadius: 12,
    gap: 8,
  },
  paymentStatusText: {
    flex: 1,
    fontSize: 13,
    color: colors.success,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 50,
  },
  timelineLeft: {
    width: 30,
    alignItems: "center",
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  timelineDotCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  timelineDotCurrent: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  timelineLine: {
    position: "absolute",
    top: 26,
    width: 2,
    height: 40,
    backgroundColor: colors.border,
  },
  timelineLineCompleted: {
    backgroundColor: colors.success,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 20,
  },
  timelineLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  timelineLabelCompleted: {
    color: colors.text.primary,
    fontWeight: "500",
  },
  timelineTime: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  actionButtonsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  acceptButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error + "10",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + "30",
    gap: 8,
  },
  rejectButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: "600",
  },
  confirmedActions: {
    flexDirection: "row",
    gap: 12,
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warning + "10",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning + "30",
    gap: 8,
  },
  rescheduleButtonText: {
    color: colors.warning,
    fontSize: 15,
    fontWeight: "600",
  },
  startButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "600",
  },
  arriveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  arriveButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "600",
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  completedMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success + "10",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  completedText: {
    flex: 1,
    fontSize: 14,
    color: colors.success,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
  },
  modalBody: {
    gap: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalPicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  modalPickerText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 14,
    color: colors.surface,
    fontWeight: "600",
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  directionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  directionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
  },
  fullScreenMap: {
    flex: 1,
  },
  directionsFooter: {
    backgroundColor: colors.surface,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  destinationInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 8,
  },
  destinationAddress: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  distanceInfo: {
    flexDirection: "row",
    gap: 16,
  },
  distanceDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceDetailText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  errorButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 40,
  },
});
