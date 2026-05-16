// constants/customer.ts
import { Colors } from './Colors';

// Booking Status Constants
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
  REFUNDED: 'refunded',
} as const;

export const BOOKING_STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  [BOOKING_STATUS.PENDING]: { 
    label: 'Pending', 
    color: Colors.warning, 
    icon: 'time-outline' 
  },
  [BOOKING_STATUS.CONFIRMED]: { 
    label: 'Confirmed', 
    color: Colors.info, 
    icon: 'checkmark-circle-outline' 
  },
  [BOOKING_STATUS.IN_PROGRESS]: { 
    label: 'In Progress', 
    color: Colors.secondary, 
    icon: 'construct-outline' 
  },
  [BOOKING_STATUS.COMPLETED]: { 
    label: 'Completed', 
    color: Colors.success, 
    icon: 'checkmark-done-outline' 
  },
  [BOOKING_STATUS.CANCELLED]: { 
    label: 'Cancelled', 
    color: Colors.error, 
    icon: 'close-circle-outline' 
  },
  [BOOKING_STATUS.DISPUTED]: { 
    label: 'Disputed', 
    color: Colors.warning, 
    icon: 'alert-circle-outline' 
  },
  [BOOKING_STATUS.REFUNDED]: { 
    label: 'Refunded', 
    color: Colors.text.secondary, 
    icon: 'refresh-outline' 
  },
};

// Payment Status Constants
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  [PAYMENT_STATUS.PENDING]: { 
    label: 'Pending', 
    color: Colors.warning, 
    icon: 'time-outline' 
  },
  [PAYMENT_STATUS.PROCESSING]: { 
    label: 'Processing', 
    color: Colors.info, 
    icon: 'sync-outline' 
  },
  [PAYMENT_STATUS.PAID]: { 
    label: 'Paid', 
    color: Colors.success, 
    icon: 'checkmark-circle-outline' 
  },
  [PAYMENT_STATUS.HELD]: { 
    label: 'Held', 
    color: Colors.secondary, 
    icon: 'lock-closed-outline' 
  },
  [PAYMENT_STATUS.RELEASED]: { 
    label: 'Released', 
    color: Colors.success, 
    icon: 'arrow-down-circle-outline' 
  },
  [PAYMENT_STATUS.REFUNDED]: { 
    label: 'Refunded', 
    color: Colors.text.secondary, 
    icon: 'refresh-outline' 
  },
  [PAYMENT_STATUS.FAILED]: { 
    label: 'Failed', 
    color: Colors.error, 
    icon: 'close-circle-outline' 
  },
  [PAYMENT_STATUS.CANCELLED]: { 
    label: 'Cancelled', 
    color: Colors.text.secondary, 
    icon: 'ban-outline' 
  },
};

// Complaint Status Constants
export const COMPLAINT_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
} as const;

export const COMPLAINT_STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  [COMPLAINT_STATUS.PENDING]: { 
    label: 'Pending Review', 
    color: Colors.warning, 
    icon: 'time-outline' 
  },
  [COMPLAINT_STATUS.UNDER_REVIEW]: { 
    label: 'Under Review', 
    color: Colors.info, 
    icon: 'eye-outline' 
  },
  [COMPLAINT_STATUS.RESOLVED]: { 
    label: 'Resolved', 
    color: Colors.success, 
    icon: 'checkmark-circle-outline' 
  },
  [COMPLAINT_STATUS.REJECTED]: { 
    label: 'Rejected', 
    color: Colors.error, 
    icon: 'close-circle-outline' 
  },
};

// Complaint Issue Types
export const COMPLAINT_ISSUE_TYPES = {
  SERVICE_QUALITY: 'service_quality',
  PROFESSIONALISM: 'professionalism',
  LATE_ARRIVAL: 'late_arrival',
  OVERCHARGING: 'overcharging',
  DAMAGE: 'damage',
  INCOMPLETE: 'incomplete',
  COMMUNICATION: 'communication',
  OTHER: 'other',
} as const;

