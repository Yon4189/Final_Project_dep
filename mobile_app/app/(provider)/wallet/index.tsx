// app/(provider)/wallet/index.tsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/app/context/ThemeContext';
import { ThemeColors } from '@/app/constants/Colors';
import { providerService } from '@/app/services/provider.service';
import { formatCurrency } from '@/app/utils/formatters';
import { EmptyState } from '@/components/common/EmptyState';

type TxType = 'all' | 'immediate_payout' | 'held_payout' | 'withdrawal' | 'refund_reversal';
type TxStatus = 'all' | 'pending' | 'completed' | 'cancelled';

const TYPE_LABELS: Record<string, string> = {
  immediate_payout: 'Immediate Payout',
  held_payout: 'Held Payout',
  withdrawal: 'Withdrawal',
  refund_reversal: 'Refund Reversal',
  other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  immediate_payout: '#22c55e',
  held_payout: '#f59e0b',
  withdrawal: '#6366f1',
  refund_reversal: '#ef4444',
  other: '#94a3b8',
};

const TYPE_ICONS: Record<string, any> = {
  immediate_payout: 'flash-outline',
  held_payout: 'time-outline',
  withdrawal: 'arrow-up-circle-outline',
  refund_reversal: 'return-down-back-outline',
  other: 'swap-horizontal-outline',
};

export default function ProviderWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [typeFilter, setTypeFilter] = useState<TxType>('all');
  const [statusFilter, setStatusFilter] = useState<TxStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const walletQuery = useQuery({
    queryKey: ['provider-wallet'],
    queryFn: async () => {
      const res = await providerService.getWalletDashboard();
      return res.success ? res.data : null;
    },
  });

  const txQuery = useQuery({
    queryKey: ['provider-wallet-transactions', typeFilter, statusFilter],
    queryFn: async () => {
      const res = await providerService.getWalletTransactions({
        transaction_type: typeFilter !== 'all' ? typeFilter : undefined,
        transaction_status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      return res.success ? (res.data?.transactions || res.data?.data || []) : [];
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([walletQuery.refetch(), txQuery.refetch()]);
    setRefreshing(false);
  };

  const wallet = walletQuery.data?.wallet || walletQuery.data;
  const transactions: any[] = txQuery.data || [];

  const renderWalletSummary = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Wallet Balance</Text>
      <View style={styles.balanceRow}>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Available</Text>
          <Text style={[styles.balanceAmount, { color: '#22c55e' }]}>
            {formatCurrency(wallet?.available_balance ?? 0, 'ETB')}
          </Text>
          <Text style={styles.balanceNote}>Can withdraw</Text>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Pending</Text>
          <Text style={[styles.balanceAmount, { color: '#f59e0b' }]}>
            {formatCurrency(wallet?.pending_balance ?? 0, 'ETB')}
          </Text>
          <Text style={styles.balanceNote}>3-day hold</Text>
        </View>
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Balance</Text>
        <Text style={styles.totalAmount}>
          {formatCurrency((wallet?.available_balance ?? 0) + (wallet?.pending_balance ?? 0), 'ETB')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.withdrawBtn}
        onPress={() => router.push('/(provider)/earnings/withdraw')}
      >
        <Ionicons name="arrow-up-circle-outline" size={18} color="#fff" />
        <Text style={styles.withdrawBtnText}>Withdraw</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {(['all', 'immediate_payout', 'held_payout', 'withdrawal', 'refund_reversal'] as TxType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, typeFilter === t && styles.filterChipActive]}
            onPress={() => setTypeFilter(t)}
          >
            <Text style={[styles.filterChipText, typeFilter === t && styles.filterChipTextActive]}>
              {t === 'all' ? 'All Types' : TYPE_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, { marginTop: 6 }]}>
        {(['all', 'pending', 'completed', 'cancelled'] as TxStatus[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTransaction = (tx: any, idx: number) => {
    const type = tx.transaction_type || 'other';
    const color = TYPE_COLORS[type] || '#94a3b8';
    const icon = TYPE_ICONS[type] || 'swap-horizontal-outline';
    const isCredit = type === 'immediate_payout' || type === 'held_payout';
    const releaseDate = tx.release_date ? new Date(tx.release_date) : null;
    const isReleased = tx.transaction_status === 'completed';
    const isPending = tx.transaction_status === 'pending';

    return (
      <View key={tx.id || idx} style={styles.txCard}>
        <View style={[styles.txIcon, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txType}>{TYPE_LABELS[type] || type}</Text>
          {tx.booking_id && (
            <Text style={styles.txBooking}>Booking #{tx.booking_id}</Text>
          )}
          {releaseDate && isPending && (
            <Text style={[styles.txRelease, { color: '#f59e0b' }]}>
              Releases: {releaseDate.toLocaleDateString()}
            </Text>
          )}
          <Text style={styles.txDate}>
            {new Date(tx.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: isCredit ? '#22c55e' : '#ef4444' }]}>
            {isCredit ? '+' : '-'}{formatCurrency(Math.abs(tx.amount || 0), 'ETB')}
          </Text>
          <View style={[styles.txStatus, { backgroundColor: isReleased ? '#22c55e18' : isPending ? '#f59e0b18' : '#94a3b818' }]}>
            <Text style={[styles.txStatusText, { color: isReleased ? '#22c55e' : isPending ? '#f59e0b' : '#94a3b8' }]}>
              {tx.transaction_status || 'unknown'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {walletQuery.isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          renderWalletSummary()
        )}

        {renderFilters()}

        <View style={styles.txSection}>
          <Text style={styles.txSectionTitle}>Transaction History</Text>
          {txQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : transactions.length === 0 ? (
            <EmptyState icon="swap-horizontal-outline" title="No Transactions" message="No transactions match your filters." />
          ) : (
            transactions.map(renderTransaction)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  summaryCard: { margin: 16, backgroundColor: colors.primary, borderRadius: 20, padding: 20 },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  balanceBox: { flex: 1, alignItems: 'center' },
  balanceDivider: { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.2)' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  balanceAmount: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  balanceNote: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  totalAmount: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 12 },
  withdrawBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  filtersSection: { paddingHorizontal: 16, paddingVertical: 8 },
  filterRow: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, color: colors.text.secondary, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  txSection: { padding: 16 },
  txSectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 12 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txType: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  txBooking: { fontSize: 11, color: colors.text.secondary, marginTop: 2 },
  txRelease: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  txDate: { fontSize: 11, color: colors.text.secondary, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 15, fontWeight: 'bold' },
  txStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  txStatusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
});
