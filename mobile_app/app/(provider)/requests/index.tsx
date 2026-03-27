// app/(provider)/requests/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { EmptyState } from "../../../components/common/EmptyState";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { useProviderQueries, useProviderRequests } from "../../../hooks/useProviderQueries";
import { Colors } from "../../constants/Colors";
import type { ServiceRequest } from "../../types/provider.types";
import { formatCurrency, formatTimeAgo } from "../../utils/formatters";
import { ScheduleModal } from "../components/ScheduleModal";

type FilterType =
  | "all"
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

const FILTERS: {
  label: string;
  value: FilterType;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: "All", value: "all", icon: "apps-outline" },
  { label: "Pending", value: "pending", icon: "time-outline" },
  { label: "Confirmed", value: "confirmed", icon: "checkmark-circle-outline" },
  { label: "In Progress", value: "in_progress", icon: "construct-outline" },
  { label: "Completed", value: "completed", icon: "checkmark-done-outline" },
  { label: "Cancelled", value: "cancelled", icon: "close-circle-outline" },
];

const STATUS_COLORS = {
  pending: Colors.warning,
  accepted: Colors.info,
  confirmed: Colors.primary,
  arrived: Colors.primary,
  in_progress: Colors.info,
  waiting_customer_confirmation: Colors.warning,
  completed: Colors.success,
  cancelled: Colors.error,
  disputed: Colors.error,
};

const STATUS_ICONS = {
  pending: "time-outline",
  accepted: "checkmark-circle-outline",
  confirmed: "card-outline",
  arrived: "navigate-outline",
  in_progress: "construct-outline",
  waiting_customer_confirmation: "hourglass-outline",
  completed: "checkmark-done-outline",
  cancelled: "close-circle-outline",
  disputed: "alert-circle-outline",
};

