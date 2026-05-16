// types/provider.types.ts
import { Ionicons } from "@expo/vector-icons";
export interface ProviderProfile {
  id: string;
  providerID: string; // Add this
  userId: string;
  fullname: string; // Add this from database
  businessName: string; // Keep for backward compatibility
  bio: string;
  profession?: string;
  profilePicture?: string; // Change from profileImage to profilePicture
  profile_picture?: string; // Add this
  profileImage?: string; // Keep for backward compatibility
  coverImage?: string;
  phone: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  serviceRadius: number; // in km
  yearsExperience: number;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  status: string;
  verificationStatus: "pending" | "verified" | "rejected";
  isAvailable: boolean;
  is_online?: boolean;
  workingHours: WorkingHours;
  services: ProviderService[];
  certifications: Certification[];
  languages: string[];
  badges: Badge[];
  category?: {
    id: string;
    name: string;
  };
  bankDetails?: BankDetails;
  business_license?: string;
  insurance_certificate?: string;
  idPhoto?: string;
  idPhotoBack?: string;
  idPhotoType?: string;
  service_city?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isAvailable: boolean;
  startTime?: string; // "09:00"
  endTime?: string; // "17:00"
  breaks?: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface ProviderService {
  id: string;
  basePrice: number;
  categoryId: string;
  categoryName: string;
  serviceId: string;
  serviceName: string;
  price: number;
  priceUnit: "hour" | "fixed" | "sqft";
  estimatedDuration: number; // in minutes
  description?: string;
  isActive: boolean;
}

export type ProviderNotificationType =
  | "new_request"
  | "booking_request"
  | "request_accepted"
  | "booking_accepted"
  | "request_rejected"
  | "booking_rejected"
  | "request_cancelled"
  | "booking_cancelled"
  | "booking_completed"
  | "payment_received"
  | "payment_released"
  | "withdrawal"
  | "immediate_payout_credited"
  | "held_payout_scheduled"
  | "held_payout_released"
  | "payout_reversed"
  | "review"
  | "reminder"
  | "provider_approved"
  | "provider_rejected"
  | "system";

export interface ProviderNotificationPayload {
  notificationID: string;
  type: ProviderNotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_seen: boolean;
  created_at: string;
  updated_at?: string;
  related_booking_id?: string;
}

export interface Certification {
  id: string;
  name: string;
  image?: string | null;
  issuer?: string;
  issuedDate?: string;
  expiryDate?: string;
  document?: string;
  verified?: boolean;
}

export interface Badge {
  type: "verified" | "top_rated" | "expert" | "emergency" | "insured";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface BankDetails {
  id: String;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  swiftCode?: string;
  isVerified: boolean;
}

// Request Types
export type RequestStatus =
  | "pending"
  | "accepted"
  | "confirmed"
  | "arrived"
  | "in_progress"
  | "waiting_customer_confirmation"
  | "completed"
  | "cancelled"
  | "disputed";

export interface ServiceRequest {
  id: string;
  requestNumber: string;
  customerId: string;
  customerName: string;
  customerImage?: string;
  customerPhone: string;
  customerAddress: string;
  customerLatitude: number;
  customerLongitude: number;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  status: RequestStatus;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: number; // in minutes
  estimatedPrice: number;
  finalPrice?: number;
  description?: string;
  specialInstructions?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  distance?: number; // in km
  travelTime?: number; // in minutes
  payment_status?: 'pending_deposit' | 'deposit_paid' | 'pending_final' | 'completed' | 'overdue';
  payment?: {
    status: string;
    amount: number;
    paid_at?: string;
  };
}

// Earnings Types
export interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  availableForWithdrawal: number;
  pendingWithdrawals?: number;
  withdrawnTotal: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  currency: string;
  completedJobs: number;
  avgRating: number;
  responseRate: number;
  rank: string;
}

export interface Transaction {
  id: string;
  transactionId: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  TransactionType: "all" | "payment" | "withdrawal" | "refund";
  paymentMethod: string;
  createdAt: string;
  completedAt?: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: "pending" | "processing" | "completed" | "failed";
  bankDetails: BankDetails;
  transactionId?: string;
  createdAt: string;
  processedAt?: string;
  notes?: string;
}

// Review Types
export interface CustomerReview {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  customerImage?: string;
  rating: number;
  comment: string;
  criteriaRatings?: {
    punctuality: number;
    quality: number;
    professionalism: number;
    communication: number;
    valueForMoney: number;
  };
  images?: string[];
  createdAt: string;
  response?: {
    message: string;
    createdAt: string;
  };
}

// Dispute Types
export type DisputeStatus =
  | "pending"
  | "under_review"
  | "resolved"
  | "rejected";
export type DisputeReason =
  | "non_payment"
  | "customer_no_show"
  | "unreasonable_demands"
  | "harassment"
  | "property_issues"
  | "other";

export interface Dispute {
  id: string;
  disputeNumber: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  evidence?: string[];
  adminResponse?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}
