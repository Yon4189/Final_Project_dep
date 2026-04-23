// hooks/usePayment.ts
import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { paymentService } from '@/app/services/payment.service';
import type { 
  PaymentIntent,
  PaymentMethod,
  Transaction,
  WalletBalance,
  WithdrawalRequest,
  BookingPaymentResult,
  BookingPaymentStatus,
  RefundResult,
  RefundStatus,
  PaymentVerificationResult,
  MobileMoneyInitiationResult,
  MobileMoneyVerificationResult,
  PaymentCallbackResult,
  TransactionHistoryResult,
  WalletTransactionsResult,
} from '@/types/index';

// Query Keys
export const paymentKeys = {
  all: ['payment'] as const,
  methods: () => [...paymentKeys.all, 'methods'] as const,
  balance: () => [...paymentKeys.all, 'balance'] as const,
  transactions: (page?: number) => [...paymentKeys.all, 'transactions', page] as const,
  walletTransactions: (page?: number, type?: string) => [...paymentKeys.all, 'wallet-transactions', page, type] as const,
  withdrawals: () => [...paymentKeys.all, 'withdrawals'] as const,
  bookingPaymentStatus: (bookingId: string) => [...paymentKeys.all, 'booking-payment-status', bookingId] as const,
  refundStatus: (refundId: string) => [...paymentKeys.all, 'refund-status', refundId] as const,
};

// Utility function to handle query errors
const handleQueryError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'An error occurred';
  Alert.alert('Error', message);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

// Utility function to handle mutation success
const handleMutationSuccess = (message?: string) => {
  if (message) {
    Alert.alert('Success', message);
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// ==================== Payment Methods ====================

export function usePaymentMethods(options?: UseQueryOptions<PaymentMethod[]>) {
  return useQuery<PaymentMethod[], Error>({
    queryKey: paymentKeys.methods(),
    queryFn: async () => {
      const response = await paymentService.getPaymentMethods();
      return response;
    },
    ...options,
  });
}

// ==================== Wallet Management ====================

export function useWalletBalance(options?: UseQueryOptions<WalletBalance>) {
  return useQuery<WalletBalance, Error>({
    queryKey: paymentKeys.balance(),
    queryFn: async () => {
      const response = await paymentService.getWalletBalance();
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    ...options,
  });
}

export function useTransactionHistory(
  page: number = 1,
  options?: UseQueryOptions<TransactionHistoryResult>
) {
  return useQuery<TransactionHistoryResult, Error>({
    queryKey: paymentKeys.transactions(page),
    queryFn: async () => {
      const response = await paymentService.getTransactionHistory(page);
      if (!response.success) throw new Error(response.message);
      return response;
    },
    ...options,
  });
}

export function useWalletTransactions(
  page: number = 1,
  type?: "credit" | "debit" | "all",
  options?: UseQueryOptions<WalletTransactionsResult>
) {
  return useQuery<WalletTransactionsResult, Error>({
    queryKey: paymentKeys.walletTransactions(page, type),
    queryFn: async () => {
      const response = await paymentService.getWalletTransactions(page, type);
      if (!response.success) throw new Error(response.message);
      return response;
    },
    ...options,
  });
}

// ==================== Chapa Payment ====================

export function useInitializeChapaPayment(options?: UseMutationOptions<PaymentIntent, Error, any>) {
  return useMutation<PaymentIntent, Error, any>({
    mutationFn: async (data: any) => {
      const response = await paymentService.initializeChapaPayment(data);
      return response as unknown as PaymentIntent;
    },
    onSuccess: (data, variables, context, meta) => {
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      options?.onError?.(error, variables, context, meta);
    },
  });
}

export function useVerifyChapaPayment(options?: UseMutationOptions<PaymentVerificationResult, Error, string>) {
  return useMutation<PaymentVerificationResult, Error, string>({
    mutationFn: async (txRef: string) => {
      const response = await paymentService.verifyChapaPayment(txRef);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context, meta) => {
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      options?.onError?.(error, variables, context, meta);
    },
  });
}

// ==================== Mobile Money ====================

export function useInitiateMobileMoneyPayment(options?: UseMutationOptions<MobileMoneyInitiationResult, Error, any>) {
  return useMutation<MobileMoneyInitiationResult, Error, any>({
    mutationFn: async (data: any) => {
      const response = await paymentService.initiateMobileMoneyPayment(data);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context, meta) => {
      handleMutationSuccess('Mobile money payment initiated');
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context, meta);
    },
  });
}

export function useVerifyMobileMoneyPayment(options?: UseMutationOptions<MobileMoneyVerificationResult, Error, string>) {
  return useMutation<MobileMoneyVerificationResult, Error, string>({
    mutationFn: async (transactionId: string) => {
      const response = await paymentService.verifyMobileMoneyPayment(transactionId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context, meta) => {
      handleMutationSuccess('Mobile money payment verified');
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context, meta);
    },
  });
}

// ==================== Booking Payments ====================

export function usePayForBooking(options?: UseMutationOptions<BookingPaymentResult, Error, { bookingId: string; paymentMethodId: string }>) {
  const queryClient = useQueryClient();

  return useMutation<BookingPaymentResult, Error, { bookingId: string; paymentMethodId: string }>({
    mutationFn: async ({ bookingId, paymentMethodId }) => {
      const response = await paymentService.payForBooking(bookingId, paymentMethodId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context, meta) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: paymentKeys.balance() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.bookingPaymentStatus(variables.bookingId) });
      
      handleMutationSuccess('Payment successful');
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context, meta);
    },
  });
}

