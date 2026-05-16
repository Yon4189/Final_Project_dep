// store/earningsStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { produce } from "immer";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { providerService } from "../services/provider.service";
import type {
  BankDetails,
  EarningsSummary,
  Transaction,
  WithdrawalRequest,
} from "../types/provider.types";

// Define the transaction response type
interface TransactionResponse {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
  page?: number;
}

interface EarningsState {
  // Summary
  summary: EarningsSummary | null;

  // Transactions
  transactions: Transaction[];
  transactionsPage: number;
  hasMoreTransactions: boolean;
  totalTransactions: number;

  // Withdrawals
  withdrawals: WithdrawalRequest[];
  pendingWithdrawals: WithdrawalRequest[];

  // Bank Details
  bankDetails: BankDetails | null;

  // Chart Data
  chartData: {
    weekly: any;
    monthly: any;
    yearly: any;
  } | null;

  // Loading States
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  isRefreshing: boolean;

  // Sync
  lastSync: number | null;
}

interface EarningsActions {
  // Summary Actions
  setSummary: (summary: EarningsSummary | null) => void;
  loadSummary: () => Promise<void>;

  // Transaction Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  loadTransactions: (page?: number, refresh?: boolean) => Promise<void>;
  loadMoreTransactions: () => Promise<void>;

  // Withdrawal Actions
  setWithdrawals: (withdrawals: WithdrawalRequest[]) => void;
  addWithdrawal: (withdrawal: WithdrawalRequest) => void;
  updateWithdrawal: (id: string, data: Partial<WithdrawalRequest>) => void;
  loadWithdrawals: () => Promise<void>;

  // Bank Actions
  setBankDetails: (details: BankDetails | null) => void;
  loadBankDetails: () => Promise<void>;
  updateBankDetails: (data: Partial<BankDetails>) => Promise<void>;

  // Chart Actions
  setChartData: (data: any) => void;
  loadChartData: (period: "week" | "month" | "year") => Promise<void>;

  // Withdrawal Actions
  requestWithdrawal: (amount: number, bankDetailsId?: string) => Promise<void>;

  // UI Actions
  setLoading: (isLoading: boolean) => void;
  setLoadingMore: (isLoadingMore: boolean) => void;
  setError: (error: string | null) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  setLastSync: (timestamp: number) => void;

  // Batch Actions
  refreshAll: () => Promise<void>;
  hydrateFromAPI: (data: Partial<EarningsState>) => void;
  reset: () => void;
}

const initialState: EarningsState = {
  summary: null,
  transactions: [],
  transactionsPage: 1,
  hasMoreTransactions: false,
  totalTransactions: 0,
  withdrawals: [],
  pendingWithdrawals: [],
  bankDetails: null,
  chartData: null,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  isRefreshing: false,
  lastSync: null,
};

