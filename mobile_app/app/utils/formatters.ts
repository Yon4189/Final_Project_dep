// utils/formatters.ts
/**
 * Format currency to ETB
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return 'ETB 0';
  return `ETB ${amount.toFixed(2)}`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format time to readable string
 */
export const formatTime = (time: string | Date): string => {
  const t = typeof time === 'string' ? new Date(`2000-01-01T${time}`) : time;
  return t.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format datetime to readable string
 */
export const formatDateTime = (datetime: string | Date): string => {
  const dt = typeof datetime === 'string' ? new Date(datetime) : datetime;
  return dt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format time ago (e.g., "2 hours ago")
 */
export const formatTimeAgo = (timestamp: string | Date): string => {
  const now = new Date();
  const past = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return diffSec <= 5 ? 'just now' : `${diffSec} seconds ago`;
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  } else if (diffWeek < 4) {
    return `${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffMonth < 12) {
    return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
  } else {
    return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
  }
};

/**
 * Format distance
 */
export const formatDistance = (distance: number | undefined | null): string => {
  if (distance === undefined || distance === null) return 'Distance unknown';
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m away`;
  }
  return `${distance.toFixed(1)}km away`;
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  // Format: 0912 345 678
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{4})(\d{3})(\d{3})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
};

/**
 * Format rating to display
 */
export const formatRating = (rating: number | undefined | null): string => {
  if (rating === undefined || rating === null) return '0.0';
  return rating.toFixed(1);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Format booking status for display
 */
export const formatBookingStatus = (status: string): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: '#F59E0B' },
    confirmed: { label: 'Confirmed', color: '#3B82F6' },
    in_progress: { label: 'In Progress', color: '#8B5CF6' },
    completed: { label: 'Completed', color: '#10B981' },
    cancelled: { label: 'Cancelled', color: '#EF4444' },
    disputed: { label: 'Disputed', color: '#F59E0B' },
    refunded: { label: 'Refunded', color: '#6B7280' },
  };
  return statusMap[status] || { label: status, color: '#6B7280' };
};

/**
 * Format payment status for display
 */
export const formatPaymentStatus = (status: string): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: '#F59E0B' },
    processing: { label: 'Processing', color: '#3B82F6' },
    paid: { label: 'Paid', color: '#10B981' },
    held: { label: 'Held', color: '#8B5CF6' },
    released: { label: 'Released', color: '#10B981' },
    refunded: { label: 'Refunded', color: '#6B7280' },
    failed: { label: 'Failed', color: '#EF4444' },
    cancelled: { label: 'Cancelled', color: '#6B7280' },
  };
  return statusMap[status] || { label: status, color: '#6B7280' };
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};