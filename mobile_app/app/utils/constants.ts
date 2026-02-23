// utils/constants.ts
import { Dimensions, Platform } from 'react-native';
import type { Currency } from '../types/customer.types';

const { width, height } = Dimensions.get('window');

// ==================== App Constants ====================

export const APP = {
  NAME: 'HomeLink',
  VERSION: '1.0.0',
  BUNDLE_ID: 'com.homelink.app',
  DEEPLINK_PREFIX: 'homelink://',
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.homelink.com/v1',
  WEBSITE_URL: 'https://homelink.com',
  SUPPORT_EMAIL: 'support@homelink.com',
  SUPPORT_PHONE: '+251911234567',
};

// ==================== Layout Constants ====================

export const LAYOUT = {
  WINDOW: {
    width,
    height,
  },
  SCREEN: {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  },
  IS_SMALL_DEVICE: width < 375,
  IS_MEDIUM_DEVICE: width >= 375 && width < 768,
  IS_LARGE_DEVICE: width >= 768,
  IS_TABLET: width >= 768,
  IS_IOS: Platform.OS === 'ios',
  IS_ANDROID: Platform.OS === 'android',
  STATUS_BAR_HEIGHT: Platform.OS === 'ios' ? 44 : 0,
  BOTTOM_INSET: Platform.OS === 'ios' ? 34 : 0,
};

// ==================== Storage Keys ====================

export const STORAGE_KEYS = {
  // Auth
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  
  // Settings
  THEME: 'theme',
  LANGUAGE: 'language',
  NOTIFICATIONS: 'notifications',
  
  // Data
  FAVORITES: 'favorites',
  RECENT_SEARCHES: 'recent_searches',
  SEARCH_HISTORY: 'search_history',
  LAST_LOCATION: 'last_location',
  
  // Cache
  SERVICE_CATEGORIES: 'service_categories',
  PAYMENT_METHODS: 'payment_methods',
  
  // Onboarding
  ONBOARDING_COMPLETED: 'onboarding_completed',
  TERMS_ACCEPTED: 'terms_accepted',
};

// ==================== API Constants ====================

export const API = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_TTL: {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 30 * 60 * 1000, // 30 minutes
    LONG: 24 * 60 * 60 * 1000, // 24 hours
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PER_PAGE: 20,
    MAX_PER_PAGE: 100,
  },
};

// ==================== Service Categories ====================

export const SERVICE_CATEGORIES = [
  {
    id: 1,
    name: 'Plumbing',
    icon: '🔧',
    image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0a39?w=200',
    services: [
      'Leak Repair',
      'Pipe Installation',
      'Toilet Repair',
      'Drain Cleaning',
      'Water Heater Repair',
      'Bathroom Renovation',
    ],
  },
  {
    id: 2,
    name: 'Electrical',
    icon: '⚡',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200',
    services: [
      'Wiring Repair',
      'Light Installation',
      'Circuit Breaker',
      'Outlet Installation',
      'Fan Installation',
      'Safety Inspection',
    ],
  },
  {
    id: 3,
    name: 'Cleaning',
    icon: '🧹',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200',
    services: [
      'House Cleaning',
      'Deep Cleaning',
      'Office Cleaning',
      'Carpet Cleaning',
      'Window Cleaning',
      'Move In/Out Cleaning',
    ],
  },
  {
    id: 4,
    name: 'AC & Appliances',
    icon: '❄️',
    image: 'https://images.unsplash.com/photo-1631614417681-3cd6e6c3b3c0?w=200',
    services: [
      'AC Installation',
      'AC Repair',
      'AC Maintenance',
      'Refrigerator Repair',
      'Washing Machine Repair',
      'Dryer Repair',
    ],
  },
  {
    id: 5,
    name: 'Painting',
    icon: '🎨',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200',
    services: [
      'Interior Painting',
      'Exterior Painting',
      'Wallpaper Installation',
      'Texture Painting',
      'Waterproofing',
      'Color Consultation',
    ],
  },
  {
    id: 6,
    name: 'Carpentry',
    icon: '🔨',
    image: 'https://images.unsplash.com/photo-1617529497471-9218633199c0?w=200',
    services: [
      'Furniture Repair',
      'Cabinet Installation',
      'Door Repair',
      'Custom Furniture',
      'Deck Building',
      'Wood Flooring',
    ],
  },
  {
    id: 7,
    name: 'Moving',
    icon: '📦',
    image: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=200',
    services: [
      'Local Moving',
      'Long Distance Moving',
      'Packing Services',
      'Furniture Assembly',
      'Storage Solutions',
      'Office Relocation',
    ],
  },
  {
    id: 8,
    name: 'Gardening',
    icon: '🌱',
    image: 'https://images.unsplash.com/photo-1557429287-b2e26467fc2b?w=200',
    services: [
      'Lawn Mowing',
      'Tree Trimming',
      'Garden Design',
      'Planting',
      'Weed Control',
      'Irrigation Installation',
    ],
  },
];

