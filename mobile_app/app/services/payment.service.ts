// services/payment.service.ts
import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { api } from "./api";
import { storage } from "./storage.service";

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  checkoutUrl: string;
  transactionId: string;
  expiresAt: string;
}

interface PaymentMethod {
  id: string;
  type: "chapa" | "mobile_money" | "bank_transfer" | "card";
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  processingFee?: number;
  minAmount?: number;
  maxAmount?: number;
}

interface Transaction {
  id: string;
  transactionId: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  paymentMethod: string;
  bookingId?: string;
  description?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: "pending" | "processing" | "completed" | "failed";
  paymentMethod: string;
  accountDetails: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    phoneNumber?: string;
  };
  createdAt: string;
  processedAt?: string;
}

interface WalletBalance {
  balance: number;
  pendingAmount: number;
  currency: string;
  lastUpdated: string;
}

interface TransactionHistoryResponse {
  data: Transaction[];
  meta: {
    total: number;
    currentPage: number;
    lastPage: number;
  };
}

interface TransactionHistoryResult {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
}

interface PaymentVerificationResult {
  status: "success" | "failed" | "pending";
  transactionId: string;
  amount: number;
  bookingId?: string;
}

interface MobileMoneyInitiationResult {
  transactionId: string;
  status: string;
  message: string;
}

interface MobileMoneyVerificationResult {
  status: "success" | "failed" | "pending";
  amount: number;
}

interface PaymentCallbackResult {
  success: boolean;
  transactionId?: string;
  status?: string;
}

interface BookingPaymentResult {
  success: boolean;
  transactionId?: string;
  checkoutUrl?: string;
  message?: string;
}

interface BookingPaymentStatus {
  status: "pending" | "paid" | "failed" | "refunded";
  amount: number;
  transactionId?: string;
  paidAt?: string;
}

interface RefundResult {
  refundId: string;
  status: string;
}

interface RefundStatus {
  status: "pending" | "approved" | "rejected" | "completed";
  amount: number;
  reason: string;
  processedAt?: string;
}

interface WalletTransactionsResponse {
  data: Transaction[];
  meta: {
    total: number;
  };
}

interface WalletTransactionsResult {
  transactions: Transaction[];
  total: number;
}

class PaymentService {
  private readonly BASE_PATH = "";
  private readonly CHAPA_REDIRECT_URL = "homelink://payment/callback";

  // ==================== Payment Methods ====================

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const cacheKey = "payment_methods";
    const cached = await storage.getItem<PaymentMethod[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await api.get<PaymentMethod[]>(
        `${this.BASE_PATH}/methods`,
      );

      if (response.success && response.data) {
        await storage.setItem(cacheKey, response.data, 24 * 60 * 60 * 1000); // 24 hours
        return response.data;
      }
    } catch (error) {
      console.warn("Failed to fetch payment methods:", error);
    }

