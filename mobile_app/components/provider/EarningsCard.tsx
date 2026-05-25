// components/provider/EarningsCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/app/constants/Colors';
import { formatCurrency } from '@/app/utils/formatters';

interface EarningsCardProps {
  totalEarnings: number;
  pendingEarnings: number;
  availableForWithdrawal: number;
  thisWeek: number;
  thisMonth: number;
  onWithdrawPress?: () => void;
  onViewDetails?: () => void;
  variant?: 'default' | 'compact' | 'detailed';
  showWithdrawButton?: boolean;
}

export const EarningsCard: React.FC<EarningsCardProps> = ({
  totalEarnings,
  pendingEarnings,
  availableForWithdrawal,
  thisWeek,
  thisMonth,
  onWithdrawPress,
  onViewDetails,
  variant = 'default',
  showWithdrawButton = true,
}) => {
  const renderDefault = () => (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.defaultCard}
    >
      <View style={styles.defaultHeader}>
        <View>
          <Text style={styles.defaultLabel}>Available Balance</Text>
          <Text style={styles.defaultAmount}>{formatCurrency(availableForWithdrawal)}</Text>
        </View>
        {showWithdrawButton && (
          <TouchableOpacity style={styles.withdrawButton} onPress={onWithdrawPress}>
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.surface} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.defaultStats}>
        <View style={styles.defaultStat}>
          <Text style={styles.defaultStatValue}>{formatCurrency(totalEarnings)}</Text>
          <Text style={styles.defaultStatLabel}>Total</Text>
        </View>
        <View style={styles.defaultStatDivider} />
        <View style={styles.defaultStat}>
          <Text style={styles.defaultStatValue}>{formatCurrency(pendingEarnings)}</Text>
          <Text style={styles.defaultStatLabel}>Pending</Text>
        </View>
        <View style={styles.defaultStatDivider} />
        <View style={styles.defaultStat}>
          <Text style={styles.defaultStatValue}>{formatCurrency(thisMonth)}</Text>
          <Text style={styles.defaultStatLabel}>This Month</Text>
        </View>
      </View>

      {onViewDetails && (
        <TouchableOpacity style={styles.detailsLink} onPress={onViewDetails}>
          <Text style={styles.detailsLinkText}>View Earnings Details</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.surface} />
        </TouchableOpacity>
      )}
    </LinearGradient>
  );

  const renderCompact = () => (
    <TouchableOpacity style={styles.compactCard} onPress={onViewDetails}>
      <View style={styles.compactHeader}>
        <Ionicons name="wallet-outline" size={24} color={Colors.primary} />
        <View style={styles.compactInfo}>
          <Text style={styles.compactLabel}>Available Balance</Text>
          <Text style={styles.compactAmount}>{formatCurrency(availableForWithdrawal)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.text.secondary} />
      </View>
      
      <View style={styles.compactStats}>
        <View style={styles.compactStat}>
          <Text style={styles.compactStatValue}>{formatCurrency(thisWeek)}</Text>
          <Text style={styles.compactStatLabel}>This Week</Text>
        </View>
        <View style={styles.compactStatDivider} />
        <View style={styles.compactStat}>
          <Text style={styles.compactStatValue}>{formatCurrency(thisMonth)}</Text>
          <Text style={styles.compactStatLabel}>This Month</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDetailed = () => (
    <View style={styles.detailedCard}>
      <Text style={styles.detailedTitle}>Earnings Summary</Text>
      
      <View style={styles.detailedRow}>
        <Text style={styles.detailedLabel}>Total Earnings</Text>
        <Text style={styles.detailedValue}>{formatCurrency(totalEarnings)}</Text>
      </View>
      
      <View style={styles.detailedRow}>
        <Text style={styles.detailedLabel}>Pending Clearance</Text>
        <Text style={styles.detailedValue}>{formatCurrency(pendingEarnings)}</Text>
      </View>
      
      <View style={styles.detailedRow}>
        <Text style={styles.detailedLabel}>Available for Withdrawal</Text>
        <Text style={[styles.detailedValue, styles.availableValue]}>
          {formatCurrency(availableForWithdrawal)}
        </Text>
      </View>

      <View style={styles.detailedDivider} />

      <View style={styles.detailedPeriods}>
        <View style={styles.detailedPeriod}>
          <Text style={styles.detailedPeriodLabel}>This Week</Text>
          <Text style={styles.detailedPeriodValue}>{formatCurrency(thisWeek)}</Text>
        </View>
        <View style={styles.detailedPeriod}>
          <Text style={styles.detailedPeriodLabel}>This Month</Text>
          <Text style={styles.detailedPeriodValue}>{formatCurrency(thisMonth)}</Text>
        </View>
      </View>

      {showWithdrawButton && (
        <TouchableOpacity style={styles.detailedWithdrawButton} onPress={onWithdrawPress}>
          <Text style={styles.detailedWithdrawText}>Withdraw Funds</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.surface} />
        </TouchableOpacity>
      )}
    </View>
  );

  switch (variant) {
    case 'compact':
      return renderCompact();
    case 'detailed':
      return renderDetailed();
    default:
      return renderDefault();
  }
};

const styles = StyleSheet.create({
  // Default Variant
  defaultCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  defaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  defaultLabel: {
    fontSize: 14,
    color: Colors.surface + 'CC',
    marginBottom: 4,
  },
  defaultAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  withdrawButtonText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '500',
  },
  defaultStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  defaultStat: {
    flex: 1,
    alignItems: 'center',
  },
  defaultStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.surface,
    marginBottom: 4,
  },
  defaultStatLabel: {
    fontSize: 12,
    color: Colors.surface + 'CC',
  },
  defaultStatDivider: {
    width: 1,
    backgroundColor: Colors.surface + '40',
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surface + '40',
    gap: 4,
  },
  detailsLinkText: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: '500',
  },

  // Compact Variant
  compactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  compactLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  compactAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  compactStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  compactStat: {
    alignItems: 'center',
  },
  compactStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  compactStatLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  compactStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },

  // Detailed Variant
  detailedCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  detailedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailedLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  detailedValue: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  availableValue: {
    color: Colors.success,
    fontWeight: '600',
  },
  detailedDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  detailedPeriods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailedPeriod: {
    flex: 1,
    alignItems: 'center',
  },
  detailedPeriodLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  detailedPeriodValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  detailedWithdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  detailedWithdrawText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});