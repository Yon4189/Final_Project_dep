// app/(provider)/schedule.tsx
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Colors } from "../constants/Colors";
import { useProviderRequests, useProviderQueries } from "../../hooks/useProviderQueries";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { formatCurrency, formatTimeAgo } from "../utils/formatters";
import type { ServiceRequest } from "../types/provider.types";

export default function ScheduleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all requests to filter for the schedule
  const {
    data: allRequests = [],
    isLoading,
    refetch,
  } = useProviderRequests();

  const {
    startService = { mutateAsync: async () => { }, isPending: false },
    completeService = { mutateAsync: async () => { }, isPending: false },
  } = useProviderQueries();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter and group requests by date
  // Show all active jobs: accepted, arrived, in_progress, waiting confirmation
  const scheduleData = useMemo(() => {
    const validStatuses = ["accepted", "arrived", "in_progress", "waiting_customer_confirmation", "service_confirmed"];
    const filtered = allRequests.filter((r) => validStatuses.includes(r.status));

    // Group by date
    const groups: { [key: string]: ServiceRequest[] } = {};
    filtered.forEach((r) => {
      const date = r.scheduledDate || "Unknown Date";
      if (!groups[date]) groups[date] = [];
      groups[date].push(r);
    });

    // Convert to array and sort by date
    return Object.keys(groups)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((date) => ({
        date,
        data: groups[date].sort((a, b) => {
          // Sort by time within the same date
          return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
        }),
      }));
  }, [allRequests]);

  const handleStart = async (request: ServiceRequest) => {
    Alert.alert(
      t("providerRequests.startConfirmTitle", "Start Service"),
      t("providerRequests.startConfirmMsg", "Are you ready to start this service?"),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("common.start", "Start"),
          onPress: async () => {
            try {
              await startService.mutateAsync(request.id);
              Alert.alert(t("common.success", "Success"), t("providerRequests.startSuccess", "Service started"));
            } catch (error) {
              Alert.alert(t("common.error", "Error"), t("providerRequests.startError", "Failed to start service"));
            }
          },
        },
      ],
    );
  };

  const handleComplete = async (request: ServiceRequest) => {
    Alert.alert(
      t("providerRequests.completeConfirmTitle", "Complete Service"),
      t("providerRequests.completeConfirmMsg", "Have you finished this service?"),
      [
        { text: t("common.cancel", "Cancel"), style: "cancel" },
        {
          text: t("providerRequests.complete", "Complete"),
          onPress: async () => {
            try {
              await completeService.mutateAsync(request.id);
              Alert.alert(t("common.success", "Success"), t("providerRequests.completeSuccess", "Service completed"));
            } catch (error) {
              Alert.alert(t("common.error", "Error"), t("providerRequests.completeError", "Failed to complete service"));
            }
          },
        },
      ],
    );
  };

  const renderRequestItem = ({ item }: { item: ServiceRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => router.push(`/(provider)/requests/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.timeSection}>
        <Text style={styles.timeText}>{item.scheduledTime || t("common.na", "N/A")}</Text>
        <View style={[styles.statusLine, { backgroundColor: getStatusColor(item.status) }]} />
      </View>

      <View style={styles.contentSection}>
        <View style={styles.cardHeader}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {t(`bookings.status.${item.status.toLowerCase()}`, item.status.replace("_", " "))}
            </Text>
          </View>
        </View>

        <Text style={styles.serviceName}>{item.serviceName}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.customerAddress}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>{formatCurrency(item.estimatedPrice)}</Text>

          <View style={styles.actions}>
            {item.status === "confirmed" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={() => handleStart(item)}
              >
                <Text style={styles.actionButtonText}>{t("common.start", "Start")}</Text>
              </TouchableOpacity>
            )}
            {item.status === "in_progress" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => handleComplete(item)}
              >
                <Text style={styles.actionButtonText}>{t("providerRequests.complete", "Complete")}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return Colors.primary;
      case "in_progress": return Colors.info;
      case "accepted": return Colors.success;
      default: return Colors.text.secondary;
    }
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={scheduleData}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <View style={styles.dateGroup}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{item.date}</Text>
              <Text style={styles.jobCountText}>{t("providerRequests.jobsCount", { count: item.data.length, defaultValue: `${item.data.length} jobs` })}</Text>
            </View>
            {item.data.map((request) => (
              <React.Fragment key={request.id}>
                {renderRequestItem({ item: request })}
              </React.Fragment>
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={t("providerRequests.scheduleClear", "Your schedule is clear")}
            message={t("providerRequests.noUpcomingJobs", "You have no confirmed or upcoming jobs at the moment.")}
            actionLabel={t("providerRequests.viewRequests", "View Requests")}
            onAction={() => router.push("/(provider)/requests")}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  jobCountText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  requestCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeSection: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    paddingVertical: 16,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  statusLine: {
    width: 4,
    height: 30,
    borderRadius: 2,
  },
  contentSection: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  serviceName: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.primary,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: Colors.primary,
  },
  completeButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: "600",
  },
});
