// app/(customer)/requests/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useServiceRequests } from '../../../hooks/useCustomerQueries';
import { RequestCard } from '@/app/(customer)/requests/RequestCard';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';

type FilterType = 'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

const FILTERS: { label: string; value: FilterType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'All', value: 'all', icon: 'apps-outline' },
  { label: 'Pending', value: 'pending', icon: 'time-outline' },
  { label: 'Confirmed', value: 'confirmed', icon: 'checkmark-circle-outline' },
  { label: 'In Progress', value: 'in_progress', icon: 'construct-outline' },
  { label: 'Completed', value: 'completed', icon: 'checkmark-done-outline' },
  { label: 'Cancelled', value: 'cancelled', icon: 'close-circle-outline' },
];

export default function MyRequests() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: requests, isLoading, refetch } = useServiceRequests(
    activeFilter === 'all' ? undefined : activeFilter
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getFilteredCounts = () => {
    if (!requests) return {};

    return {
      all: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      confirmed: requests.filter(r => r.status === 'confirmed').length,
      in_progress: requests.filter(r => r.status === 'in_progress').length,
      completed: requests.filter(r => r.status === 'completed').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length,
    };
  };

  const counts = getFilteredCounts();

  const renderFilterChip = (filter: typeof FILTERS[0]) => {
    const isActive = activeFilter === filter.value;
    const count = counts[filter.value as keyof typeof counts] || 0;

    return (
      <TouchableOpacity
        key={filter.value}
        style={[
          styles.filterChip,
          isActive && styles.filterChipActive,
        ]}
        onPress={() => setActiveFilter(filter.value)}
      >
        <Ionicons
          name={filter.icon}
          size={16}
          color={isActive ? Colors.surface : Colors.text.secondary}
        />
        <Text style={[
          styles.filterText,
          isActive && styles.filterTextActive,
        ]}>
          {filter.label} {count > 0 && `(${count})`}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        renderItem={({ item }) => renderFilterChip(item)}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      />
    </View>
  );

  const renderRequest = ({ item }: { item: any }) => (
    <RequestCard request={item} />
  );

  const renderEmptyState = () => {
    if (isLoading) return null;

    const messages = {
      all: "You haven't made any service requests yet",
      pending: "No pending requests",
      confirmed: "No confirmed requests",
      in_progress: "No ongoing services",
      completed: "No completed services yet",
      cancelled: "No cancelled requests",
    };

    return (
      <EmptyState
        icon="document-text-outline"
        title="No requests found"
        message={messages[activeFilter]}
        actionLabel="Browse Services"
        onAction={() => router.push('/(customer)/dashboard')}
      />
    );
  };

  const renderSummary = () => {
    if (!requests?.length) return null;

    const activeRequests = requests.filter(
      r => ['pending', 'accepted', 'confirmed', 'in_progress'].includes(r.status)
    ).length;

    const totalSpent = requests
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.estimatedPrice, 0);

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{requests.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activeRequests}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>${totalSpent}</Text>
            <Text style={styles.summaryLabel}>Spent</Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && !requests) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderSummary()}

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
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
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  searchButton: {
    padding: 4,
  },
  filtersContainer: {
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
  summaryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});