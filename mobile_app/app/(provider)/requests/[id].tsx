// app/(provider)/requests/[id].tsx
import { Colors } from "@/app/constants/Colors";
import {
  formatCurrency,
  formatDateTime
} from "@/app/utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
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
import Map from "../../../components/Map/index";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { useProviderQueries, useProviderRequest } from "../../../hooks/useProviderQueries";
import { api } from "@/app/services/api";

const STATUS_COLORS = {
  pending: Colors.warning,
  accepted: Colors.primary,
  confirmed: Colors.primary,
  in_progress: Colors.info,
  completed: Colors.success,
  cancelled: Colors.error,
};

const STATUS_ICONS = {
  pending: "time-outline",
  accepted: "checkmark-circle-outline",
  confirmed: "checkmark-circle-outline",
  in_progress: "construct-outline",
  completed: "checkmark-done-outline",
  cancelled: "close-circle-outline",
};

const STATUS_STEPS = [
  { key: "pending", label: "Request Received", icon: "mail-outline" },
  { key: "accepted", label: "Accepted", icon: "checkmark-circle-outline" },
  { key: "confirmed", label: "Confirmed", icon: "checkmark-circle-outline" },
  { key: "in_progress", label: "In Progress", icon: "construct-outline" },
  { key: "completed", label: "Completed", icon: "checkmark-done-outline" },
];