export const useEarningsStore = create<EarningsState & EarningsActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Summary Actions
      setSummary: (summary) => set({ summary }),

      loadSummary: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await providerService.getEarningsSummary();
          if (response.success && response.data) {
            set({ summary: response.data as EarningsSummary });
          } else {
            set({ error: response.message });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load earnings summary",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // Transaction Actions
      setTransactions: (transactions) => set({ transactions }),

      addTransactions: (newTransactions) =>
        set(
          produce((state: EarningsState) => {
            state.transactions = [...state.transactions, ...newTransactions];
          }),
        ),

      addTransaction: (transaction) =>
        set(
          produce((state: EarningsState) => {
            state.transactions.unshift(transaction);
          }),
        ),

      updateTransaction: (id, data) =>
        set(
          produce((state: EarningsState) => {
            const index = state.transactions.findIndex((t) => t.id === id);
            if (index !== -1) {
              state.transactions[index] = {
                ...state.transactions[index],
                ...data,
              };
            }
          }),
        ),

      loadTransactions: async (page = 1, refresh = false) => {
        try {
          if (refresh) {
            set({ isLoading: true });
          } else if (page > 1) {
            set({ isLoadingMore: true });
          }

          const response = await providerService.getTransactions(page);

          if (response.success && response.data) {
            // response.data already has transactions, total, hasMore
            const { transactions, total, hasMore } = response.data;

            set(
              produce((state: EarningsState) => {
                if (refresh || page === 1) {
                  state.transactions = transactions;
                } else {
                  state.transactions = [...state.transactions, ...transactions];
                }

                state.totalTransactions = total;
                state.hasMoreTransactions = hasMore;
                state.transactionsPage = page;
              }),
            );
          } else {
            set({ error: response.message });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load transactions",
          });
        } finally {
          set({ isLoading: false, isLoadingMore: false });
        }
      },

      loadMoreTransactions: async () => {
        const { hasMoreTransactions, transactionsPage, isLoadingMore } = get();
        if (!hasMoreTransactions || isLoadingMore) return;

        await get().loadTransactions(transactionsPage + 1);
      },

      // Withdrawal Actions
      setWithdrawals: (withdrawals) => set({ withdrawals }),

      addWithdrawal: (withdrawal) =>
        set(
          produce((state: EarningsState) => {
            state.withdrawals.unshift(withdrawal);
            if (withdrawal.status === "pending") {
              state.pendingWithdrawals.unshift(withdrawal);
            }
          }),
        ),

      updateWithdrawal: (id, data) =>
        set(
          produce((state: EarningsState) => {
            const index = state.withdrawals.findIndex((w) => w.id === id);
            if (index !== -1) {
              state.withdrawals[index] = {
                ...state.withdrawals[index],
                ...data,
              };

              // Update pending withdrawals
              const pendingIndex = state.pendingWithdrawals.findIndex(
                (w) => w.id === id,
              );
              if (pendingIndex !== -1) {
                if (data.status && data.status !== "pending") {
                  state.pendingWithdrawals = state.pendingWithdrawals.filter(
                    (w) => w.id !== id,
                  );
                } else {
                  state.pendingWithdrawals[pendingIndex] = {
                    ...state.pendingWithdrawals[pendingIndex],
                    ...data,
                  };
                }
              } else if (data.status === "pending") {
                state.pendingWithdrawals.unshift(state.withdrawals[index]);
              }
            }
          }),
        ),

      loadWithdrawals: async () => {
        try {
          const response = await providerService.getWithdrawalHistory();
          if (response.success && response.data) {
            set(
              produce((state: EarningsState) => {
                state.withdrawals = response.data as WithdrawalRequest[];
                state.pendingWithdrawals = (
                  response.data as WithdrawalRequest[]
                ).filter((w) => w.status === "pending");
              }),
            );
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load withdrawals",
          });
        }
      },

      // Bank Actions
      setBankDetails: (details) => set({ bankDetails: details }),

      loadBankDetails: async () => {
        try {
          const response = await providerService.getBankDetails();
          if (response.success && response.data) {
            set({ bankDetails: response.data as BankDetails });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load bank details",
          });
        }
      },

      updateBankDetails: async (data) => {
        try {
          set({ isLoading: true });
          const response = await providerService.updateBankDetails(data);
          if (response.success && response.data) {
            set({ bankDetails: response.data as BankDetails });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to update bank details",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // Chart Actions
      setChartData: (data) => set({ chartData: data }),

      loadChartData: async (period) => {
        try {
          // This would be implemented in the service
          // For now, generate mock data
          const mockData = {
            week: {
              labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
              data: [120, 250, 180, 320, 290, 410, 380],
            },
            month: {
              labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
              data: [1250, 1580, 1420, 1890],
            },
            year: {
              labels: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
              data: [
                5200, 6800, 7200, 8900, 10500, 12300, 11800, 14500, 16200,
                15800, 17900, 20100,
              ],
            },
          };

          set(
            produce((state: EarningsState) => {
              if (!state.chartData) {
                state.chartData = { weekly: null, monthly: null, yearly: null };
              }
              const key =
                period === "week"
                  ? "weekly"
                  : period === "month"
                    ? "monthly"
                    : "yearly";
              state.chartData[key] = mockData[period];
            }),
          );
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load chart data",
          });
        }
      },

      // Withdrawal Request
      requestWithdrawal: async (amount, bankDetailsId) => {
        try {
          set({ isLoading: true });
          const response = await providerService.requestWithdrawal({
            amount,
            bankDetailsId,
          });
          if (response.success && response.data) {
            get().addWithdrawal(response.data as WithdrawalRequest);
            // Refresh summary to update balance
            await get().loadSummary();
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to request withdrawal",
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // UI Actions
      setLoading: (isLoading) => set({ isLoading }),

      setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),

      setError: (error) => set({ error }),

      setRefreshing: (isRefreshing) => set({ isRefreshing }),

      setLastSync: (timestamp) => set({ lastSync: timestamp }),

      // Batch Actions
      refreshAll: async () => {
        set({ isRefreshing: true, error: null });
        try {
          await Promise.all([
            get().loadSummary(),
            get().loadTransactions(1, true),
            get().loadWithdrawals(),
            get().loadBankDetails(),
            get().loadChartData("week"),
            get().loadChartData("month"),
            get().loadChartData("year"),
          ]);
          set({ lastSync: Date.now() });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to refresh earnings data",
          });
        } finally {
          set({ isRefreshing: false });
        }
      },

      hydrateFromAPI: (data) =>
        set(
          produce((state: EarningsState) => {
            if (data.summary) state.summary = data.summary;
            if (data.transactions) state.transactions = data.transactions;
            if (data.withdrawals) state.withdrawals = data.withdrawals;
            if (data.bankDetails) state.bankDetails = data.bankDetails;
            if (data.chartData) state.chartData = data.chartData;
            state.lastSync = Date.now();
          }),
        ),

      reset: () => set(initialState),
    }),
    {
      name: "earnings-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        summary: state.summary,
        bankDetails: state.bankDetails,
      }),
    },
  ),
);