export default function ProviderRequests() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [actionModalConfig, setActionModalConfig] = useState<{
    type: "reject" | "reschedule";
    request: ServiceRequest;
  } | null>(null);
  const [isActionModalLoading, setIsActionModalLoading] = useState(false);

  // Use useProviderRequests which fetches all statuses from the API
  const {
    data: allRequests = [],
    isLoading: isPendingLoading,
    refetch,
  } = useProviderRequests(activeFilter === 'all' ? undefined : activeFilter as any);

  const {
    acceptRequest = { mutateAsync: async () => {}, isPending: false },
    rejectRequest = { mutateAsync: async () => {}, isPending: false },
    rescheduleRequest = { mutateAsync: async () => {}, isPending: false },
    startService = { mutateAsync: async () => {}, isPending: false },
    completeService = { mutateAsync: async () => {}, isPending: false },
  } = useProviderQueries();

  const requests = allRequests;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getFilteredRequests = () => {
    let filtered = requests || [];

    // Apply status filter
    if (activeFilter !== "all") {
      filtered = filtered.filter((r) => r.status === activeFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.customerName?.toLowerCase().includes(query) ||
          r.serviceName?.toLowerCase().includes(query) ||
          r.requestNumber?.toLowerCase().includes(query) ||
          r.customerAddress?.toLowerCase().includes(query),
      );
    }

    return filtered;
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

  const openActionModal = (request: ServiceRequest, type: "reject" | "reschedule") => {
    setActionModalConfig({ request, type });
  };

  const handleRequestAction = (request: ServiceRequest, action: string) => {
    switch (action) {
      case "accept":
        handleAccept(request);
        break;
      case "reject":
        openActionModal(request, "reject");
        break;
      case "reschedule":
        openActionModal(request, "reschedule");
        break;
      case "start":
        handleStart(request);
        break;
      case "complete":
        handleComplete(request);
        break;
      case "directions":
        router.push(`/(provider)/requests/${request.id}/directions`);
        break;
    }
  };

  const handleAccept = async (request: ServiceRequest) => {
    Alert.alert(
      "Accept Request",
      "Are you sure you want to accept this request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              await acceptRequest.mutateAsync(request.id);
              Alert.alert("Success", "Request accepted successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to accept request");
            }
          },
        },
      ],
    );
  };

  const closeActionModal = () => {
    setIsActionModalLoading(false);
    setActionModalConfig(null);
  };

  const handleActionModalConfirm = async (
    date: string,
    time: string,
    reason?: string,
  ) => {
    if (!actionModalConfig) return;

    setIsActionModalLoading(true);

    try {
      if (actionModalConfig.type === "reject") {
        await rejectRequest.mutateAsync({
          id: actionModalConfig.request.id,
          reason: reason?.trim() || "Rejected by provider",
        });
      } else {
        await rescheduleRequest.mutateAsync({
          id: actionModalConfig.request.id,
          data: {
            scheduledDate: date,
            scheduledTime: time,
          },
        });
      }
      closeActionModal();
    } catch (error) {
      // mutations already handle errors
    } finally {
      setIsActionModalLoading(false);
    }
  };

  const handleStart = async (request: ServiceRequest) => {
    Alert.alert("Start Service", "Are you ready to start this service?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start",
        onPress: async () => {
          try {
            await startService.mutateAsync(request.id);
            Alert.alert("Success", "Service started");
          } catch (error) {
            Alert.alert("Error", "Failed to start service");
          }
        },
      },
    ]);
  };

  const handleComplete = async (request: ServiceRequest) => {
    Alert.alert(
      "Complete Service",
      "Have you completed this service to the customer's satisfaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              await completeService.mutateAsync(request.id);
              Alert.alert("Success", "Service completed");
            } catch (error) {
              Alert.alert("Error", "Failed to complete service");
            }
          },
        },
      ],
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Requests</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={Colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color={Colors.text.secondary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer or service..."
          placeholderTextColor={Colors.text.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={18}
              color={Colors.text.secondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <FlatList
        horizontal
        data={FILTERS}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === item.value && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(item.value)}
          >
            <Ionicons
              name={item.icon}
              size={14}
              color={
                activeFilter === item.value
                  ? Colors.surface
                  : Colors.text.secondary
              }
            />
            <Text
              style={[
                styles.filterChipText,
                activeFilter === item.value && styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      />
    </View>
  );

  const renderRequestCard = ({ item }: { item: ServiceRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => router.push(`/(provider)/requests/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <Image
            source={{
              uri: item.customerImage || "https://via.placeholder.com/40",
            }}
            style={styles.customerImage}
          />
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{item.customerName || ""}</Text>
            <Text style={styles.requestNumber}>
              #{item.requestNumber || ""}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {item.payment && (item.status === 'confirmed' || item.payment.status === 'held' || item.payment.status === 'paid') && (
            <View style={[styles.statusBadge, { backgroundColor: Colors.success + '20' }]}>
              <Ionicons name="card" size={12} color={Colors.success} />
              <Text style={[styles.statusText, { color: Colors.success }]}>PAID</Text>
            </View>
          )}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
          >
            <Ionicons
              name={getStatusIcon(item.status) as any}
              size={12}
              color={getStatusColor(item.status)}
            />
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {(item.status || "").replace("_", " ")}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{item.serviceName || ""}</Text>
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>
            {formatCurrency(item.estimatedPrice || 0)}
          </Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={Colors.text.secondary}
          />
          <Text style={styles.detailText}>
            {item.scheduledDate || ""} at {item.scheduledTime || ""}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="location-outline"
            size={14}
            color={Colors.text.secondary}
          />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.customerAddress || ""}
          </Text>
        </View>

        {item.distance && (
          <View style={styles.detailRow}>
            <Ionicons
              name="navigate-outline"
              size={14}
              color={Colors.text.secondary}
            />
            <Text style={styles.detailText}>
              {(item.distance || 0).toFixed(1)} km • {item.travelTime || 0} min
              drive
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.timeAgo}>
          {formatTimeAgo(item.createdAt || new Date().toISOString())}
        </Text>

        <View style={styles.actionButtons}>
          {item.status === "pending" && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleRequestAction(item, "accept")}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRequestAction(item, "reject")}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === "confirmed" && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.rescheduleButton]}
                onPress={() => handleRequestAction(item, "reschedule")}
              >
                <Text style={styles.rescheduleButtonText}>Reschedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.directionsButton]}
                onPress={() => handleRequestAction(item, "directions")}
              >
                <Ionicons name="navigate" size={14} color={Colors.surface} />
                <Text style={styles.directionsButtonText}>Go</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === "in_progress" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleRequestAction(item, "complete")}
            >
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Requests</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.filterSectionTitle}>Status</Text>
            <View style={styles.filterOptions}>
              {FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterOption,
                    activeFilter === filter.value && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setActiveFilter(filter.value);
                    setShowFilterModal(false);
                  }}
                >
                  <Ionicons
                    name={filter.icon}
                    size={18}
                    color={
                      activeFilter === filter.value
                        ? Colors.primary
                        : Colors.text.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.filterOptionText,
                      activeFilter === filter.value &&
                        styles.filterOptionTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const filteredRequests = getFilteredRequests();

  if (isPendingLoading && !refreshing) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        data={filteredRequests}
        renderItem={renderRequestCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No requests found"
            message={
              searchQuery
                ? "Try adjusting your search"
                : `You have no ${activeFilter} requests`
            }
            actionLabel={searchQuery ? "Clear Search" : undefined}
            onAction={searchQuery ? () => setSearchQuery("") : undefined}
          />
        }
        ListFooterComponent={<View style={styles.bottomPadding} />}
      />

      <ScheduleModal
        visible={Boolean(actionModalConfig)}
        type={actionModalConfig?.type ?? "reschedule"}
        request={actionModalConfig?.request ?? null}
        isLoading={isActionModalLoading}
        onClose={closeActionModal}
        onConfirm={handleActionModalConfirm}
      />

      {renderFilterModal()}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  filterButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: Colors.text.primary,
    padding: 0,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: Colors.surface,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  requestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  customerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  requestNumber: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  serviceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  priceTag: {
    backgroundColor: Colors.primary + "10",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeAgo: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  acceptButton: {
    backgroundColor: Colors.success + "10",
    borderWidth: 1,
    borderColor: Colors.success + "30",
  },
  acceptButtonText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: "600",
  },
  rejectButton: {
    backgroundColor: Colors.error + "10",
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  rejectButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "600",
  },
  rescheduleButton: {
    backgroundColor: Colors.warning + "10",
    borderWidth: 1,
    borderColor: Colors.warning + "30",
  },
  rescheduleButtonText: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: "600",
  },
  directionsButton: {
    backgroundColor: Colors.primary,
  },
  directionsButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: Colors.success,
  },
  completeButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: "600",
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
    maxHeight: "80%",
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
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 16,
  },
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  filterOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  filterOptionText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  filterOptionTextActive: {
    color: Colors.primary,
    fontWeight: "500",
  },
  bottomPadding: {
    height: 40,
  },
});