export default function RequestDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
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
    startService,
    completeService,
  } = useProviderQueries();

  // Use the data from useProviderRequest
  useEffect(() => {
    if (requestData) {
      setRequest(requestData);
    }
  }, [requestData]);

  useEffect(() => {
    if (request?.customerLatitude && request?.customerLongitude) {
      setMapRegion({
        latitude: request.customerLatitude,
        longitude: request.customerLongitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [request]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchRequest(), refetchQueries()]);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    return (
      STATUS_COLORS[status as keyof typeof STATUS_COLORS] ||
      Colors.text.secondary
    );
  };

  const getStatusIcon = (status: string) => {
    return STATUS_ICONS[status as keyof typeof STATUS_ICONS] || "help-outline";
  };

  const getCurrentStep = () => {
    if (!request) return 0;
    const statusIndex = STATUS_STEPS.findIndex(
      (step) => step.key === request.status,
    );
    return statusIndex >= 0 ? statusIndex : 0;
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
    if (request?.customerLatitude && request?.customerLongitude) {
      const scheme = Platform.select({
        ios: "maps:0,0?q=",
        android: "geo:0,0?q=",
      });
      const url = Platform.select({
        ios: `${scheme}${request.customerLatitude},${request.customerLongitude}`,
        android: `${scheme}${request.customerLatitude},${request.customerLongitude}`,
      });
      if (url) {
        Linking.openURL(url);
      }
    }
  };

  const handleAccept = () => {
    Alert.alert(
      "Accept Request",
      "Are you sure you want to accept this request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
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
      Alert.alert("Error", "Please provide a reason");
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
      Alert.alert("Error", "Please select new date and time");
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
      Alert.alert("Success", "Request rescheduled");
    } catch (error) {
      Alert.alert("Error", "Failed to reschedule request");
    }
  };

  const handleStart = () => {
    Alert.alert("Start Service", "Are you ready to start this service?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start",
        onPress: async () => {
          try {
            await startService.mutateAsync(id as string);
            Alert.alert("Success", "Service started");
          } catch (error) {
            Alert.alert("Error", "Failed to start service");
          }
        },
      },
    ]);
  };

  const handleComplete = () => {
    Alert.alert(
      "Complete Service",
      "Have you completed this service to the customer's satisfaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              await completeService.mutateAsync(id as string);
              Alert.alert(
                "Success",
                "Service completed. Payment will be released after customer confirmation.",
              );
            } catch (error) {
              Alert.alert("Error", "Failed to complete service");
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
        { borderBottomColor: getStatusColor(request?.status || "pending") },
      ]}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowActionModal(true)}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={22}
            color={Colors.text.primary}
          />
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
          <Ionicons
            name={getStatusIcon(request?.status || "pending") as any}
            size={18}
            color={getStatusColor(request?.status || "pending")}
          />
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(request?.status || "pending") },
            ]}
          >
            {request?.status?.replace("_", " ").toUpperCase()}
          </Text>
        </View>
        <Text style={styles.requestNumber}>#{request?.requestNumber}</Text>
      </View>
    </View>
  );

  const renderCustomerInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Customer Information</Text>
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
              <Ionicons name="star" size={14} color={Colors.warning} />
              <Text style={styles.ratingText}>4.8</Text>
              <Text style={styles.reviewCount}>(127 reviews)</Text>
            </View>
          </View>
        </View>

        <View style={styles.contactButtons}>
          <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
            <Ionicons name="call" size={20} color={Colors.primary} />
            <Text style={styles.contactButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleMessage}
          >
            <Ionicons name="chatbubble" size={20} color={Colors.primary} />
            <Text style={styles.contactButtonText}>Message</Text>
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
            <Text style={styles.detailValue}>{request?.serviceName}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {request?.scheduledDate} at {request?.scheduledTime}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={20} color={Colors.primary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Estimated Duration</Text>
            <Text style={styles.detailValue}>
              {request?.estimatedDuration} minutes
            </Text>
          </View>
        </View>

        {request?.description && (
          <View style={styles.detailRow}>
            <Ionicons
              name="document-text-outline"
              size={20}
              color={Colors.primary}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{request.description}</Text>
            </View>
          </View>
        )}

        {request?.specialInstructions && (
          <View style={styles.detailRow}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={Colors.warning}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Special Instructions</Text>
              <Text style={[styles.detailValue, styles.instructionsText]}>
                {request.specialInstructions}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderLocation = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Service Location</Text>
      <View style={styles.locationCard}>
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={20} color={Colors.primary} />
          <Text style={styles.addressText}>{request?.customerAddress}</Text>
        </View>

        {request?.distance && (
          <View style={styles.distanceContainer}>
            <View style={styles.distanceItem}>
              <Ionicons
                name="navigate-outline"
                size={16}
                color={Colors.text.secondary}
              />
              <Text style={styles.distanceText}>
                {request.distance.toFixed(1)} km away
              </Text>
            </View>
            <View style={styles.distanceItem}>
              <Ionicons
                name="time-outline"
                size={16}
                color={Colors.text.secondary}
              />
              <Text style={styles.distanceText}>
                ~{request.travelTime} min drive
              </Text>
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
                  title: request?.customerName || 'Customer Location',
                  description: request?.customerAddress,
                }
              ]}
            />
            <View style={styles.mapOverlay}>
              <Ionicons
                name="expand-outline"
                size={20}
                color={Colors.surface}
              />
              <Text style={styles.mapOverlayText}>View on map</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.directionsButton}
          onPress={handleOpenMaps}
        >
          <Ionicons name="navigate" size={20} color={Colors.surface} />
          <Text style={styles.directionsButtonText}>Get Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPayment = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Details</Text>
      <View style={styles.paymentCard}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Estimated Price</Text>
          <Text style={styles.priceValue}>
            {formatCurrency(request?.estimatedPrice || 0)}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Service Fee</Text>
          <Text style={styles.priceValue}>
            -{formatCurrency((request?.estimatedPrice || 0) * 0.05)}
          </Text>
        </View>

        <View style={styles.priceDivider} />

        <View style={styles.priceRow}>
          <Text style={styles.totalLabel}>Your Earnings</Text>
          <Text style={styles.totalValue}>
            {formatCurrency((request?.estimatedPrice || 0) * 0.95)}
          </Text>
        </View>

        {request?.status === "completed" && (
          <View style={styles.paymentStatus}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={Colors.success}
            />
            <Text style={styles.paymentStatusText}>
              Payment pending customer confirmation
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
                      color={
                        isCompleted ? Colors.surface : Colors.text.secondary
                      }
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
                      Started at{" "}
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
    const isInProgress = request.status === "in_progress";
    const isCompleted = request.status === "completed";
    const isCancelled = request.status === "cancelled";

    if (isCancelled) return null;

    return (
      <View style={styles.actionButtonsContainer}>
        {isPending && (
          <>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.surface}
              />
              <Text style={styles.acceptButtonText}>Accept Request</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => setShowActionModal(true)}
            >
              <Ionicons name="close-circle" size={20} color={Colors.error} />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {(isConfirmed || isAccepted) && (
          <View style={styles.confirmedActions}>
            <TouchableOpacity
              style={styles.rescheduleButton}
              onPress={() => setShowScheduleModal(true)}
            >
              <Ionicons name="calendar" size={20} color={Colors.warning} />
              <Text style={styles.rescheduleButtonText}>Reschedule</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Ionicons name="play-circle" size={20} color={Colors.surface} />
              <Text style={styles.startButtonText}>Start Service</Text>
            </TouchableOpacity>
          </View>
        )}

        {isInProgress && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
          >
            <Ionicons
              name="checkmark-done-circle"
              size={20}
              color={Colors.surface}
            />
            <Text style={styles.completeButtonText}>Complete Service</Text>
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedMessage}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={Colors.success}
            />
            <Text style={styles.completedText}>
              Service completed. Payment will be released after customer
              confirmation.
            </Text>
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
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reject Request</Text>
            <TouchableOpacity onPress={() => setShowActionModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Reason for rejection</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Please provide a reason..."
              placeholderTextColor={Colors.text.secondary}
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
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !rejectReason.trim() && styles.modalButtonDisabled,
                ]}
                onPress={handleReject}
                disabled={!rejectReason.trim()}
              >
                <Text style={styles.modalConfirmText}>Reject Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
            <Text style={styles.modalTitle}>Reschedule Service</Text>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>New Date</Text>
            <TouchableOpacity style={styles.modalPicker}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.modalPickerText}>
                {rescheduleDate || "Select date"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.modalLabel}>New Time</Text>
            <TouchableOpacity style={styles.modalPicker}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <Text style={styles.modalPickerText}>
                {rescheduleTime || "Select time"}
              </Text>
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
                <Text style={styles.modalCancelText}>Cancel</Text>
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
                <Text style={styles.modalConfirmText}>Confirm Reschedule</Text>
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
        <View style={styles.directionsHeader}>
          <TouchableOpacity onPress={() => setShowDirections(false)}>
            <Ionicons name="close" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.directionsTitle}>Customer Location</Text>
          <TouchableOpacity onPress={handleOpenMaps}>
            <Ionicons name="navigate" size={24} color={Colors.primary} />
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
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.destinationAddress}>
              {request?.customerAddress}
            </Text>
          </View>

          {request?.distance && (
            <View style={styles.distanceInfo}>
              <View style={styles.distanceDetail}>
                <Ionicons
                  name="navigate-outline"
                  size={16}
                  color={Colors.text.secondary}
                />
                <Text style={styles.distanceDetailText}>
                  {request.distance.toFixed(1)} km
                </Text>
              </View>
              <View style={styles.distanceDetail}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={Colors.text.secondary}
                />
                <Text style={styles.distanceDetailText}>
                  ~{request.travelTime} min
                </Text>
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
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Request not found</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.back()}
        >
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
    color: Colors.text.primary,
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
    fontSize: 13,
    fontWeight: "600",
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
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 12,
  },
  customerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text.primary,
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
    color: Colors.text.primary,
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.text.secondary,
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
    backgroundColor: Colors.primary + "10",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  instructionsText: {
    color: Colors.warning,
    fontStyle: "italic",
  },
  locationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text.primary,
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
    color: Colors.text.secondary,
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
    backgroundColor: Colors.primary + "CC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  mapOverlayText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: "500",
  },
  markerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 4,
  },
  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  directionsButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  paymentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  priceValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: "500",
  },
  priceDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
  },
  paymentStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.success + "10",
    borderRadius: 12,
    gap: 8,
  },
  paymentStatusText: {
    flex: 1,
    fontSize: 13,
    color: Colors.success,
  },
  timelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  timelineDotCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  timelineDotCurrent: {
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  timelineLine: {
    position: "absolute",
    top: 26,
    width: 2,
    height: 40,
    backgroundColor: Colors.border,
  },
  timelineLineCompleted: {
    backgroundColor: Colors.success,
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
    fontWeight: "500",
  },
  timelineTime: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  actionButtonsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  acceptButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.error + "10",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error + "30",
    gap: 8,
  },
  rejectButtonText: {
    color: Colors.error,
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
    backgroundColor: Colors.warning + "10",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning + "30",
    gap: 8,
  },
  rescheduleButtonText: {
    color: Colors.warning,
    fontSize: 15,
    fontWeight: "600",
  },
  startButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: "600",
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  completedMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.success + "10",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  completedText: {
    flex: 1,
    fontSize: 14,
    color: Colors.success,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
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
    color: Colors.text.primary,
  },
  modalBody: {
    gap: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text.primary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text.primary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalPicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  modalPickerText: {
    fontSize: 14,
    color: Colors.text.primary,
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
    borderColor: Colors.border,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: "500",
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.error,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 14,
    color: Colors.surface,
    fontWeight: "600",
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  directionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  directionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  fullScreenMap: {
    flex: 1,
  },
  directionsFooter: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
    color: Colors.text.primary,
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
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  errorButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 40,
  },
});