// Selector Hooks
export const useEarningsSummary = () =>
  useEarningsStore((state) => state.summary);
export const useTransactions = () =>
  useEarningsStore((state) => state.transactions);
export const useWithdrawals = () =>
  useEarningsStore((state) => state.withdrawals);
export const usePendingWithdrawals = () =>
  useEarningsStore((state) => state.pendingWithdrawals);
export const useEarningsBankDetails = () =>
  useEarningsStore((state) => state.bankDetails);
export const useChartData = () => useEarningsStore((state) => state.chartData);
export const useHasMoreTransactions = () =>
  useEarningsStore((state) => state.hasMoreTransactions);
export const useEarningsLoading = () =>
  useEarningsStore((state) => state.isLoading);
export const useEarningsLoadingMore = () =>
  useEarningsStore((state) => state.isLoadingMore);
export const useEarningsError = () => useEarningsStore((state) => state.error);

// Computed Selectors
export const useTotalEarnings = () => {
  const summary = useEarningsSummary();
  return summary?.totalEarnings || 0;
};

export const useAvailableBalance = () => {
  const summary = useEarningsSummary();
  return summary?.availableForWithdrawal || 0;
};

export const usePendingEarnings = () => {
  const summary = useEarningsSummary();
  return summary?.pendingEarnings || 0;
};

export const useRecentTransactions = (limit: number = 5) => {
  const transactions = useTransactions();
  return transactions.slice(0, limit);
};

export const useTransactionStats = () => {
  const transactions = useTransactions();

  const thisMonth = transactions
    .filter((t) => {
      const date = new Date(t.createdAt);
      const now = new Date();
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const lastMonth = transactions
    .filter((t) => {
      const date = new Date(t.createdAt);
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      return (
        date.getMonth() === lastMonth.getMonth() &&
        date.getFullYear() === lastMonth.getFullYear()
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const growth =
    lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  return { thisMonth, lastMonth, growth };
};

// Action Hooks
export const useEarningsActions = () => {
  const store = useEarningsStore();
  return {
    loadSummary: store.loadSummary,
    loadTransactions: store.loadTransactions,
    loadMoreTransactions: store.loadMoreTransactions,
    loadWithdrawals: store.loadWithdrawals,
    loadBankDetails: store.loadBankDetails,
    updateBankDetails: store.updateBankDetails,
    loadChartData: store.loadChartData,
    requestWithdrawal: store.requestWithdrawal,
    refreshAll: store.refreshAll,
    reset: store.reset,
  };
};
