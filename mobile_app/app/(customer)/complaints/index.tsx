// app/(customer)/complaints/index.tsx
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useComplaints } from '@/hooks/useCustomerQueries';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 import { EmptyState } from '@/components/common/EmptyState';
// TODO: Uncomment and update the path below if EmptyState exists elsewhere
import { formatDistanceToNow } from 'date-fns';

type ComplaintStatus = 'pending' | 'under_review' | 'resolved' | 'rejected';

const STATUS_COLORS = {
  pending: Colors.warning,
  under_review: Colors.primary,
  resolved: Colors.success,
  rejected: Colors.error,
};

const STATUS_ICONS: Record<ComplaintStatus, keyof typeof Ionicons.glyphMap> = {
  pending: 'time-outline',
  under_review: 'eye-outline',
  resolved: 'checkmark-circle-outline',
  rejected: 'close-circle-outline',
};

const STATUS_LABELS = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

export default function ComplaintsList() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | 'all'>('all');
  
  const { data: complaints, isLoading, refetch } = useComplaints();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getFilteredComplaints = () => {
    if (!complaints) return [];
    if (filterStatus === 'all') return complaints;
    return complaints.filter((c: { status: ComplaintStatus }) => c.status === filterStatus);
  };

  const getStatusColor = (status: ComplaintStatus) => {
    return STATUS_COLORS[status] || Colors.text.secondary;
  };

  const getStatusIcon = (status: ComplaintStatus) => {
    return STATUS_ICONS[status] || 'help-outline';
  };

  const getStatusLabel = (status: ComplaintStatus) => {
    return STATUS_LABELS[status] || status;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Complaints</Text>
        <TouchableOpacity 
          style={styles.newButton}
          onPress={() => router.push('/(customer)/complaints/new')}
        >
          <Ionicons name="add" size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <Text style={styles.headerSubtitle}>
        Track and manage your reported issues
      </Text>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{complaints?.length || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.warning }]}>
            {complaints?.filter(c => c.status === 'pending').length || 0}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.success }]}>
            {complaints?.filter((c: any) => c.status === 'resolved').length || 0}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
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

        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              filterStatus === status && styles.filterChipActive,
              { borderColor: STATUS_COLORS[status as ComplaintStatus] + '40' }
            ]}
            onPress={() => setFilterStatus(status as ComplaintStatus)}
          >
            <Ionicons 
              name={STATUS_ICONS[status as ComplaintStatus]} 
              size={14} 
              color={filterStatus === status ? Colors.surface : STATUS_COLORS[status as ComplaintStatus]} 
            />
            <Text style={[
              styles.filterText,
              filterStatus === status && styles.filterTextActive,
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderComplaintCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.complaintCard}
      onPress={() => router.push(`/(customer)/complaints/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.complaintInfo}>
          <Text style={styles.complaintNumber}>#{item.complaintNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Ionicons name={getStatusIcon(item.status)} size={12} color={getStatusColor(item.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.complaintDate}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>

      <Text style={styles.complaintSubject} numberOfLines={2}>
        {item.subject}
      </Text>

      <Text style={styles.complaintDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.providerInfo}>
          <Image
            source={{ uri: item.providerImage || 'https://via.placeholder.com/30' }}
            style={styles.providerImage}
          />
          <Text style={styles.providerName}>{item.providerName}</Text>
        </View>

        {item.adminResponse && (
          <View style={styles.responseIndicator}>
            <Ionicons name="chatbubble" size={14} color={Colors.primary} />
            <Text style={styles.responseText}>Admin responded</Text>
          </View>
        )}
      </View>

      {item.resolvedAt && (
        <View style={styles.resolvedContainer}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={styles.resolvedText}>
            Resolved {formatDistanceToNow(new Date(item.resolvedAt), { addSuffix: true })}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="alert-circle-outline"
      title="No complaints yet"
      message="If you have an issue with a service, you can report it here"
      actionLabel="File a Complaint"
      onAction={() => router.push('/(customer)/complaints/new')}
    />
  );

  const renderTips = () => (
    <View style={styles.tipsContainer}>
      <Text style={styles.tipsTitle}>📋 Complaint Guidelines</Text>
      <View style={styles.tipItem}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
        <Text style={styles.tipText}>Provide clear details about the issue</Text>
      </View>
      <View style={styles.tipItem}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
        <Text style={styles.tipText}>Upload photos as evidence if available</Text>
      </View>
      <View style={styles.tipItem}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
        <Text style={styles.tipText}>Our team will respond within 24-48 hours</Text>
      </View>
    </View>
  );

  const filteredComplaints = getFilteredComplaints();

  if (isLoading && !complaints) {
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
        data={filteredComplaints}
        renderItem={renderComplaintCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={complaints?.length ? renderTips : null}
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
    paddingTop: 100,
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
    paddingLeft: 20,
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
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    marginLeft: 6,
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
  complaintCard: {
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
  complaintInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  complaintNumber: {
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
  },
  complaintDate: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  complaintSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  complaintDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  providerName: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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