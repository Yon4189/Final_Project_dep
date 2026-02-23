// types/customer.types.ts
import { Ionicons } from '@expo/vector-icons';

// ==================== Core Types ====================

export type ID = string;
export type Timestamp = string;
export type Currency = 'ETB' | 'USD';
export type Rating = 1 | 2 | 3 | 4 | 5;

// ==================== User Types ====================

export interface User {
  id: ID;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role: 'homeowner' | 'professional' | 'admin';
  isActive: boolean;
  isVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp;
  
  // Profile
  bio?: string;
  dateOfBirth?: Timestamp;
  gender?: 'male' | 'female' | 'other';
  
  // Settings
  language?: string;
  currency?: Currency;
  notificationSettings?: NotificationSettings;
  privacySettings?: PrivacySettings;
  
  // Metadata
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  bookingUpdates: boolean;
  paymentUpdates: boolean;
  promotionalOffers: boolean;
}

export interface PrivacySettings {
  showProfile: boolean;
  showActivity: boolean;
  allowDataCollection: boolean;
  allowLocationTracking: boolean;
}

// ==================== Location Types ====================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinates {
  id: ID;
  userId: ID;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  placeId?: string;
  label?: string;
  isPrimary: boolean;
  additionalDetails?: {
    floor?: string;
    apartment?: string;
    landmark?: string;
    instructions?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Address {
  formatted: string;
  street?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  coordinates?: Coordinates;
}

// ==================== Service Types ====================

export interface Category {
  id: ID;
  name: string;
  slug: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  image?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Relations
  services?: Service[];
}

export interface Service {
  id: ID;
  categoryId: ID;
  name: string;
  slug: string;
  description?: string;
  basePrice?: number;
  priceUnit: 'hour' | 'fixed' | 'sqft' | 'day';
  estimatedDuration?: {
    min: number;
    max: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  isActive: boolean;
  displayOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Relations
  category?: Category;
  professionalServices?: ProfessionalService[];
}

export interface ProfessionalService {
  id: ID;
  professionalProfileId: ID;
  serviceId: ID;
  customPrice?: number;
  description?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Relations
  service?: Service;
  professional?: ProfessionalProfile;
}

// ==================== Professional Types ====================

export interface ProfessionalProfile {
  id: ID;
  userId: ID;
  businessName?: string;
  bio?: string;
  licenseNumber?: string;
  insuranceDetails?: string;
  yearsExperience: number;
  hourlyRate?: number;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  isAvailable: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  serviceRadius: number; // in kilometers
  verificationDocuments?: string[];
  verifiedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Relations
  user?: User;
  services?: ProfessionalService[];
  availability?: AvailabilitySlot[];
  reviews?: Review[];
  bookings?: Booking[];
}

export interface ServiceProvider {
  id: ID;
  userId: ID;
   name?: string; 
  businessName: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  yearsExperience: number;
  verified: boolean;
  insured?: boolean;
  services: ProfessionalService[];
  priceRange: PriceRange;
  location: ProviderLocation;
  distance?: number; // calculated field
  responseTime?: string;
  availability?: AvailabilitySlot[];
  reviews?: Review[];
  about?: string;
  languages?: string[];
  specializations?: string[];
  certifications?: string[];
  badges?: ProviderBadge[];
}

export interface ProviderLocation extends Coordinates {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  serviceRadius: number;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: Currency;
  unit: 'hour' | 'fixed' | 'sqft' | 'day';
}

export interface ProviderBadge {
  type: 'verified' | 'expert' | 'top_rated' | 'preferred' | 'emergency';
  label: string;
  icon: string;
  color: string;
}

// ==================== Availability Types ====================

export interface AvailabilitySlot {
  id: ID;
  professionalProfileId: ID;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isBooked: boolean;
  isRecurring: boolean;
  recurringPattern?: 'weekly' | 'biweekly' | 'monthly';
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  slotId?: ID;
}

// ==================== Booking Types ====================

export type BookingStatus = 
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'paid'
  | 'held'
  | 'released'
  | 'refunded'
  | 'failed'
  | 'cancelled';

export interface Booking {
  id: ID;
  bookingNumber: string;
  homeownerId: ID;
  professionalId: ID;
  professionalProfileId: ID;
  serviceId: ID;
  locationId?: ID;
  status: BookingStatus;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  estimatedDuration: number; // in hours
  totalAmount: number;
  serviceFee: number;
  taxAmount: number;
  finalAmount: number;
  description?: string;
  homeownerNotes?: string;
  professionalNotes?: string;
  additionalDetails?: {
    photos?: string[];
    documents?: string[];
    measurements?: Record<string, number>;
  };
  confirmedAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancelledBy?: ID;
  cancellationReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Relations
  homeowner?: User;
  professional?: User;
  professionalProfile?: ProfessionalProfile;
  service?: Service;
  location?: Location;
  transaction?: Transaction;
  review?: Review;
  complaint?: Complaint;
}

export interface ServiceRequest {
  id: ID;
  requestNumber: string;
  providerId: ID;
  providerName: string;
  providerImage?: string;
  providerRating?: number;
  providerReviewCount?: number;
  providerVerified?: boolean;
  providerJobs?: number;
  serviceId: ID;
  serviceName: string;
  categoryName: string;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  locationId?: ID;
  description?: string;
  specialInstructions?: string;
  estimatedPrice: number;
  finalPrice?: number;
  paymentStatus: PaymentStatus;
  paymentDetails?: PaymentDetails;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  confirmedAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancellationReason?: string;
  
  // Relations
  review?: Review;
  providerPhone?: string;
}
export interface WalletBalance {
  balance: number;
  pendingAmount: number;
  currency: string;
  lastUpdated: string;
}
// ==================== Payment Types ====================

export interface Transaction {
  id: ID;
  transactionReference: string;
  bookingId: ID;
  userId: ID;
  type: 'payment' | 'refund' | 'payout' | 'fee';
  paymentMethod: 'chapa' | 'cash' | 'bank_transfer' | 'mobile_money' | 'card';
  status: PaymentStatus;
  amount: number;
  fee: number;
  netAmount: number;
  currency: Currency;
  chapaTransactionId?: string;
  chapaCheckoutUrl?: string;
  paymentDetails?: {
    cardLast4?: string;
    bankName?: string;
    accountNumber?: string;
    phoneNumber?: string;
    provider?: string;
  };
  webhookPayload?: Record<string, any>;
  paidAt?: Timestamp;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentDetails {
  transactionId: string;
  amount: number;
  currency: Currency;
  paymentMethod: string;
  status: PaymentStatus;
  paidAt?: Timestamp;
  releasedAt?: Timestamp;
  refundedAt?: Timestamp;
}

export interface Wallet {
  id: ID;
  userId: ID;
  balance: number;
  pendingAmount: number;
  currency: Currency;
  lastUpdated: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== Review Types ====================

export interface Review {
  id: ID;
  bookingId: ID;
  reviewerId: ID;
  reviewerName: string;
  reviewerImage?: string;
  professionalId: ID;
  professionalName: string;
  professionalImage?: string;
  rating: Rating;
  comment?: string;
  criteriaRatings?: ReviewCriteria;
  isRecommended: boolean;
  isAnonymous: boolean;
  professionalResponse?: string;
  respondedAt?: Timestamp;
  isPublic: boolean;
  helpful: number;
  reported: boolean;
  images?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReviewCriteria {
  punctuality: Rating;
  quality: Rating;
  professionalism: Rating;
  communication: Rating;
  valueForMoney: Rating;
}

// ==================== Complaint Types ====================

export type ComplaintStatus = 'pending' | 'under_review' | 'resolved' | 'rejected';
export type ComplaintPriority = 'low' | 'medium' | 'high';
export type ComplaintIssueType = 
  | 'service_quality'
  | 'professionalism'
  | 'late_arrival'
  | 'overcharging'
  | 'damage'
  | 'incomplete'
  | 'communication'
  | 'other';

export interface Complaint {
  id: ID;
  complaintNumber: string;
  bookingId: ID;
  userId: ID;
  providerId: ID;
  providerName: string;
  providerImage?: string;
  serviceName?: string;
  subject: string;
  description: string;
  issueType: ComplaintIssueType;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  attachments?: string[];
  adminResponse?: string;
  adminNotes?: string;
  resolution?: string;
  responses?: ComplaintResponse[];
  userResponses?: ComplaintResponse[];
  resolvedAt?: Timestamp;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ComplaintResponse {
  id: ID;
  complaintId: ID;
  userId: ID;
  userType: 'user' | 'admin' | 'provider';
  message: string;
  attachments?: string[];
  createdAt: Timestamp;
}

// ==================== Search & Filter Types ====================

export interface SearchFilters {
  query?: string;
  categoryId?: string;
  serviceId?: string;
  minRating?: Rating | 0;
  maxDistance?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  verifiedOnly?: boolean;
  availableNow?: boolean;
  sortBy: 'rating' | 'distance' | 'price_low' | 'price_high' | 'reviews' | 'relevance';
  page?: number;
  perPage?: number;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'service' | 'category' | 'provider' | 'recent';
  icon?: string;
  category?: string;
}

// ==================== Notification Types ====================

export type NotificationType = 
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'payment_received'
  | 'payment_failed'
  | 'review_received'
  | 'complaint_update'
  | 'promotion'
  | 'reminder'
  | 'system';

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  isActionable: boolean;
  actionUrl?: string;
  image?: string;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

// ==================== Dashboard Types ====================

export interface DashboardStats {
  activeRequests: number;
  completedRequests: number;
  totalSpent: number;
  pendingPayments: number;
  walletBalance: number;
  unreadNotifications: number;
  favoriteProviders: number;
}

export interface ActivityItem {
  id: ID;
  type: 'booking' | 'payment' | 'review' | 'complaint' | 'system';
  title: string;
  description: string;
  timestamp: Timestamp;
  status?: string;
  icon?: string;
  color?: string;
  actionable: boolean;
  actionUrl?: string;
}

// ==================== API Response Types ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from?: number;
  to?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

// ==================== Form Types ====================

export interface ServiceRequestForm {
  providerId: string;
  serviceId: string;
  scheduledDate: Date;
  scheduledTime: string;
  locationId?: string;
  address: string;
  description: string;
  specialInstructions: string;
  estimatedDuration?: number;
  estimatedPrice: number;
}

export interface ReviewForm {
  bookingId: string;
  rating: Rating;
  comment?: string;
  criteriaRatings?: ReviewCriteria;
  isRecommended: boolean;
  isAnonymous: boolean;
}

export interface ComplaintForm {
  bookingId: string;
  subject: string;
  description: string;
  issueType: ComplaintIssueType;
  priority: ComplaintPriority;
  attachments?: string[];
}

export interface ProfileForm {
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: string;
  notificationSettings?: NotificationSettings;
  privacySettings?: PrivacySettings;
}

export interface LocationForm {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  label?: string;
  isPrimary: boolean;
  additionalDetails?: {
    floor?: string;
    apartment?: string;
    landmark?: string;
    instructions?: string;
  };
}

// ==================== Utility Types ====================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithTimestamps<T> = T & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type WithId<T> = T & {
  id: ID;
};

export type SortDirection = 'asc' | 'desc';

export interface DateRange {
  start: Timestamp;
  end: Timestamp;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ==================== Event Types ====================

export type CustomerEvent = 
  | { type: 'PROFILE_UPDATED'; payload: { user: User } }
  | { type: 'LOCATION_ADDED'; payload: { location: Location } }
  | { type: 'LOCATION_UPDATED'; payload: { location: Location } }
  | { type: 'LOCATION_DELETED'; payload: { locationId: ID } }
  | { type: 'BOOKING_CREATED'; payload: { booking: Booking } }
  | { type: 'BOOKING_UPDATED'; payload: { booking: Booking } }
  | { type: 'BOOKING_CANCELLED'; payload: { bookingId: ID; reason: string } }
  | { type: 'REVIEW_SUBMITTED'; payload: { review: Review } }
  | { type: 'COMPLAINT_SUBMITTED'; payload: { complaint: Complaint } }
  | { type: 'PAYMENT_COMPLETED'; payload: { transaction: Transaction } }
  | { type: 'FAVORITE_ADDED'; payload: { providerId: ID } }
  | { type: 'FAVORITE_REMOVED'; payload: { providerId: ID } };

// ==================== Enums & Constants ====================

export const BookingStatuses: Record<BookingStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: '#F59E0B', icon: 'time-outline' },
  confirmed: { label: 'Confirmed', color: '#3B82F6', icon: 'checkmark-circle-outline' },
  in_progress: { label: 'In Progress', color: '#8B5CF6', icon: 'construct-outline' },
  completed: { label: 'Completed', color: '#10B981', icon: 'checkmark-done-outline' },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: 'close-circle-outline' },
  disputed: { label: 'Disputed', color: '#F59E0B', icon: 'alert-circle-outline' },
  refunded: { label: 'Refunded', color: '#6B7280', icon: 'refresh-outline' },
};

export const PaymentStatuses: Record<PaymentStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: '#F59E0B', icon: 'time-outline' },
  processing: { label: 'Processing', color: '#3B82F6', icon: 'sync-outline' },
  paid: { label: 'Paid', color: '#10B981', icon: 'checkmark-circle-outline' },
  held: { label: 'Held', color: '#8B5CF6', icon: 'lock-closed-outline' },
  released: { label: 'Released', color: '#10B981', icon: 'arrow-down-circle-outline' },
  refunded: { label: 'Refunded', color: '#6B7280', icon: 'refresh-outline' },
  failed: { label: 'Failed', color: '#EF4444', icon: 'close-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#6B7280', icon: 'ban-outline' },
};

export const ComplaintStatuses: Record<ComplaintStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending Review', color: '#F59E0B', icon: 'time-outline' },
  under_review: { label: 'Under Review', color: '#3B82F6', icon: 'eye-outline' },
  resolved: { label: 'Resolved', color: '#10B981', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejected', color: '#EF4444', icon: 'close-circle-outline' },
};

export const IssueTypes: Record<ComplaintIssueType, { label: string; icon: string }> = {
  service_quality: { label: 'Poor Service Quality', icon: 'construct-outline' },
  professionalism: { label: 'Unprofessional Behavior', icon: 'people-outline' },
  late_arrival: { label: 'Late Arrival / No Show', icon: 'time-outline' },
  overcharging: { label: 'Overcharging', icon: 'cash-outline' },
  damage: { label: 'Property Damage', icon: 'warning-outline' },
  incomplete: { label: 'Incomplete Work', icon: 'close-circle-outline' },
  communication: { label: 'Poor Communication', icon: 'chatbubble-outline' },
  other: { label: 'Other', icon: 'ellipsis-horizontal-outline' },
};

export const RatingLabels: Record<Rating, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};