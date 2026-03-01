// utils/validators.ts
/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Ethiopian format)
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[^0-9]/g, '');
  return /^(09|07)[0-9]{8}$/.test(cleaned);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate passwords match
 */
export const doPasswordsMatch = (
  password: string,
  confirmPassword: string
): boolean => {
  return password === confirmPassword;
};

/**
 * Validate full name
 */
export const isValidFullName = (name: string): boolean => {
  return name.trim().length >= 3 && /^[a-zA-Z\s]+$/.test(name);
};

/**
 * Validate Ethiopian TIN number
 */
export const isValidTin = (tin: string): boolean => {
  const cleaned = tin.replace(/[^0-9]/g, '');
  return cleaned.length === 10;
};

/**
 * Validate business license number
 */
export const isValidLicenseNumber = (license: string): boolean => {
  const cleaned = license.replace(/[^0-9]/g, '');
  return cleaned.length >= 5 && cleaned.length <= 15;
};

/**
 * Validate price/amount
 */
export const isValidAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 1000000;
};

/**
 * Validate rating
 */
export const isValidRating = (rating: number): boolean => {
  return rating >= 1 && rating <= 5;
};

/**
 * Validate date
 */
export const isValidDate = (date: string | Date): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * Validate future date
 */
export const isFutureDate = (date: string | Date): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return isValidDate(d) && d > new Date();
};

/**
 * Validate time format (HH:mm)
 */
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Validate URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate image file
 */
export const isValidImageFile = (file: any): boolean => {
  if (!file) return false;
  
  // Check mime type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (file.type) {
    return validTypes.includes(file.type);
  }
  
  if (file.mimeType) {
    return validTypes.includes(file.mimeType);
  }
  
  // Check extension
  const filename = file.name || file.uri || '';
  const ext = filename.split('.').pop()?.toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  
  return ext ? validExtensions.includes(ext) : false;
};

/**
 * Validate file size (in MB)
 */
export const isValidFileSize = (file: any, maxSizeMB: number = 5): boolean => {
  if (!file) return false;
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size) {
    return file.size <= maxSizeBytes;
  }
  
  if (file.fileSize) {
    return file.fileSize <= maxSizeBytes;
  }
  
  // If we can't determine size, assume it's valid
  return true;
};

/**
 * Validate coordinates
 */
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return (
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
};

/**
 * Validate address
 */
export const isValidAddress = (address: string): boolean => {
  return address.trim().length >= 5;
};

/**
 * Validate postal code
 */
export const isValidPostalCode = (postalCode: string): boolean => {
  // Ethiopian postal codes are 4 digits
  const cleaned = postalCode.replace(/[^0-9]/g, '');
  return cleaned.length === 4;
};

/**
 * Validate city name
 */
export const isValidCity = (city: string): boolean => {
  return city.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(city);
};

/**
 * Validate service description
 */
export const isValidDescription = (description: string): boolean => {
  return description.trim().length >= 10 && description.trim().length <= 500;
};

/**
 * Validate search query
 */
export const isValidSearchQuery = (query: string): boolean => {
  return query.trim().length >= 2;
};

/**
 * Get validation errors for registration form
 */
export const validateRegistrationForm = (data: {
  fullname: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  service_city?: string;
}) => {
  const errors: Record<string, string> = {};

  if (!data.fullname) {
    errors.fullname = 'Full name is required';
  } else if (!isValidFullName(data.fullname)) {
    errors.fullname = 'Please enter a valid name';
  }

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email';
  }

  if (!data.phone) {
    errors.phone = 'Phone number is required';
  } else if (!isValidPhone(data.phone)) {
    errors.phone = 'Phone must be 10 digits starting with 09 or 07';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  } else {
    const passwordCheck = isStrongPassword(data.password);
    if (!passwordCheck.isValid) {
      errors.password = passwordCheck.errors[0];
    }
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (!doPasswordsMatch(data.password, data.confirmPassword)) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (data.service_city && !isValidCity(data.service_city)) {
    errors.service_city = 'Please select a valid city';
  }

  return errors;
};

/**
 * Get validation errors for login form
 */
export const validateLoginForm = (data: {
  email: string;
  password: string;
}) => {
  const errors: Record<string, string> = {};

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  }

  return errors;
};

/**
 * Get validation errors for service request form
 */
export const validateServiceRequestForm = (data: {
  serviceName: string;
  scheduledDate: Date;
  scheduledTime: string;
  address: string;
  description?: string;
}) => {
  const errors: Record<string, string> = {};

  if (!data.serviceName) {
    errors.serviceName = 'Please select a service';
  }

  if (!data.scheduledDate) {
    errors.scheduledDate = 'Please select a date';
  } else if (!isFutureDate(data.scheduledDate)) {
    errors.scheduledDate = 'Please select a future date';
  }

  if (!data.scheduledTime) {
    errors.scheduledTime = 'Please select a time';
  } else if (!isValidTimeFormat(data.scheduledTime)) {
    errors.scheduledTime = 'Invalid time format';
  }

  if (!data.address) {
    errors.address = 'Please enter your address';
  } else if (!isValidAddress(data.address)) {
    errors.address = 'Please enter a valid address';
  }

  if (data.description && !isValidDescription(data.description)) {
    errors.description = 'Description must be between 10 and 500 characters';
  }

  return errors;
};

/**
 * Get validation errors for review form
 */
export const validateReviewForm = (data: {
  rating: number;
  comment?: string;
}) => {
  const errors: Record<string, string> = {};

  if (!data.rating) {
    errors.rating = 'Please select a rating';
  } else if (!isValidRating(data.rating)) {
    errors.rating = 'Rating must be between 1 and 5';
  }

  if (data.comment && data.comment.length > 500) {
    errors.comment = 'Comment cannot exceed 500 characters';
  }

  return errors;
};