// ==================== Payment Constants ====================

export const PAYMENT = {
  CURRENCIES: {
    ETB: {
      code: 'ETB',
      symbol: 'Br',
      name: 'Ethiopian Birr',
    },
    USD: {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
    },
  } as Record<Currency, { code: Currency; symbol: string; name: string }>,
  
  METHODS: {
    CHAPA: {
      id: 'chapa',
      name: 'Chapa',
      icon: 'credit-card',
      fee: 0.035, // 3.5%
    },
    TELEBIRR: {
      id: 'telebirr',
      name: 'Telebirr',
      icon: 'phone-portrait',
      fee: 0.02, // 2%
    },
    MPESA: {
      id: 'mpesa',
      name: 'M-Pesa',
      icon: 'phone-portrait',
      fee: 0.02,
    },
    CASH: {
      id: 'cash',
      name: 'Cash on Service',
      icon: 'cash',
      fee: 0,
    },
  },
  
  MIN_AMOUNT: 10,
  MAX_AMOUNT: 100000,
  WITHDRAWAL_FEE: 5,
  MIN_WITHDRAWAL: 50,
  SERVICE_FEE_PERCENTAGE: 0.05, // 5%
};

// ==================== Validation Constants ====================

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 50,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  ADDRESS_MIN_LENGTH: 5,
  ADDRESS_MAX_LENGTH: 200,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
  REVIEW_MIN_LENGTH: 10,
  REVIEW_MAX_LENGTH: 500,
  COMPLAINT_MIN_LENGTH: 20,
  COMPLAINT_MAX_LENGTH: 2000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_UPLOAD: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/heic'],
};

// ==================== Time Constants ====================

export const TIME = {
  MINUTES_IN_HOUR: 60,
  HOURS_IN_DAY: 24,
  DAYS_IN_WEEK: 7,
  MONTHS_IN_YEAR: 12,
  
  BOOKING: {
    MIN_DURATION: 30, // minutes
    MAX_DURATION: 8 * 60, // 8 hours
    MIN_ADVANCE_NOTICE: 2 * 60, // 2 hours
    MAX_ADVANCE_BOOKING: 90, // days
    CANCELLATION_DEADLINE: 24, // hours
  },
  
  RESPONSE: {
    QUICK: '15 min',
    AVERAGE: '30 min',
    SLOW: '1 hour',
  },
};

// ==================== Status Constants ====================

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
} as const;

export const BOOKING_STATUS_COLORS = {
  [BOOKING_STATUS.PENDING]: '#F59E0B',
  [BOOKING_STATUS.CONFIRMED]: '#3B82F6',
  [BOOKING_STATUS.IN_PROGRESS]: '#8B5CF6',
  [BOOKING_STATUS.COMPLETED]: '#10B981',
  [BOOKING_STATUS.CANCELLED]: '#EF4444',
  [BOOKING_STATUS.DISPUTED]: '#F59E0B',
};

export const BOOKING_STATUS_LABELS = {
  [BOOKING_STATUS.PENDING]: 'Pending',
  [BOOKING_STATUS.CONFIRMED]: 'Confirmed',
  [BOOKING_STATUS.IN_PROGRESS]: 'In Progress',
  [BOOKING_STATUS.COMPLETED]: 'Completed',
  [BOOKING_STATUS.CANCELLED]: 'Cancelled',
  [BOOKING_STATUS.DISPUTED]: 'Disputed',
};

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