export function useBookingPaymentStatus(
  bookingId: string,
  options?: UseQueryOptions<BookingPaymentStatus>
) {
  return useQuery<BookingPaymentStatus, Error>({
    queryKey: paymentKeys.bookingPaymentStatus(bookingId),
    queryFn: async () => {
      const response = await paymentService.getBookingPaymentStatus(bookingId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    enabled: !!bookingId,
    ...options,
  });
}

// ==================== Withdrawals ====================

export function useRequestWithdrawal(options?: UseMutationOptions<WithdrawalRequest, Error, any>) {
  const queryClient = useQueryClient();

  return useMutation<WithdrawalRequest, Error, any>({
    mutationFn: async (data: any) => {
      const response = await paymentService.requestWithdrawal(data);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context, meta) => {
      // Invalidate wallet balance and withdrawals
      queryClient.invalidateQueries({ queryKey: paymentKeys.balance() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.withdrawals() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.walletTransactions() });
      
      handleMutationSuccess('Withdrawal request submitted');
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context, meta);
    },
  });
}

export function useWithdrawalHistory(options?: UseQueryOptions<WithdrawalRequest[]>) {
  return useQuery<WithdrawalRequest[], Error>({
    queryKey: paymentKeys.withdrawals(),
    queryFn: async () => {
      const response = await paymentService.getWithdrawalHistory();
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    ...options,
  });
}

// ==================== Refunds ====================

export function useRequestRefund(options?: UseMutationOptions<RefundResult, Error, { bookingId: string; reason: string }>) {
  const queryClient = useQueryClient();

  return useMutation<RefundResult, Error, { bookingId: string; reason: string }>({
    mutationFn: async ({ bookingId, reason }) => {
      const response = await paymentService.requestRefund(bookingId, reason);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context, meta) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: paymentKeys.balance() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.bookingPaymentStatus(variables.bookingId) });
      
      handleMutationSuccess('Refund request submitted');
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context, meta);
    },
  });
}

export function useRefundStatus(
  refundId: string,
  options?: UseQueryOptions<RefundStatus>
) {
  return useQuery<RefundStatus, Error>({
    queryKey: paymentKeys.refundStatus(refundId),
    queryFn: async () => {
      const response = await paymentService.getRefundStatus(refundId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    enabled: !!refundId,
    ...options,
  });
}

// ==================== Payment Callbacks ====================

export function useHandlePaymentCallback(options?: UseMutationOptions<PaymentCallbackResult, Error, string>) {
  return useMutation<PaymentCallbackResult, Error, string>({
    mutationFn: async (url: string) => {
      const response = await paymentService.handlePaymentCallback(url);
      if (!response.success) throw new Error(response.message || 'Payment callback failed');
      return response.data;
    },
    onSuccess: (data, variables, context, meta) => {
      if (data.success) {
        handleMutationSuccess('Payment completed successfully');
      } else {
        handleQueryError(new Error('Payment failed'));
      }
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context, meta);
    },
  });
}

// ==================== Receipts ====================

export function useGenerateReceipt(options?: UseMutationOptions<string, Error, string>) {
  return useMutation<string, Error, string>({
    mutationFn: async (transactionId: string) => {
      const response = await paymentService.generateReceipt(transactionId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context, meta) => {
      handleMutationSuccess('Receipt generated successfully');
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context, meta);
    },
  });
}

export function useDownloadReceipt(options?: UseMutationOptions<void, Error, string>) {
  return useMutation<void, Error, string>({
    mutationFn: async (transactionId: string) => {
      const response = await paymentService.downloadReceipt(transactionId);
      if (!response) throw new Error('Failed to download receipt');
      return response;
    },
    onSuccess: (data, variables, context, meta) => {
      handleMutationSuccess('Receipt downloaded successfully');
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context, meta);
    },
  });
}