    // Return default methods if API fails
    return this.getDefaultPaymentMethods();
  }

  private getDefaultPaymentMethods(): PaymentMethod[] {
    return [
      {
        id: "chapa",
        type: "chapa",
        name: "Chapa",
        description: "Pay with Credit/Debit Card, Bank Transfer",
        icon: "credit-card",
        enabled: true,
        processingFee: 0.035, // 3.5%
        minAmount: 10,
        maxAmount: 100000,
      },
      {
        id: "telebirr",
        type: "mobile_money",
        name: "Telebirr",
        description: "Pay with Telebirr Mobile Money",
        icon: "phone-portrait",
        enabled: true,
        processingFee: 0.02, // 2%
        minAmount: 5,
        maxAmount: 50000,
      },
      {
        id: "mpesa",
        type: "mobile_money",
        name: "M-Pesa",
        description: "Pay with M-Pesa",
        icon: "phone-portrait",
        enabled: true,
        processingFee: 0.02,
        minAmount: 5,
        maxAmount: 50000,
      },
      {
        id: "cash",
        type: "bank_transfer",
        name: "Cash on Service",
        description: "Pay after service completion",
        icon: "cash",
        enabled: true,
        processingFee: 0,
        minAmount: 0,
        maxAmount: 10000,
      },
    ];
  }

  // ==================== Chapa Integration ====================

  async initializeChapaPayment(data: {
    amount: number;
    currency?: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    customerId: string;
    bookingId?: string;
    paymentMethod?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentIntent> {
    const response = await api.post<any>(
      `${this.BASE_PATH}/customer/payment/initialize`,
      {
        amount: data.amount,
        customer_id: data.customerId,
        customer_email: data.email,
        customer_first_name: data.firstName,
        customer_last_name: data.lastName,
        customer_phone: data.phoneNumber,
        payment_method: data.paymentMethod || 'telebirr',
        booking_id: data.bookingId,
        callback_url: `${this.CHAPA_REDIRECT_URL}`,
        return_url: `${this.CHAPA_REDIRECT_URL}`,
        meta_data: data.metadata
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to initialize payment");
    }

    // Store payment intent
    await storage.setItem(`payment_intent_${response.data.payment_id}`, response.data);

    return {
      id: response.data.payment_id,
      amount: response.data.amount,
      currency: response.data.currency,
      status: response.data.status,
      checkoutUrl: response.data.checkout_url,
      transactionId: response.data.tx_ref,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };
  }

  async verifyChapaPayment(txRef: string): Promise<PaymentVerificationResult> {
    const response = await api.get<any>(
      `${this.BASE_PATH}/customer/payment/verify/${txRef}`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to verify payment");
    }

    return {
      status: response.data.status,
      transactionId: response.data.tx_ref,
      amount: response.data.amount,
      bookingId: response.data.booking_id,
    };
  }

  // ==================== WebView Payment Handling ====================

  async processWebViewPayment(
    checkoutUrl: string,
    onComplete?: (success: boolean, data?: any) => void,
  ): Promise<void> {
    try {
      // Open in WebBrowser
      const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: "#4F46E5",
      });

      if (result.type === "cancel") {
        onComplete?.(false, { cancelled: true });
      }
    } catch (error) {
      console.error("WebView payment failed:", error);
      onComplete?.(false, { error: (error as Error).message });
    }
  }

  // ==================== Mobile Money ====================

  async initiateMobileMoneyPayment(data: {
    provider: "telebirr" | "mpesa";
    amount: number;
    phoneNumber: string;
    bookingId?: string;
  }): Promise<MobileMoneyInitiationResult> {
    const response = await api.post<MobileMoneyInitiationResult>(
      `${this.BASE_PATH}/mobile-money/initiate`,
      data,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to initiate payment");
    }

    return response.data;
  }

  async verifyMobileMoneyPayment(
    transactionId: string,
  ): Promise<MobileMoneyVerificationResult> {
    const response = await api.get<MobileMoneyVerificationResult>(
      `${this.BASE_PATH}/mobile-money/verify/${transactionId}`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to verify payment");
    }

    return response.data;
  }

  // ==================== Transactions ====================

  async getTransactionHistory(
    page: number = 1,
    perPage: number = 20,
  ): Promise<TransactionHistoryResult> {
    const cacheKey = `transactions_${page}`;
    const cached = await storage.getItem<{
      transactions: Transaction[];
      total: number;
    }>(cacheKey);

    if (cached) {
      return {
        ...cached,
        hasMore: cached.transactions.length === perPage,
      };
    }

    const response = await api.get<TransactionHistoryResponse>(
      `${this.BASE_PATH}/transactions?page=${page}&per_page=${perPage}`,
    );

    if (response.success && response.data) {
      const result = {
        transactions: response.data.data,
        total: response.data.meta.total,
      };

      // Cache for 5 minutes
      await storage.setItem(cacheKey, result, 5 * 60 * 1000);

      return {
        ...result,
        hasMore: response.data.meta.currentPage < response.data.meta.lastPage,
      };
    }

    return { transactions: [], total: 0, hasMore: false };
  }

  async getTransactionDetails(id: string): Promise<Transaction> {
    const cacheKey = `transaction_${id}`;
    const cached = await storage.getItem<Transaction>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await api.get<Transaction>(
      `${this.BASE_PATH}/transactions/${id}`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to fetch transaction");
    }

    await storage.setItem(cacheKey, response.data);
    return response.data;
  }

  // ==================== Wallet ====================

  async getWalletBalance(): Promise<WalletBalance> {
    const cacheKey = "wallet_balance";
    const cached = await storage.getItem<WalletBalance>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await api.get<WalletBalance>(
      `${this.BASE_PATH}/wallet/balance`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to fetch wallet balance");
    }

    await storage.setItem(cacheKey, response.data, 60 * 1000); // 1 minute cache
    return response.data;
  }

  async getWalletTransactions(
    page: number = 1,
    type?: "credit" | "debit" | "all",
  ): Promise<WalletTransactionsResult> {
    const url =
      type && type !== "all"
        ? `${this.BASE_PATH}/wallet/transactions?page=${page}&type=${type}`
        : `${this.BASE_PATH}/wallet/transactions?page=${page}`;

    const response = await api.get<WalletTransactionsResponse>(url);

    if (response.success && response.data) {
      return {
        transactions: response.data.data,
        total: response.data.meta.total,
      };
    }

    return { transactions: [], total: 0 };
  }

  // ==================== Withdrawals ====================

  async requestWithdrawal(data: {
    amount: number;
    providerId: string;
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  }): Promise<WithdrawalRequest> {
    const response = await api.post<any>(
      `${this.BASE_PATH}/provider/withdrawal/create`,
      {
        amount: data.amount,
        provider_id: data.providerId,
        bank_name: data.bankName,
        account_number: data.accountNumber,
        account_holder_name: data.accountHolderName,
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to request withdrawal");
    }

    // Invalidate wallet balance cache
    await storage.removeItem("wallet_balance");

    return {
      id: response.data.withdrawal_id || response.data.id,
      amount: response.data.amount,
      fee: response.data.platform_fee || 0,
      netAmount: response.data.net_amount || response.data.amount,
      status: response.data.status,
      paymentMethod: "bank",
      accountDetails: {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountHolderName,
      },
      createdAt: new Date().toISOString(),
    };
  }

  async getWithdrawalHistory(providerId?: string): Promise<WithdrawalRequest[]> {
    const url = providerId 
      ? `${this.BASE_PATH}/provider/withdrawal/history/${providerId}`
      : `${this.BASE_PATH}/withdrawals`;
      
    const response = await api.get<any[]>(url);

    if (response.success && response.data) {
      return response.data.map((withdrawal: any) => ({
        id: withdrawal.id,
        amount: withdrawal.amount,
        fee: withdrawal.platform_fee || 0,
        netAmount: withdrawal.net_amount || withdrawal.amount,
        status: withdrawal.status,
        paymentMethod: "bank",
        accountDetails: {
          bankName: withdrawal.provider_bank_name || withdrawal.bankName,
          accountNumber: withdrawal.provider_account_number || withdrawal.accountNumber,
          accountName: withdrawal.provider_account_holder_name || withdrawal.accountHolderName,
        },
        createdAt: withdrawal.created_at || withdrawal.createdAt,
        processedAt: withdrawal.processed_at || withdrawal.processedAt,
      }));
    }

    return [];
  }

  // ==================== Payment for Bookings ====================

  async payForBooking(
    bookingId: string,
    paymentMethodId: string,
  ): Promise<BookingPaymentResult> {
    const response = await api.post<BookingPaymentResult>(
      `${this.BASE_PATH}/booking/${bookingId}/pay`,
      {
        payment_method_id: paymentMethodId,
      },
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Payment failed");
    }

    return response.data;
  }

  async getBookingPaymentStatus(
    bookingId: string,
  ): Promise<BookingPaymentStatus> {
    const response = await api.get<BookingPaymentStatus>(
      `${this.BASE_PATH}/booking/${bookingId}/status`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to fetch payment status");
    }

    return response.data;
  }

  // ==================== Refunds ====================

  async requestRefund(
    bookingId: string,
    reason: string,
  ): Promise<RefundResult> {
    const response = await api.post<RefundResult>(`${this.BASE_PATH}/refunds`, {
      booking_id: bookingId,
      reason,
    });

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to request refund");
    }

    return response.data;
  }

  async getRefundStatus(refundId: string): Promise<RefundStatus> {
    const response = await api.get<RefundStatus>(
      `${this.BASE_PATH}/refunds/${refundId}`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to fetch refund status");
    }

    return response.data;
  }

  // ==================== Deep Link Handling ====================

  async handlePaymentCallback(url: string): Promise<PaymentCallbackResult> {
    try {
      const parsedUrl = new URL(url);
      const params = new URLSearchParams(parsedUrl.search);

      const txRef = params.get("tx_ref");
      const status = params.get("status");

      if (!txRef) {
        return { success: false };
      }

      if (status === "success" || status === "completed") {
        const verification = await this.verifyChapaPayment(txRef);
        return {
          success: verification.status === "success",
          transactionId: verification.transactionId,
          status: verification.status,
        };
      }

      return { success: false, status: status || undefined };
    } catch (error) {
      console.error("Failed to handle payment callback:", error);
      return { success: false };
    }
  }

  // ==================== Receipts ====================

  async generateReceipt(transactionId: string): Promise<string> {
    const response = await api.get<{ url: string }>(
      `${this.BASE_PATH}/receipts/${transactionId}`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to generate receipt");
    }

    return response.data.url;
  }

  async downloadReceipt(transactionId: string): Promise<void> {
    const url = await this.generateReceipt(transactionId);

    if (Platform.OS === "ios") {
      await WebBrowser.openBrowserAsync(url);
    } else {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: url,
      });
    }
  }
}

export const paymentService = new PaymentService();