export const PAYMENT_STATUS_COLORS = {
  [PAYMENT_STATUS.PENDING]: '#F59E0B',
  [PAYMENT_STATUS.PROCESSING]: '#3B82F6',
  [PAYMENT_STATUS.PAID]: '#10B981',
  [PAYMENT_STATUS.HELD]: '#8B5CF6',
  [PAYMENT_STATUS.RELEASED]: '#10B981',
  [PAYMENT_STATUS.REFUNDED]: '#6B7280',
  [PAYMENT_STATUS.FAILED]: '#EF4444',
  [PAYMENT_STATUS.CANCELLED]: '#6B7280',
};

// ==================== Rating Constants ====================

export const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export const RATING_CRITERIA = [
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'quality', label: 'Quality of Work' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'communication', label: 'Communication' },
  { key: 'valueForMoney', label: 'Value for Money' },
];

// ==================== Map Constants ====================

export const MAP = {
  DEFAULT_LOCATION: {
    latitude: 9.0222,
    longitude: 38.7468,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  DEFAULT_ZOOM: 15,
  MIN_ZOOM: 10,
  MAX_ZOOM: 20,
  SEARCH_RADIUS: 50, // km
  PROVIDER_ICON_SIZE: 40,
  USER_ICON_SIZE: 30,
};

// ==================== Animation Constants ====================

export const ANIMATION = {
  DURATION: {
    SHORT: 200,
    MEDIUM: 300,
    LONG: 500,
  },
  SPRING: {
    DEFAULT: {
      damping: 15,
      mass: 1,
      stiffness: 150,
    },
    GENTLE: {
      damping: 20,
      mass: 1,
      stiffness: 100,
    },
    BOUNCY: {
      damping: 10,
      mass: 1,
      stiffness: 200,
    },
  },
};

// ==================== Error Messages ====================

export const ERROR_MESSAGES = {
  NETWORK: 'Unable to connect. Please check your internet connection.',
  SERVER: 'Server error. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNAUTHORIZED: 'Your session has expired. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  GENERAL: 'An unexpected error occurred. Please try again.',
};

// ==================== Success Messages ====================

export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully',
  LOCATION_ADDED: 'Location added successfully',
  LOCATION_UPDATED: 'Location updated successfully',
  LOCATION_DELETED: 'Location deleted successfully',
  REQUEST_CREATED: 'Service request created successfully',
  REQUEST_CANCELLED: 'Request cancelled successfully',
  REVIEW_SUBMITTED: 'Thank you for your review!',
  COMPLAINT_SUBMITTED: 'Complaint submitted successfully',
  PAYMENT_SUCCESS: 'Payment completed successfully',
  FAVORITE_ADDED: 'Added to favorites',
  FAVORITE_REMOVED: 'Removed from favorites',
};

// ==================== Regex Patterns ====================

export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_ETHIOPIA: /^(?:251|0)?9\d{8}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  NUMBER: /^\d+$/,
  DECIMAL: /^\d*\.?\d+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  MONGO_ID: /^[0-9a-fA-F]{24}$/,
  LATITUDE: /^-?([1-8]?[0-9]\.{1}\d{1,6}|90\.{1}0{1,6})$/,
  LONGITUDE: /^-?((1[0-7]|[1-9])?[0-9]\.{1}\d{1,6}|180\.{1}0{1,6})$/,
};

// ==================== Feature Flags ====================

export const FEATURES = {
  CHAT_ENABLED: true,
  VIDEO_CALL_ENABLED: false,
  EMERGENCY_BOOKING: true,
  SCHEDULED_BOOKING: true,
  WALLET_ENABLED: true,
  REFERRAL_PROGRAM: true,
  LOYALTY_POINTS: false,
};

// ==================== Support Info ====================

export const SUPPORT = {
  EMAIL: 'support@homelink.com',
  PHONE: '+251911234567',
  WHATSAPP: '+251911234567',
  HOURS: '24/7',
  FAQ_URL: 'https://homelink.com/faq',
  TERMS_URL: 'https://homelink.com/terms',
  PRIVACY_URL: 'https://homelink.com/privacy',
};

// ==================== Default Values ====================

export const DEFAULTS = {
  LANGUAGE: 'en',
  CURRENCY: 'ETB' as Currency,
  COUNTRY: 'ET',
  SEARCH_RADIUS: 50,
  NOTIFICATIONS: {
    email: true,
    push: true,
    sms: false,
  },
  PRIVACY: {
    showProfile: true,
    showActivity: true,
    allowDataCollection: true,
    allowLocationTracking: true,
  },
};