// app/(provider)/earnings/index.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../../../components/common/EmptyState";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { useProviderEarnings } from "../../../hooks/useProviderEarnings";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../constants/Colors";
import type { Currency } from "../../types/customer.types";
import type { EarningsSummary, Transaction } from "../../types/provider.types";
import { formatCurrency, formatRelativeTime } from "../../utils/formatters";

const { width } = Dimensions.get("window");

type PeriodType = "week" | "month" | "year";
type FilterType = "all" | "payment" | "withdrawal" | "refund";
type TransactionType = "payment" | "withdrawal" | "refund";

// Local interface for chart data
interface ChartData {
  labels: string[];
  data: number[];
}

export default function EarningsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("week");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const insets = useSafeAreaInsets();

  // Map filter to transaction type - FIXED: Always provide a valid TransactionType
  const transactionType: TransactionType =
    selectedFilter === "all" ? "payment" : (selectedFilter as TransactionType);

  const {
    summary,
    transactions,
    chartData,
    isLoading,
    refetch,
    loadMore,
    hasMore,
  } = useProviderEarnings(selectedPeriod);
  // Provide default values for summary
  const defaultSummary: EarningsSummary = {
    totalEarnings: 0,
    pendingEarnings: 0,
    availableForWithdrawal: 0,
    withdrawnTotal: 0,
    thisWeek: 0,
    thisMonth: 0,
    lastMonth: 0,
    currency: "ETB",
    completedJobs: 0,
    avgRating: 0,
    responseRate: 0,
    rank: "-",
  };

  const safeSummary = summary || defaultSummary;
  const safeTransactions = transactions || [];
  const safeChartData = chartData || { labels: [""], datasets: [{ data: [0] }] };

  // FIXED: Helper function to safely format currency with correct Currency type
  const safeFormatCurrency = (
    amount: number,
    currencyCode: string = "ETB",
  ): string => {
    return formatCurrency(amount, currencyCode as Currency);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch?.();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadMore && hasMore) {
      await loadMore();
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + (insets.top > 0 ? 10 : 40) }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("earnings.title", "Earnings")}</Text>
        <TouchableOpacity style={styles.withdrawButton} onPress={() => router.push("/(provider)/earnings/withdraw")}>
          <Ionicons name="wallet-outline" size={20} color={colors.surface} />
          <Text style={styles.withdrawButtonText}>{t("wallet.withdraw", "Withdraw")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBalanceCard = () => (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>{t("earnings.availableBalance", "Available Balance")}</Text>
      <Text style={styles.balanceAmount}>
        {safeFormatCurrency(
          safeSummary.availableForWithdrawal,
          safeSummary.currency,
        )}
      </Text>

      <View style={styles.balanceDetails}>
        <View style={styles.balanceDetailItem}>
          <Text style={styles.balanceDetailLabel}>{t("earnings.totalEarned", "Total Earned")}</Text>
          <Text style={styles.balanceDetailValue}>
            {safeFormatCurrency(
              safeSummary.totalEarnings,
              safeSummary.currency,
            )}
          </Text>
        </View>

        <View style={styles.balanceDetailDivider} />

        <View style={styles.balanceDetailItem}>
          <Text style={styles.balanceDetailLabel}>{t("wallet.filterPending", "Pending")}</Text>
          <Text style={styles.balanceDetailValue}>
            {safeFormatCurrency(
              safeSummary.pendingEarnings,
              safeSummary.currency,
            )}
          </Text>
        </View>

        <View style={styles.balanceDetailDivider} />

        <View style={styles.balanceDetailItem}>
          <Text style={styles.balanceDetailLabel}>{t("earnings.withdrawn", "Withdrawn")}</Text>
          <Text style={styles.balanceDetailValue}>
            {safeFormatCurrency(
              safeSummary.withdrawnTotal,
              safeSummary.currency,
            )}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPeriodSummary = () => (
    <View style={styles.periodSummary}>
      <View style={styles.periodItem}>
        <Text style={styles.periodLabel}>{t("earnings.thisWeek", "This Week")}</Text>
        <Text style={styles.periodValue}>
          {safeFormatCurrency(safeSummary.thisWeek, safeSummary.currency)}
        </Text>
      </View>

      <View style={styles.periodDivider} />

      <View style={styles.periodItem}>
        <Text style={styles.periodLabel}>{t("earnings.thisMonth", "This Month")}</Text>
        <Text style={styles.periodValue}>
          {safeFormatCurrency(safeSummary.thisMonth, safeSummary.currency)}
        </Text>
      </View>

      <View style={styles.periodDivider} />

      <View style={styles.periodItem}>
        <Text style={styles.periodLabel}>{t("earnings.lastMonth", "Last Month")}</Text>
        <Text style={styles.periodValue}>
          {safeFormatCurrency(safeSummary.lastMonth, safeSummary.currency)}
        </Text>
      </View>
    </View>
  );

  const renderChart = () => {
    if (!safeChartData.labels?.length) return null;

    const chartDatasets = safeChartData.datasets && safeChartData.datasets.length > 0 
      ? safeChartData.datasets 
      : [{ data: safeChartData.data?.length ? safeChartData.data : [0] }];

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{t("earnings.overview", "Earnings Overview")}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.periodSelector}
        >
          {(["week", "month", "year"] as PeriodType[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodChip,
                selectedPeriod === period && styles.periodChipActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodChipText,
                  selectedPeriod === period && styles.periodChipTextActive,
                ]}
              >
                {t(`wallet.period${period.charAt(0).toUpperCase() + period.slice(1)}`, period.charAt(0).toUpperCase() + period.slice(1))}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <LineChart
          data={{ labels: safeChartData.labels, datasets: chartDatasets }}
          width={Math.max(width - 72, safeChartData.labels.length * 60)}
          height={220}
          chartConfig={{
            backgroundColor: colors.surface,
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
            labelColor: (opacity = 1) => isDark ? `rgba(180,180,200,${opacity})` : `rgba(107, 114, 128, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: "6", strokeWidth: "2", stroke: colors.primary },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeFilter}
      >
        {(["all", "payment", "withdrawal", "refund"] as FilterType[]).map(
          (filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.typeChip,
                selectedFilter === filter && styles.typeChipActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  selectedFilter === filter && styles.typeChipTextActive,
                ]}
              >
                {filter === "all" ? t("wallet.filterAll", "All") :
                 filter === "payment" ? t("wallet.paymentForService", "Payment") :
                 filter === "withdrawal" ? t("wallet.withdrawal", "Withdrawal") : t("earnings.refund", "Refund")}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </ScrollView>
    </View>
  );

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "payment":    return { name: "arrow-down-circle" as const, color: colors.success };
      case "withdrawal": return { name: "arrow-up-circle" as const,   color: colors.error };
      case "refund":     return { name: "refresh-circle" as const,     color: colors.warning };
      default:           return { name: "swap-horizontal" as const,    color: colors.text.secondary };
    }
  };

  const getTransactionTitle = (type: string) => {
    switch (type) {
      case "payment":
        return t("earnings.paymentReceived", "Payment Received");
      case "withdrawal":
        return t("wallet.withdrawal", "Withdrawal");
      case "refund":
        return t("earnings.refund", "Refund");
      default:
        return t("earnings.transaction", "Transaction");
    }
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const typeStr = item.TransactionType || (item as any).transactionType || "payment";
    const icon = getTransactionIcon(typeStr);
    const isPayment = typeStr === "payment";
    const amountVal = item.netAmount || item.amount || 0;
    const amount = isPayment ? amountVal : -amountVal;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.transactionItem}
        onPress={() => {
          if (item.bookingId) {
            router.push(`/(provider)/requests/${item.bookingId}`);
          }
        }}
      >
        <View
          style={[
            styles.transactionIcon,
            { backgroundColor: icon.color + "20" },
          ]}
        >
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>

        <View style={styles.transactionInfo}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionTitle}>
              {getTransactionTitle(typeStr)}
            </Text>
            <Text
              style={[
                styles.transactionAmount,
                { color: isPayment ? colors.success : colors.error },
              ]}
            >
              {isPayment ? "+" : "-"}
              {safeFormatCurrency(Math.abs(amount))}
            </Text>
          </View>

          <Text style={styles.transactionDescription}>
            {item.serviceName || t("earnings.service", "Service")} • {item.customerName || t("earnings.customer", "Customer")}
          </Text>

          <View style={styles.transactionFooter}>
            <Text style={styles.transactionDate}>{formatRelativeTime(item.createdAt)}</Text>
            <View
              style={[
                styles.transactionStatus,
                {
                  backgroundColor:
                    (item.status || "completed") === "completed" ? colors.success + "20"
                    : (item.status || "completed") === "pending"  ? colors.warning + "20"
                    : colors.error + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.transactionStatusText,
                  {
                    color:
                      (item.status || "completed") === "completed" ? colors.success
                      : (item.status || "completed") === "pending"  ? colors.warning
                      : colors.error,
                  },
                ]}
              >
                {t(`bookings.status.${(item.status || "completed").toLowerCase()}`, (item.status || "completed").charAt(0).toUpperCase() + (item.status || "completed").slice(1))}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !refreshing && !safeTransactions.length) {
    return <LoadingSpinner fullScreen />;
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
        {renderBalanceCard()}
        {renderPeriodSummary()}
        {renderChart()}
        {renderFilters()}

        <View style={styles.transactionsSection}>
          <Text style={styles.transactionsTitle}>{t("wallet.recentTransactions", "Recent Transactions")}</Text>

          {safeTransactions.length > 0 ? (
            <View>
              {safeTransactions.map((item) => renderTransactionItem({ item }))}
              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}
                >
                  <Text style={styles.loadMoreText}>{t("earnings.loadMore", "Load More")}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title={t("wallet.noTransactions", "No transactions")}
              message={t("earnings.noTransactionsSub", "Your transaction history will appear here")}
            />
          )}
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>{t("earnings.stats", "Quick Stats")}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="calendar-check" size={24} color={colors.primary} />
                <Text style={styles.statValue}>{safeSummary.completedJobs || 0}</Text>
                <Text style={styles.statLabel}>{t("earnings.jobsCompleted", "Jobs Completed")}</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="star" size={24} color={colors.warning} />
                <Text style={styles.statValue}>{safeSummary.avgRating?.toFixed(1) || "0.0"}</Text>
                <Text style={styles.statLabel}>{t("earnings.avgRating", "Average Rating")}</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="clock-outline" size={24} color={colors.info} />
                <Text style={styles.statValue}>{safeSummary.responseRate || 0}%</Text>
                <Text style={styles.statLabel}>{t("earnings.responseRate", "Response Rate")}</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="trophy" size={24} color={colors.warning} />
                <Text style={styles.statValue}>{safeSummary.rank || "#"}</Text>
                <Text style={styles.statLabel}>{t("earnings.providerRank", "Provider Rank")}</Text>
              </View>
            </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "600", color: colors.surface },
  withdrawButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface + "20", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6 },
  withdrawButtonText: { color: colors.surface, fontSize: 14, fontWeight: "500" },
  balanceCard: { backgroundColor: colors.surface, marginHorizontal: 20, marginTop: -20, borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  balanceLabel: { fontSize: 14, color: colors.text.secondary, marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontWeight: "bold", color: colors.text.primary, marginBottom: 20 },
  balanceDetails: { flexDirection: "row", justifyContent: "space-between", paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  balanceDetailItem: { flex: 1, alignItems: "center" },
  balanceDetailLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: 4 },
  balanceDetailValue: { fontSize: 16, fontWeight: "600", color: colors.text.primary },
  balanceDetailDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 8 },
  periodSummary: { flexDirection: "row", backgroundColor: colors.surface, marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  periodItem: { flex: 1, alignItems: "center" },
  periodLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: 4 },
  periodValue: { fontSize: 16, fontWeight: "600", color: colors.text.primary },
  periodDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 8 },
  chartContainer: { backgroundColor: colors.surface, marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  chartTitle: { fontSize: 16, fontWeight: "600", color: colors.text.primary, marginBottom: 12 },
  periodSelector: { flexDirection: "row", marginBottom: 16 },
  periodChip: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.background, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodChipText: { fontSize: 12, color: colors.text.secondary },
  periodChipTextActive: { color: colors.surface },
  chart: { marginVertical: 8, borderRadius: 16 },
  filtersContainer: { marginHorizontal: 20, marginTop: 16 },
  typeFilter: { flexDirection: "row" },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.background, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: 13, color: colors.text.secondary },
  typeChipTextActive: { color: colors.surface },
  transactionsSection: { marginHorizontal: 20, marginTop: 24 },
  transactionsTitle: { fontSize: 18, fontWeight: "600", color: colors.text.primary, marginBottom: 16 },
  transactionItem: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  transactionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: 12 },
  transactionInfo: { flex: 1 },
  transactionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  transactionTitle: { fontSize: 15, fontWeight: "500", color: colors.text.primary },
  transactionAmount: { fontSize: 16, fontWeight: "600" },
  transactionDescription: { fontSize: 13, color: colors.text.secondary, marginBottom: 8 },
  transactionFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  transactionDate: { fontSize: 11, color: colors.text.secondary },
  transactionStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  transactionStatusText: { fontSize: 10, fontWeight: "500" },
  loadMoreButton: { alignItems: "center", paddingVertical: 12 },
  loadMoreText: { color: colors.primary, fontSize: 14, fontWeight: "500" },
  statsSection: { marginHorizontal: 20, marginTop: 24 },
  statsTitle: { fontSize: 18, fontWeight: "600", color: colors.text.primary, marginBottom: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: colors.surface, borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 20, fontWeight: "bold", color: colors.text.primary, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.text.secondary, marginTop: 4, textAlign: "center" },
  bottomPadding: { height: 40 },
});