export const COMPLAINT_ISSUE_LABELS: Record<string, { label: string; icon: string }> = {
  [COMPLAINT_ISSUE_TYPES.SERVICE_QUALITY]: { 
    label: 'Poor Service Quality', 
    icon: 'construct-outline' 
  },
  [COMPLAINT_ISSUE_TYPES.PROFESSIONALISM]: { 
    label: 'Unprofessional Behavior', 
    icon: 'people-outline' 
  },
  [COMPLAINT_ISSUE_TYPES.LATE_ARRIVAL]: { 
    label: 'Late Arrival / No Show', 
    icon: 'time-outline' 
  },
  [COMPLAINT_ISSUE_TYPES.OVERCHARGING]: { 
    label: 'Overcharging', 
    icon: 'cash-outline' 
  },
  [COMPLAINT_ISSUE_TYPES.DAMAGE]: { 
    label: 'Property Damage', 
    icon: 'warning-outline' 
  },
  [COMPLAINT_ISSUE_TYPES.INCOMPLETE]: { 
    label: 'Incomplete Work', 
    icon: 'close-circle-outline' 
  },
  [COMPLAINT_ISSUE_TYPES.COMMUNICATION]: { 
    label: 'Poor Communication', 
    icon: 'chatbubble-outline' 
  },
  [COMPLAINT_ISSUE_TYPES.OTHER]: { 
    label: 'Other', 
    icon: 'ellipsis-horizontal-outline' 
  },
};

// Notification Types
export const NOTIFICATION_TYPES = {
  REQUEST_UPDATE: 'request_update',
  PROVIDER_RESPONSE: 'provider_response',
  PAYMENT: 'payment',
  REMINDER: 'reminder',
  PROMO: 'promo',
  REVIEW: 'review',
  SYSTEM: 'system',
} as const;

// Sort Options
export const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'distance', label: 'Nearest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'reviews', label: 'Most Reviewed' },
] as const;

// Distance Options (in km)
export const DISTANCE_OPTIONS = [5, 10, 25, 50, 100] as const;

// Rating Options
export const RATING_OPTIONS = [0, 3, 4, 5] as const;

// Service Categories Icons (fallback)
export const CATEGORY_ICONS: Record<string, string> = {
  'Plumbing': '🔧',
  'Electrical': '⚡',
  'Cleaning': '🧹',
  'Painting': '🎨',
  'Carpentry': '🪚',
  'AC Repair': '❄️',
  'Gardening': '🌿',
  'Moving': '🚚',
  'Security': '🛡️',
  'IT Support': '💻',
  'Tutoring': '📚',
  'Photography': '📸',
  'Event Planning': '🎉',
  'Beauty': '💅',
  'Fitness': '💪',
  'default': '🛠️',
};

// Default Avatar
export const DEFAULT_AVATAR = 'https://via.placeholder.com/150';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

// Cache Durations (in milliseconds)
export const CACHE_DURATION = {
  PROFILE: 5 * 60 * 1000, // 5 minutes
  CATEGORIES: 24 * 60 * 60 * 1000, // 24 hours
  PROVIDER_DETAILS: 5 * 60 * 1000, // 5 minutes
  TOP_RATED: 60 * 60 * 1000, // 1 hour
  REQUESTS: 2 * 60 * 1000, // 2 minutes
  LOCATIONS: 10 * 60 * 1000, // 10 minutes
} as const;

// API Timeouts
export const API_TIMEOUT = {
  DEFAULT: 30000, // 30 seconds
  UPLOAD: 60000, // 60 seconds
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your internet connection.',
  SERVER: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  DEFAULT: 'An unexpected error occurred. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  LOCATION_ADDED: 'Location added successfully',
  LOCATION_UPDATED: 'Location updated successfully',
  LOCATION_DELETED: 'Location deleted successfully',
  REQUEST_CREATED: 'Service request created successfully',
  REQUEST_CANCELLED: 'Request cancelled successfully',
  REVIEW_SUBMITTED: 'Review submitted successfully',
  COMPLAINT_SUBMITTED: 'Complaint submitted successfully',
  FAVORITE_ADDED: 'Added to favorites',
  FAVORITE_REMOVED: 'Removed from favorites',
} as const;