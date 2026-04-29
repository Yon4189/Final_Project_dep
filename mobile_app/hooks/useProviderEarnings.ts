// hooks/useProviderEarnings.ts
import { useQuery, useMutation, useInfiniteQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { providerService } from '@/app/services/provider.service';
import type { EarningsSummary, WithdrawalRequest, BankDetails } from '@/app/types/provider.types';

// Query Keys
export const earningsKeys = {
  all: ['earnings'] as const,
  summary: () => [...earningsKeys.all, 'summary'] as const,
  transactions: () => [...earningsKeys.all, 'transactions'] as const,
  transaction: (id: string) => [...earningsKeys.transactions(), id] as const,
  withdrawals: () => [...earningsKeys.all, 'withdrawals'] as const,
  withdrawal: (id: string) => [...earningsKeys.withdrawals(), id] as const,
  bankDetails: () => [...earningsKeys.all, 'bank'] as const,
  chart: (period: string) => [...earningsKeys.all, 'chart', period] as const,
};

// Utility functions
const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'An error occurred';
  Alert.alert('Error', message);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

const handleSuccess = (message?: string) => {
  if (message) {
    Alert.alert('Success', message);
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// ==================== Earnings Summary Hooks ====================

export function useEarningsSummary(options?: UseQueryOptions<EarningsSummary>) {
  return useQuery<EarningsSummary, Error>({
    queryKey: earningsKeys.summary(),
    queryFn: async () => {
      const response = await providerService.getEarningsSummary();
      if (!response.success) throw new Error(response.message);
      return response.data as EarningsSummary;
    },
    ...options,
  });
}

// ==================== Transaction Hooks ====================

export function useTransactions() {
  return useInfiniteQuery({
    queryKey: earningsKeys.transactions(),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await providerService.getTransactions(pageParam);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    getNextPageParam: (lastPage: any) => {
      return lastPage?.hasMore ? (lastPage?.currentPage || 1) + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useTransactionHistory(page: number = 1) {
  return useQuery<any, Error>({
    queryKey: [...earningsKeys.transactions(), page],
    queryFn: async () => {
      const response = await providerService.getTransactions(page);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
  });
}

// ==================== Withdrawal Hooks ====================

export function useWithdrawalHistory(options?: UseQueryOptions<WithdrawalRequest[]>) {
  return useQuery<WithdrawalRequest[], Error>({
    queryKey: earningsKeys.withdrawals(),
    queryFn: async () => {
      const response = await providerService.getWithdrawalHistory();
      if (!response.success) throw new Error(response.message);
      return response.data as WithdrawalRequest[];
    },
    ...options,
  });
}
type WithdrawalVariables = {
  amount: number;
  payment_method: 'bank' | 'telebir';
  bank_name?: string;
  account_number?: string;
  account_holder_name?: string;
  telebir_number?: string;
  telebir_holder_name?: string;
};

export function useRequestWithdrawal(options?: UseMutationOptions<WithdrawalRequest, Error, WithdrawalVariables>) {
  const queryClient = useQueryClient();

  return useMutation<WithdrawalRequest, Error, WithdrawalVariables>({
    mutationFn: async (data) => {
      const response = await providerService.requestWithdrawal(data);
      if (!response.success) throw new Error(response.message);
      return response.data as WithdrawalRequest;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: earningsKeys.summary() });
      queryClient.invalidateQueries({ queryKey: earningsKeys.withdrawals() });
      queryClient.invalidateQueries({ queryKey: earningsKeys.transactions() });
      handleSuccess('Withdrawal request submitted successfully');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

// ==================== Bank Details Hooks ====================

export function useBankDetails(options?: UseQueryOptions<BankDetails>) {
  return useQuery<BankDetails, Error>({
    queryKey: earningsKeys.bankDetails(),
    queryFn: async () => {
      const response = await providerService.getBankDetails();
      if (!response.success) throw new Error(response.message);
      return response.data as BankDetails;
    },
    ...options,
  });
}

export function useBankAccounts(options?: UseQueryOptions<BankDetails[]>) {
  return useQuery<BankDetails[], Error>({
    queryKey: [...earningsKeys.bankDetails(), 'list'],
    queryFn: async () => {
      console.log('🔍 Fetching bank accounts...');
      const response = await providerService.getBankAccounts();
      console.log('📦 Bank accounts response:', response);
      if (!response.success) throw new Error(response.message);
      console.log('✅ Bank accounts data:', response.data);
      return response.data as BankDetails[];
    },
    ...options,
  });
}

export function useUpdateBankDetails(options?: UseMutationOptions<BankDetails, Error, Partial<BankDetails>>) {
  const queryClient = useQueryClient();

  return useMutation<BankDetails, Error, Partial<BankDetails>>({
    mutationFn: async (data) => {
      const response = await providerService.updateBankDetails(data);
      if (!response.success) throw new Error(response.message);
      return response.data as BankDetails;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: earningsKeys.bankDetails() });
      handleSuccess('Bank details updated successfully');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

// ==================== Chart Data Hook ====================

export function useEarningsChartData(period: 'week' | 'month' | 'year' = 'month') {
  return useQuery<any, Error>({
    queryKey: earningsKeys.chart(period),
    queryFn: async () => {
      // This would be implemented in the service
      // For now, return mock data
      const mockData = {
        labels: period === 'week' 
          ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          : period === 'month'
          ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
          : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          data: period === 'week'
            ? [120, 250, 180, 320, 290, 410, 380]
            : period === 'month'
            ? [1250, 1580, 1420, 1890]
            : [5200, 6800, 7200, 8900, 10500, 12300, 11800, 14500, 16200, 15800, 17900, 20100],
        }],
      };
      return mockData;
    },
  });
}

// ==================== Combined Earnings Hook ====================

export function useProviderEarnings(period: 'week' | 'month' | 'year' = 'month') {
  const summaryQuery = useEarningsSummary();
  const transactionsQuery = useTransactions();
  const chartDataQuery = useEarningsChartData(period);
  const bankDetailsQuery = useBankDetails();
  const bankAccountsQuery = useBankAccounts();
  const withdrawalHistoryQuery = useWithdrawalHistory();

  const isLoading = 
    summaryQuery.isLoading || 
    transactionsQuery.isLoading || 
    chartDataQuery.isLoading ||
    bankDetailsQuery.isLoading ||
    bankAccountsQuery.isLoading ||
    withdrawalHistoryQuery.isLoading;

  const refetch = async () => {
    await Promise.all([
      summaryQuery.refetch(),
      transactionsQuery.refetch(),
      chartDataQuery.refetch(),
      bankDetailsQuery.refetch(),
      bankAccountsQuery.refetch(),
      withdrawalHistoryQuery.refetch(),
    ]);
  };

  const requestWithdrawal = useRequestWithdrawal();
  const updateBankDetails = useUpdateBankDetails();

  // Flatten transactions from infinite query
  const transactions = transactionsQuery.data?.pages.flatMap(page => page?.transactions || []) || [];

  // Get total count
  const totalTransactions = transactionsQuery.data?.pages[0]?.total || 0;

  return {
    // Data
    summary: summaryQuery.data,
    transactions,
    totalTransactions,
    chartData: chartDataQuery.data,
    bankDetails: bankDetailsQuery.data,
    bankAccounts: bankAccountsQuery.data || [],
    withdrawals: withdrawalHistoryQuery.data || [],
    
    // Loading states
    isLoading,
    isSummaryLoading: summaryQuery.isLoading,
    isTransactionsLoading: transactionsQuery.isLoading,
    isChartLoading: chartDataQuery.isLoading,
    isBankLoading: bankDetailsQuery.isLoading,
    isBankAccountsLoading: bankAccountsQuery.isLoading,
    isWithdrawalsLoading: withdrawalHistoryQuery.isLoading,
    
    // Error states
    error: summaryQuery.error || transactionsQuery.error || chartDataQuery.error,
    summaryError: summaryQuery.error,
    transactionsError: transactionsQuery.error,
    chartError: chartDataQuery.error,
    
    // Pagination
    loadMore: transactionsQuery.fetchNextPage,
    hasMore: transactionsQuery.hasNextPage || false,
    isFetchingMore: transactionsQuery.isFetchingNextPage,
    
    // Refetch
    refetch,
    
    // Mutations
    requestWithdrawal,
    updateBankDetails,
  };
}

// ==================== Analytics Hooks ====================

export function useEarningsAnalytics() {
  const summaryQuery = useEarningsSummary();
  
  const calculateGrowth = () => {
    if (!summaryQuery.data) return null;
    
    const growth = {
      week: 0,
      month: 0,
      year: 0,
    };
    
    // Calculate growth percentages
    if (summaryQuery.data.lastMonth && summaryQuery.data.lastMonth > 0) {
      growth.month = ((summaryQuery.data.thisMonth - summaryQuery.data.lastMonth) / summaryQuery.data.lastMonth) * 100;
    }
    
    return growth;
  };

  const getAveragePerJob = () => {
    if (!summaryQuery.data || !summaryQuery.data.completedJobs || summaryQuery.data.completedJobs === 0) return 0;
    return summaryQuery.data.totalEarnings / summaryQuery.data.completedJobs;
  };

  const getProjectedEarnings = () => {
    if (!summaryQuery.data) return 0;
    // Simple projection based on this month's earnings
    const daysInMonth = 30;
    const today = new Date().getDate();
    const dailyAverage = summaryQuery.data.thisMonth / today;
    return dailyAverage * daysInMonth;
  };

  return {
    growth: calculateGrowth(),
    averagePerJob: getAveragePerJob(),
    projectedEarnings: getProjectedEarnings(),
    isLoading: summaryQuery.isLoading,
    error: summaryQuery.error,
  };
}

// Export the main hook for easy access
export default useProviderEarnings;