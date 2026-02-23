// utils/validators.ts
import { Platform } from 'react-native';

// ==================== Email Validation ====================

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidBusinessEmail = (email: string): boolean => {
  // Check if email is from common free providers (gmail, yahoo, etc.)
  const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  return isValidEmail(email) && !freeProviders.includes(domain);
};

// ==================== Phone Validation ====================

export const isValidPhone = (phone: string, country: string = 'ET'): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  
  switch (country) {
    case 'ET': // Ethiopia
      return /^(?:251|0)?9\d{8}$/.test(cleaned);
    case 'US':
      return /^1?\d{10}$/.test(cleaned);
    case 'UK':
      return /^44?\d{10}$/.test(cleaned);
    default:
      return cleaned.length >= 10 && cleaned.length <= 15;
  }
};

export const isValidMobileMoneyNumber = (phone: string, provider: 'telebirr' | 'mpesa'): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  
  switch (provider) {
    case 'telebirr':
      // Ethiopian numbers starting with 9
      return /^(?:251|0)?9\d{8}$/.test(cleaned);
    case 'mpesa':
      // Kenyan numbers starting with 7 or 1
      return /^(?:254|0)?[71]\d{8}$/.test(cleaned);
    default:
      return false;
  }
};

// ==================== Password Validation ====================

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isStrong: boolean;
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length < 8) {
    feedback.push('At least 8 characters');
  } else {
    score += 1;
  }
  
  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    feedback.push('At least one uppercase letter');
  } else {
    score += 1;
  }
  
  // Lowercase check
  if (!/[a-z]/.test(password)) {
    feedback.push('At least one lowercase letter');
  } else {
    score += 1;
  }
  
  // Number check
  if (!/\d/.test(password)) {
    feedback.push('At least one number');
  } else {
    score += 1;
  }
  
  // Special character check
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('At least one special character');
  } else {
    score += 1;
  }
  
  return {
    score,
    feedback,
    isStrong: score >= 4,
  };
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const doPasswordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

// ==================== Name Validation ====================

export const isValidName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 50 && /^[a-zA-Z\s'-]+$/.test(name);
};

export const isValidFullName = (fullName: string): boolean => {
  const parts = fullName.trim().split(/\s+/);
  return parts.length >= 2 && parts.every(part => isValidName(part));
};

// ==================== Address Validation ====================

export const isValidAddress = (address: string): boolean => {
  return address.length >= 5 && address.length <= 200;
};

export const isValidPostalCode = (postalCode: string, country: string = 'ET'): boolean => {
  switch (country) {
    case 'ET':
      return /^\d{4}$/.test(postalCode);
    case 'US':
      return /^\d{5}(-\d{4})?$/.test(postalCode);
    case 'UK':
      return /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(postalCode);
    default:
      return postalCode.length >= 3 && postalCode.length <= 10;
  }
};

// ==================== Number Validation ====================

export const isValidPrice = (price: number): boolean => {
  return !isNaN(price) && price >= 0 && price <= 1000000;
};

export const isValidRating = (rating: number): boolean => {
  return rating >= 1 && rating <= 5;
};

export const isValidPercentage = (value: number): boolean => {
  return value >= 0 && value <= 100;
};

export const isValidYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear;
};

export const isValidAge = (age: number): boolean => {
  return age >= 18 && age <= 120;
};

// ==================== Date Validation ====================

export const isValidDate = (date: any): boolean => {
  if (!date) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

export const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};

export const isPastDate = (date: Date): boolean => {
  return date < new Date();
};

export const isValidBookingDate = (date: Date): boolean => {
  const now = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3); // Can book up to 3 months in advance
  
  return date >= now && date <= maxDate;
};

export const isValidTimeSlot = (start: string, end: string): boolean => {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  
  return endTotal > startTotal && (endTotal - startTotal) >= 30; // Minimum 30 minutes
};

// ==================== URL Validation ====================

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidImageUrl = (url: string): boolean => {
  if (!isValidUrl(url)) return false;
  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp)$/i;
  return imageExtensions.test(url);
};

// ==================== File Validation ====================

export const isValidFileSize = (size: number, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
};

export const isValidFileType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(mimeType);
};

export const isValidImageType = (mimeType: string): boolean => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return imageTypes.includes(mimeType);
};

// ==================== ID Validation ====================

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const isValidMongoId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// ==================== Payment Validation ====================

export const isValidCardNumber = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  // Luhn algorithm
  let sum = 0;
  let alternate = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);
    
    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    alternate = !alternate;
  }
  
  return sum % 10 === 0;
};

export const isValidCVV = (cvv: string): boolean => {
  return /^\d{3,4}$/.test(cvv);
};

export const isValidExpiryDate = (month: string, year: string): boolean => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100;
  const currentMonth = currentDate.getMonth() + 1;
  
  const expMonth = parseInt(month, 10);
  const expYear = parseInt(year, 10);
  
  if (expMonth < 1 || expMonth > 12) return false;
  
  if (expYear > currentYear) return true;
  if (expYear === currentYear && expMonth >= currentMonth) return true;
  
  return false;
};

// ==================== Coordinates Validation ====================

export const isValidLatitude = (lat: number): boolean => {
  return lat >= -90 && lat <= 90;
};

export const isValidLongitude = (lng: number): boolean => {
  return lng >= -180 && lng <= 180;
};

export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return isValidLatitude(lat) && isValidLongitude(lng);
};

// ==================== Form Validation ====================

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateForm = <T extends Record<string, any>>(
  data: T,
  rules: Partial<Record<keyof T, ValidationRule[]>>
): ValidationResult => {
  const errors: Record<string, string> = {};
  
  Object.entries(rules).forEach(([field, fieldRules]) => {
    const value = data[field];
    
    fieldRules?.forEach(rule => {
      if (!rule.validate(value)) {
        errors[field] = rule.message;
      }
    });
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ==================== Common Validation Rules ====================

export const validationRules = {
  required: (fieldName: string): ValidationRule => ({
    validate: (value: any) => value !== undefined && value !== null && value.toString().trim() !== '',
    message: `${fieldName} is required`,
  }),
  
  email: (): ValidationRule => ({
    validate: isValidEmail,
    message: 'Please enter a valid email address',
  }),
  
  phone: (country?: string): ValidationRule => ({
    validate: (value: string) => isValidPhone(value, country),
    message: 'Please enter a valid phone number',
  }),
  
  minLength: (fieldName: string, min: number): ValidationRule => ({
    validate: (value: string) => value.length >= min,
    message: `${fieldName} must be at least ${min} characters`,
  }),
  
  maxLength: (fieldName: string, max: number): ValidationRule => ({
    validate: (value: string) => value.length <= max,
    message: `${fieldName} must not exceed ${max} characters`,
  }),
  
  min: (fieldName: string, min: number): ValidationRule => ({
    validate: (value: number) => value >= min,
    message: `${fieldName} must be at least ${min}`,
  }),
  
  max: (fieldName: string, max: number): ValidationRule => ({
    validate: (value: number) => value <= max,
    message: `${fieldName} must not exceed ${max}`,
  }),
  
  pattern: (fieldName: string, pattern: RegExp, message: string): ValidationRule => ({
    validate: (value: string) => pattern.test(value),
    message: message || `${fieldName} is invalid`,
  }),
  
  match: (fieldName: string, matchField: string, matchValue: any): ValidationRule => ({
    validate: (value: any) => value === matchValue,
    message: `${fieldName} must match ${matchField}`,
  }),
};