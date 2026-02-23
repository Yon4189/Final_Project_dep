// utils/formatters.ts
import { format, formatDistance, formatRelative, isToday, isYesterday, isThisWeek } from 'date-fns';
import type { Currency, Coordinates, Location } from '../types/customer.types';

// ==================== Date Formatters ====================

export const formatDate = (date: string | Date | number, formatStr: string = 'PPP'): string => {
  try {
    return format(new Date(date), formatStr);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Invalid date';
  }
};

export const formatDateTime = (date: string | Date | number): string => {
  try {
    return format(new Date(date), 'PPp');
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatTime = (date: string | Date | number): string => {
  try {
    return format(new Date(date), 'p');
  } catch (error) {
    return 'Invalid time';
  }
};

export const formatRelativeTime = (date: string | Date | number): string => {
  try {
    const dateObj = new Date(date);
    
    if (isToday(dateObj)) {
      return `Today at ${format(dateObj, 'h:mm a')}`;
    }
    if (isYesterday(dateObj)) {
      return `Yesterday at ${format(dateObj, 'h:mm a')}`;
    }
    if (isThisWeek(dateObj)) {
      return format(dateObj, 'EEEE at h:mm a');
    }
    
    return format(dateObj, 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatTimeAgo = (date: string | Date | number): string => {
  try {
    return formatDistance(new Date(date), new Date(), { addSuffix: true });
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

export const formatTimeSlot = (start: string, end: string): string => {
  return `${formatTime(start)} - ${formatTime(end)}`;
};

// ==================== Currency Formatters ====================

export const formatCurrency = (
  amount: number,
  currency: Currency = 'ETB',
  options?: Intl.NumberFormatOptions
): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
  
  return formatter.format(amount);
};

export const formatCompactCurrency = (amount: number, currency: Currency = 'ETB'): string => {
  if (amount >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${currency} ${(amount / 1_000).toFixed(1)}K`;
  }
  return `${currency} ${amount.toFixed(0)}`;
};

export const formatPriceRange = (min: number, max: number, currency: Currency = 'ETB'): string => {
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// ==================== Number Formatters ====================

export const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
  return new Intl.NumberFormat('en-US', options).format(num);
};

export const formatCompactNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
};

export const formatOrdinal = (num: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = num % 100;
  const suffix = suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
  return `${num}${suffix}`;
};

// ✅ FIXED: Renamed from formatDistance to formatMetricDistance to avoid conflict with date-fns import
export const formatMetricDistance = (meters: number, unit: 'metric' | 'imperial' = 'metric'): string => {
  if (unit === 'metric') {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  } else {
    const feet = meters * 3.28084;
    if (feet < 5280) {
      return `${Math.round(feet)} ft`;
    }
    return `${(feet / 5280).toFixed(1)} mi`;
  }
};

// ==================== Phone Number Formatters ====================

export const formatPhoneNumber = (phone: string, country: string = 'ET'): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Ethiopian phone numbers
  if (country === 'ET') {
    if (cleaned.length === 10) {
      return `+251 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('251')) {
      return `+251 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
  }
  
  // Default formatting
  return phone;
};

export const formatMaskedPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    const last4 = cleaned.slice(-4);
    return `**** *** ${last4}`;
  }
  return phone;
};

// ==================== Address Formatters ====================

export const formatAddress = (location: Partial<Location>): string => {
  const parts = [
    location.addressLine1,
    location.addressLine2,
    location.city,
    location.state,
    location.postalCode,
    location.country,
  ].filter(Boolean);
  
  return parts.join(', ');
};

export const formatShortAddress = (location: Partial<Location>): string => {
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  if (location.city) {
    return location.city;
  }
  return location.addressLine1 || '';
};

export const formatCoordinates = (coords: Coordinates): string => {
  return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
};

// ==================== Name Formatters ====================

export const formatInitials = (name: string, maxLetters: number = 2): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, maxLetters);
};

export const formatFullName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`.trim();
};

export const formatMaskedName = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0) + '*'.repeat(parts[0].length - 1);
  }
  
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  
  return `${firstName} ${lastName.charAt(0)}***`;
};

// ==================== File Size Formatters ====================

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// ==================== Duration Formatters ====================

export const formatSecondsToMinutes = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatHoursToDays = (hours: number): string => {
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  
  return `${days}d ${remainingHours}h`;
};

// ==================== Rating Formatters ====================

export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

export const formatRatingStars = (rating: number): string => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
};

// ==================== List Formatters ====================

export const formatList = (items: string[], conjunction: string = 'and'): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1).join(', ');
  
  return `${otherItems}, ${conjunction} ${lastItem}`;
};

export const formatTruncatedText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// ==================== JSON Formatters ====================

export const formatJSON = (data: any, pretty: boolean = true): string => {
  try {
    return pretty 
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
  } catch (error) {
    return 'Invalid JSON';
  }
};

// ==================== HTML Formatters ====================

export const stripHTML = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

// ==================== Case Formatters ====================

export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeWords = (text: string): string => {
  return text
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

export const toTitleCase = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const toSentenceCase = (text: string): string => {
  const sentences = text.split(/[.!?]+/);
  return sentences
    .map(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length === 0) return '';
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    })
    .join('. ')
    .trim();
};

export const toCamelCase = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
};

export const toSnakeCase = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

export const toKebabCase = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ==================== Slug Formatters ====================

export const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};