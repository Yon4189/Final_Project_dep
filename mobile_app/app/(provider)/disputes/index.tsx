// app/(provider)/disputes/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useProviderDisputes } from '@/hooks/useProviderQueries';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { formatTimeAgo } from '@/app/utils/formatters';
import type { Dispute, DisputeStatus } from '@/app/types/provider.types';

const STATUS_COLORS: Record<DisputeStatus, string> = {
  pending: Colors.warning,
  under_review: Colors.info || Colors.primary, // Fallback if Colors.info doesn't exist
  resolved: Colors.success,
  rejected: Colors.error,
};

const STATUS_ICONS: Record<DisputeStatus, keyof typeof Ionicons.glyphMap> = {
  pending: 'time-outline',
  under_review: 'eye-outline',
  resolved: 'checkmark-circle-outline',
  rejected: 'close-circle-outline',
};

const STATUS_LABELS: Record<DisputeStatus, string> = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

export default function DisputesList() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<DisputeStatus | 'all'>('all');

 const { data: disputes, isLoading, refetch } = useProviderDisputes();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getFilteredDisputes = () => {
    if (!disputes) return [];
    if (filterStatus === 'all') return disputes;
    return disputes.filter(d => d.status === filterStatus);
  };

  const getStatusColor = (status: DisputeStatus): string => {
    return STATUS_COLORS[status] || Colors.text.secondary;
  };

  const getStatusIcon = (status: DisputeStatus): keyof typeof Ionicons.glyphMap => {
    return STATUS_ICONS[status] || 'help-outline';
  };

  const getStatusLabel = (status: DisputeStatus): string => {
    return STATUS_LABELS[status] || status;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disputes</Text>
        <TouchableOpacity 
          style={styles.newButton}
          onPress={() => router.push('/(provider)/disputes/new')}
        >
          <Ionicons name="add" size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <Text style={styles.headerSubtitle}>
        Track and manage disputes with customers
      </Text>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{disputes?.length || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.warning }]}>
            {disputes?.filter(d => d.status === 'pending').length || 0}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.success }]}>
            {disputes?.filter(d => d.status === 'resolved').length || 0}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            filterStatus === 'all' && styles.filterChipActive,
          ]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[
            styles.filterText,
            filterStatus === 'all' && styles.filterTextActive,
          ]}>
            All
          </Text>
        </TouchableOpacity>

        {(Object.keys(STATUS_LABELS) as DisputeStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              filterStatus === status && styles.filterChipActive,
              { borderColor: STATUS_COLORS[status] + '40' }
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Ionicons 
              name={STATUS_ICONS[status]} 
              size={14} 
              color={filterStatus === status ? Colors.surface : STATUS_COLORS[status]} 
            />
            <Text style={[
              styles.filterText,
              filterStatus === status && styles.filterTextActive,
            ]}>
              {STATUS_LABELS[status]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDisputeCard = ({ item }: { item: Dispute }) => (
    <TouchableOpacity
      style={styles.disputeCard}
      onPress={() => router.push(`/(provider)/disputes/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.disputeInfo}>
          <Text style={styles.disputeNumber}>#{item.disputeNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Ionicons name={getStatusIcon(item.status)} size={12} color={getStatusColor(item.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.disputeDate}>
          {formatTimeAgo(item.createdAt)}
        </Text>
      </View>
      <Text style={styles.disputeReason} numberOfLines={1}>
        <Text style={styles.reasonLabel}>Reason: </Text>
        {item.reason?.replace('_', ' ') || 'Not specified'}
      </Text>

      <Text style={styles.disputeDescription} numberOfLines={2}>
        {item.description || 'No description provided'}
      </Text>

      {item.adminResponse && (
        <View style={styles.responseIndicator}>
          <Ionicons name="chatbubble" size={14} color={Colors.primary} />
          <Text style={styles.responseText}>Admin responded</Text>
        </View>
      )}

      {item.resolvedAt && (
        <View style={styles.resolvedContainer}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={styles.resolvedText}>
            Resolved {formatTimeAgo(item.resolvedAt)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="alert-circle-outline"
      title="No disputes"
      message="You haven't filed any disputes yet"
      actionLabel="File a Dispute"
      onAction={() => router.push('/(provider)/disputes/new')}
      variant="default"
    />
  );

  const renderTips = () => (
    <View style={styles.tipsContainer}>
      <Text style={styles.tipsTitle}>📋 Dispute Guidelines</Text>
      <View style={styles.tipItem}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
        <Text style={styles.tipText}>Provide clear details about the issue</Text>
      </View>
      <View style={styles.tipItem}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
        <Text style={styles.tipText}>Upload evidence like photos or messages</Text>
      </View>
      <View style={styles.tipItem}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
        <Text style={styles.tipText}>Our team will review within 24-48 hours</Text>
      </View>
    </View>
  );

  const filteredDisputes = getFilteredDisputes();

  if (isLoading && !disputes) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={filteredDisputes}
        renderItem={renderDisputeCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={disputes?.length ? renderTips : null}
        showsVerticalScrollIndicator={false}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  newButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
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
  filterText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  filterTextActive: {
    color: Colors.surface,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  disputeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  disputeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disputeNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  disputeDate: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  bookingId: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  disputeReason: {
    fontSize: 13,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  reasonLabel: {
    color: Colors.text.secondary,
  },
  disputeDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  responseText: {
    fontSize: 11,
    color: Colors.primary,
  },
  resolvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  resolvedText: {
    fontSize: 11,
    color: Colors.success,
  },
  tipsContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: Colors.text.secondary,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});