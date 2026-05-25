// app/constants/Colors.ts
export const Colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  purple: '#AF52DE',
  primaryDark: '#0056B3',
  skeleton: '#E1E1E1',
  
  background: '#F2F2F7',
  surface: '#FFFFFF',
  
  text: {
    primary: '#000000',
    secondary: '#8E8E93',
    light: '#FFFFFF',
    disabled: '#C7C7CC',
  },
  
  border: '#C6C6C8',
  
  // Status colors
  status: {
    pending: '#FF9500',
    confirmed: '#007AFF',
    in_progress: '#5856D6',
    completed: '#34C759',
    cancelled: '#FF3B30',
    disputed: '#FF9500',
    refunded: '#8E8E93',
  },
  
  // Rating colors
  rating: {
    star: '#FFB800',
    empty: '#E0E0E0',
  },
  
  // Social colors
  social: {
    facebook: '#1877F2',
    google: '#DB4437',
    twitter: '#1DA1F2',
  },
  
  // Transparent colors
  transparent: {
    primary: '#007AFF20',
    secondary: '#5856D620',
    success: '#34C75920',
    warning: '#FF950020',
    error: '#FF3B3020',
    info: '#5AC8FA20',
  },
} as const;

export const darkColors = {
  ...Colors, // inherit base colors like primary, success, etc.
  background: '#121212',
  surface: '#1E1E1E',
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A5',
    light: '#FFFFFF',
    disabled: '#5C5C60',
  },
  border: '#38383A',
  skeleton: '#2C2C2E',
} as const;

export type ThemeColors = typeof Colors | typeof darkColors;
