// types/index.ts
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  profile_image?: string;
  role: 'customer' | 'provider' | 'admin';
  created_at: string;
}

export interface Provider {
  id: number;
  user_id: number;
  business_name: string;
  description?: string;
  category?: {
    id: number;
    name: string;
  };
  hourly_rate: number;
  verified: boolean;
  online_status: boolean;
  rating_avg?: number;
  review_count?: number;
  completed_jobs_count?: number;
  profile_image?: string;
  distance?: number;
  response_time?: string;
  services?: Array<{
    id: number;
    name: string;
    price?: number;
  }>;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Booking {
  id: number;
  booking_number: string;
  customer_id: number;
  provider_id: number;
  category_id: number;
  service_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_hours?: number;
  address: string;
  description?: string;
  status: 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';
  total_amount: number;
  platform_fee: number;
  provider_earning: number;
  customer?: User;
  provider?: Provider;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequest {
  serviceName: string;
  providerId: number;
  scheduledDate: Date;
  scheduledTime: string;
  address: string;
  specialInstructions?: string;
  totalPrice: number;
}

// Payment Types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  checkout_url: string;
  payment_id: string;
  tx_ref: string;
  expiresAt: string;
}

export interface PaymentMethod {
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

export interface Transaction {
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

export interface WithdrawalRequest {
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

export interface WalletBalance {
  balance: number;
  pendingAmount: number;
  currency: string;
  lastUpdated: string;
}

export interface PaymentVerificationResult {
  status: "success" | "failed" | "pending";
  payment_id: string;
  tx_ref: string;
  amount: number;
  booking_id?: string;
  is_successful?: boolean;
  message?: string;
}

export interface MobileMoneyInitiationResult {
  transactionId: string;
  status: string;
  message: string;
}

export interface MobileMoneyVerificationResult {
  status: "success" | "failed" | "pending";
  amount: number;
}

export interface PaymentCallbackResult {
  success: boolean;
  transactionId?: string;
  status?: string;
}

export interface BookingPaymentResult {
  success: boolean;
  payment_id?: string;
  checkout_url?: string;
  message?: string;
}

export interface BookingPaymentStatus {
  status: "pending" | "paid" | "failed" | "refunded";
  amount: number;
  transactionId?: string;
  paidAt?: string;
}

export interface RefundResult {
  refundId: string;
  status: string;
}

export interface RefundStatus {
  status: "pending" | "approved" | "rejected" | "completed";
  amount: number;
  reason: string;
  processedAt?: string;
}

export interface TransactionHistoryResult {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
}

export interface WalletTransactionsResult {
  transactions: Transaction[];
  total: number;
}

export interface PriceCalculation {
  min: number;
  max: number;
  platformFee: number;
  total: number;
}
