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
import { Colors } from "../constants/Colors";
import { useProviderRequests, useProviderQueries } from "../../hooks/useProviderQueries";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { formatCurrency, formatTimeAgo } from "../utils/formatters";
import type { ServiceRequest } from "../types/provider.types";

export default function ScheduleScreen() {
  const router = useRouter();
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
  // Only show Confirmed, In Progress, and Accepted jobs
  const scheduleData = useMemo(() => {
    const validStatuses = ["confirmed", "accepted", "in_progress"];
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
    Alert.alert("Complete Service", "Have you finished this service?", [
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
    ]);
  };

  const renderRequestItem = ({ item }: { item: ServiceRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => router.push(`/(provider)/requests/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.timeSection}>
        <Text style={styles.timeText}>{item.scheduledTime || "N/A"}</Text>
        <View style={[styles.statusLine, { backgroundColor: getStatusColor(item.status) }]} />
      </View>

      <View style={styles.contentSection}>
        <View style={styles.cardHeader}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.replace("_", " ")}
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
                <Text style={styles.actionButtonText}>Start</Text>
              </TouchableOpacity>
            )}
            {item.status === "in_progress" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => handleComplete(item)}
              >
                <Text style={styles.actionButtonText}>Complete</Text>
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
              <Text style={styles.jobCountText}>{item.data.length} jobs</Text>
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
            title="Your schedule is clear"
            message="You have no confirmed or upcoming jobs at the moment."
            actionLabel="View Requests"
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
