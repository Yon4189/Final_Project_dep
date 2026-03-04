// app/(customer)/wallet/index.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { useWalletBalance } from '@/hooks/useCustomerQueries';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  transactionReference: string;
  type: 'payment' | 'refund' | 'payout' | 'fee';
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  paymentMethod: 'chapa' | 'cash' | 'bank_transfer' | 'mobile_money';
  bookingId?: string;
  bookingNumber?: string;
  serviceName?: string;
  providerName?: string;
  createdAt: string;
  completedAt?: string;
}

type TransactionFilter = 'all' | 'completed' | 'pending' | 'failed';

export default function WalletScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [filterType, setFilterType] = useState<TransactionFilter>('all');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('chapa');
  
  const { data: wallet, isLoading, refetch } = useWalletBalance();
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', filterType, selectedPeriod],
    queryFn: () => getTransactions(filterType, selectedPeriod),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getTransactions = async (filter: TransactionFilter, period: string) => {
    // This would be replaced with actual API call
    return mockTransactions;
  };

  const getPeriodSummary = () => {
    if (!transactions) return { spent: 0, received: 0, count: 0 };
    
    return transactions.reduce(
      (acc, t) => {
        if (t.type === 'payment') {
          acc.spent += t.amount;
        } else if (t.type === 'refund') {
          acc.received += t.amount;
        }
        acc.count++;
        return acc;
      },
      { spent: 0, received: 0, count: 0 }
    );
  };

  const formatCurrency = (amount: number) => {
    return `ETB ${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      completed: Colors.success,
      pending: Colors.warning,
      processing: Colors.info,
      failed: Colors.error,
      refunded: Colors.primary,
      cancelled: Colors.text.secondary,
    };
    return colors[status as keyof typeof colors] || Colors.text.secondary;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      completed: 'checkmark-circle',
      pending: 'time',
      processing: 'sync',
      failed: 'close-circle',
      refunded: 'refresh',
      cancelled: 'ban',
    };
    return icons[status as keyof typeof icons] || 'help-circle';
  };

  const getTransactionIcon = (type: string, method: string) => {
    if (type === 'payment') return 'arrow-up-circle';
    if (type === 'refund') return 'arrow-down-circle';
    if (type === 'payout') return 'cash';
    if (type === 'fee') return 'trending-down';
    return 'swap-horizontal';
  };

  const getTransactionColor = (type: string) => {
    if (type === 'payment') return Colors.error;
    if (type === 'refund') return Colors.success;
    if (type === 'payout') return Colors.primary;
    if (type === 'fee') return Colors.warning;
    return Colors.text.secondary;
  };

  const handleTopUp = () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount < 10) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (minimum ETB 10)');
      return;
    }

    Alert.alert('Coming Soon', 'Wallet top up is not available yet.');
    setShowTopUpModal(false);
    setTopUpAmount('');
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 50) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (minimum ETB 50)');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance');
      return;
    }

    Alert.alert('Coming Soon', 'Withdrawals are not available yet.');
    setShowWithdrawModal(false);
    setWithdrawAmount('');
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[Colors.primary, Colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => Alert.alert('Coming Soon', 'Transaction history is not available yet.')}
        >
          <Ionicons name="time-outline" size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>
          {wallet ? formatCurrency(wallet.balance) : 'ETB 0.00'}
        </Text>
        <Text style={styles.balanceSubtext}>
          Pending: {wallet ? formatCurrency(wallet.pendingAmount) : 'ETB 0.00'}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowTopUpModal(true)}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>Top Up</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowWithdrawModal(true)}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="arrow-down" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>Withdraw</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert('Coming Soon', 'Send money is not available yet.')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="send" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert('Coming Soon', 'Receive money is not available yet.')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="qr-code" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>Receive</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderQuickStats = () => {
    const summary = getPeriodSummary();

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.count}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.error }]}>
            {formatCurrency(summary.spent)}
          </Text>
          <Text style={styles.statLabel}>Spent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.success }]}>
            {formatCurrency(summary.received)}
          </Text>
          <Text style={styles.statLabel}>Received</Text>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
      >
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'completed' && styles.filterChipActive]}
          onPress={() => setFilterType('completed')}
        >
          <Text style={[styles.filterText, filterType === 'completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'pending' && styles.filterChipActive]}
          onPress={() => setFilterType('pending')}
        >
          <Text style={[styles.filterText, filterType === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'failed' && styles.filterChipActive]}
          onPress={() => setFilterType('failed')}
        >
          <Text style={[styles.filterText, filterType === 'failed' && styles.filterTextActive]}>
            Failed
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('week')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('month')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('year')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'year' && styles.periodTextActive]}>
            Year
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'all' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('all')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'all' && styles.periodTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity 
      style={styles.transactionItem}
      onPress={() => Alert.alert('Coming Soon', 'Transaction details are not available yet.')}
    >
      <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item.type) + '20' }]}>
        <Ionicons 
          name={getTransactionIcon(item.type, item.paymentMethod)} 
          size={24} 
          color={getTransactionColor(item.type)} 
        />
      </View>

      <View style={styles.transactionInfo}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionTitle}>
            {item.type === 'payment' ? 'Payment for Service' : 
             item.type === 'refund' ? 'Refund Received' :
             item.type === 'payout' ? 'Withdrawal' : 'Service Fee'}
          </Text>
          <Text style={[
            styles.transactionAmount,
            { color: getTransactionColor(item.type) }
          ]}>
            {item.type === 'payment' || item.type === 'fee' ? '-' : '+'}
            {formatCurrency(item.amount)}
          </Text>
        </View>

        {item.serviceName && (
          <Text style={styles.transactionService}>{item.serviceName}</Text>
        )}

        <View style={styles.transactionFooter}>
          <View style={styles.transactionMeta}>
            <Ionicons name="calendar-outline" size={12} color={Colors.text.secondary} />
            <Text style={styles.transactionDate}>
              {format(new Date(item.createdAt), 'MMM d, h:mm a')}
            </Text>
          </View>

         <View style={[styles.transactionStatus, { backgroundColor: getStatusColor(item.status as any) + '20' }]}>
                   <Ionicons 
                          name={getStatusIcon(item.status as any) as any} 
                          size={10} 
                          color={getStatusColor(item.status as any)} 
                        />
                      <Text style={[styles.transactionStatusText, { color: getStatusColor(item.status as any) }]}>
                        {item.status}
                </Text>
              </View>
        </View>

        {item.bookingNumber && (
          <Text style={styles.transactionReference}>Booking #{item.bookingNumber}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderTopUpModal = () => (
    <Modal
      visible={showTopUpModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowTopUpModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Top Up Wallet</Text>
            <TouchableOpacity onPress={() => setShowTopUpModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Enter the amount you want to add to your wallet
          </Text>

          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>ETB</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={Colors.text.secondary}
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <View style={styles.quickAmounts}>
            {[50, 100, 200, 500, 1000].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickAmount}
                onPress={() => setTopUpAmount(amount.toString())}
              >
                <Text style={styles.quickAmountText}>ETB {amount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.paymentMethodTitle}>Payment Method</Text>

          <TouchableOpacity
            style={[styles.paymentMethod, selectedPaymentMethod === 'chapa' && styles.paymentMethodSelected]}
            onPress={() => setSelectedPaymentMethod('chapa')}
          >
            <View style={styles.paymentMethodLeft}>
              <View style={styles.paymentMethodIcon}>
                <MaterialCommunityIcons name="credit-card" size={24} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.paymentMethodName}>Chapa</Text>
                <Text style={styles.paymentMethodDescription}>Credit/Debit Card, Bank Transfer</Text>
              </View>
            </View>
            <View style={[styles.radioButton, selectedPaymentMethod === 'chapa' && styles.radioSelected]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentMethod, selectedPaymentMethod === 'mobile_money' && styles.paymentMethodSelected]}
            onPress={() => setSelectedPaymentMethod('mobile_money')}
          >
            <View style={styles.paymentMethodLeft}>
              <View style={styles.paymentMethodIcon}>
                <MaterialCommunityIcons name="cellphone" size={24} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.paymentMethodName}>Mobile Money</Text>
                <Text style={styles.paymentMethodDescription}>M-Pesa, Telebirr</Text>
              </View>
            </View>
            <View style={[styles.radioButton, selectedPaymentMethod === 'mobile_money' && styles.radioSelected]} />
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowTopUpModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmButton, !topUpAmount && styles.modalConfirmDisabled]}
              onPress={handleTopUp}
              disabled={!topUpAmount}
            >
              <Text style={styles.modalConfirmText}>Proceed to Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderWithdrawModal = () => (
    <Modal
      visible={showWithdrawModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowWithdrawModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>
            <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Available Balance: {wallet ? formatCurrency(wallet.balance) : 'ETB 0.00'}
          </Text>

          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>ETB</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={Colors.text.secondary}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={styles.maxButton}
            onPress={() => setWithdrawAmount(wallet?.balance.toString() || '0')}
          >
            <Text style={styles.maxButtonText}>Max</Text>
          </TouchableOpacity>

          <View style={styles.withdrawInfo}>
            <View style={styles.withdrawInfoRow}>
              <Text style={styles.withdrawInfoLabel}>Withdrawal Fee</Text>
              <Text style={styles.withdrawInfoValue}>ETB 5.00</Text>
            </View>
            <View style={styles.withdrawInfoRow}>
              <Text style={styles.withdrawInfoLabel}>You'll Receive</Text>
              <Text style={styles.withdrawInfoValue}>
                {formatCurrency(Math.max(0, parseFloat(withdrawAmount || '0') - 5))}
              </Text>
            </View>
            <View style={styles.withdrawInfoRow}>
              <Text style={styles.withdrawInfoLabel}>Processing Time</Text>
              <Text style={styles.withdrawInfoValue}>1-3 business days</Text>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowWithdrawModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalConfirmButton, 
                (!withdrawAmount || parseFloat(withdrawAmount) < 50) && styles.modalConfirmDisabled
              ]}
              onPress={handleWithdraw}
              disabled={!withdrawAmount || parseFloat(withdrawAmount) < 50}
            >
              <Text style={styles.modalConfirmText}>Continue</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.withdrawNote}>
            Note: Withdrawals are processed within 1-3 business days to your registered bank account.
          </Text>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
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
        {renderQuickStats()}
        {renderFilters()}

        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Transaction history is not available yet.')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {transactionsLoading ? (
            <View style={styles.transactionsLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : transactions && transactions.length > 0 ? (
            transactions.slice(0, 5).map((transaction) => (
              <View key={transaction.id}>
                {renderTransactionItem({ item: transaction })}
              </View>
            ))
          ) : (
            <EmptyState
              icon="wallet-outline"
              title="No Transactions"
              message="Your transaction history will appear here"
              actionLabel="Top Up Now"
              onAction={() => setShowTopUpModal(true)}
            />
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Secure Payments</Text>
              <Text style={styles.infoDescription}>
                Your money is held securely until service is completed
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="timer" size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>24/7 Support</Text>
              <Text style={styles.infoDescription}>
                Contact us anytime for payment-related issues
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderTopUpModal()}
      {renderWithdrawModal()}
    </View>
  );
}

// Mock data for development
const mockTransactions: Transaction[] = [
  {
    id: '1',
    transactionReference: 'TXN123456',
    type: 'payment',
    amount: 250.00,
    fee: 5.00,
    netAmount: 245.00,
    currency: 'ETB',
    status: 'completed',
    paymentMethod: 'chapa',
    bookingId: 'B123',
    bookingNumber: 'HL-2024-001',
    serviceName: 'Plumbing Repair',
    providerName: 'John Plumbing Pros',
    createdAt: '2024-01-15T10:30:00Z',
    completedAt: '2024-01-15T10:35:00Z',
  },
  {
    id: '2',
    transactionReference: 'TXN123457',
    type: 'payment',
    amount: 150.00,
    fee: 3.00,
    netAmount: 147.00,
    currency: 'ETB',
    status: 'pending',
    paymentMethod: 'mobile_money',
    bookingId: 'B124',
    bookingNumber: 'HL-2024-002',
    serviceName: 'Electrical Repair',
    providerName: 'Quick Fix Electricians',
    createdAt: '2024-01-16T14:20:00Z',
  },
  {
    id: '3',
    transactionReference: 'TXN123458',
    type: 'refund',
    amount: 75.00,
    fee: 0,
    netAmount: 75.00,
    currency: 'ETB',
    status: 'completed',
    paymentMethod: 'chapa',
    bookingId: 'B122',
    bookingNumber: 'HL-2024-003',
    serviceName: 'Home Cleaning',
    providerName: 'Clean Home Services',
    createdAt: '2024-01-14T09:15:00Z',
    completedAt: '2024-01-14T09:45:00Z',
  },
  {
    id: '4',
    transactionReference: 'TXN123459',
    type: 'fee',
    amount: 2.50,
    fee: 0,
    netAmount: 2.50,
    currency: 'ETB',
    status: 'completed',
    paymentMethod: 'chapa',
    createdAt: '2024-01-13T16:00:00Z',
    completedAt: '2024-01-13T16:05:00Z',
  },
  {
    id: '5',
    transactionReference: 'TXN123460',
    type: 'payment',
    amount: 500.00,
    fee: 10.00,
    netAmount: 490.00,
    currency: 'ETB',
    status: 'failed',
    paymentMethod: 'bank_transfer',
    bookingId: 'B125',
    bookingNumber: 'HL-2024-004',
    serviceName: 'AC Installation',
    providerName: 'AC Repair Experts',
    createdAt: '2024-01-17T11:00:00Z',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.surface,
  },
  historyButton: {
    padding: 4,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.surface + 'CC',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.surface,
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 12,
    color: Colors.surface + 'CC',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 12,
    color: Colors.surface,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  periodTextActive: {
    color: Colors.surface,
    fontWeight: '500',
  },
  transactionsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionService: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionDate: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  transactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  transactionStatusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  transactionReference: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  transactionsLoading: {
    padding: 40,
    alignItems: 'center',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  bottomPadding: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    marginBottom: 20,
    paddingBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text.primary,
    padding: 0,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 24,
  },
  quickAmount: {
    width: '30%',
    margin: '1.5%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickAmountText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  radioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
  maxButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    marginBottom: 20,
  },
  maxButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawInfo: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  withdrawInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  withdrawInfoLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  withdrawInfoValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  withdrawNote: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});