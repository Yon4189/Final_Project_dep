// components/provider/StatusBadge.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
export type StatusType = 
  | 'pending' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled'
  | 'disputed'
  | 'paid'
  | 'unpaid'
  | 'refunded'
  | 'active'
  | 'inactive'
  | 'verified'
  | 'unverified'
  | 'online'
  | 'offline';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  outlined?: boolean;
  style?: ViewStyle;
  customColor?: string;
}

const STATUS_CONFIG: Record<StatusType, { 
  color: string; 
  icon: keyof typeof Ionicons.glyphMap;
  defaultLabel: string;
}> = {
  pending: { 
    color: Colors.warning, 
    icon: 'time-outline',
    defaultLabel: 'Pending'
  },
  confirmed: { 
    color: Colors.info, 
    icon: 'checkmark-circle-outline',
    defaultLabel: 'Confirmed'
  },
  in_progress: { 
    color: Colors.primary, 
    icon: 'construct-outline',
    defaultLabel: 'In Progress'
  },
  completed: { 
    color: Colors.success, 
    icon: 'checkmark-done-outline',
    defaultLabel: 'Completed'
  },
  cancelled: { 
    color: Colors.error, 
    icon: 'close-circle-outline',
    defaultLabel: 'Cancelled'
  },
  disputed: { 
    color: Colors.warning, 
    icon: 'alert-circle-outline',
    defaultLabel: 'Disputed'
  },
  paid: { 
    color: Colors.success, 
    icon: 'cash-outline',
    defaultLabel: 'Paid'
  },
  unpaid: { 
    color: Colors.warning, 
    icon: 'time-outline',
    defaultLabel: 'Unpaid'
  },
  refunded: { 
    color: Colors.purple, 
    icon: 'refresh-outline',
    defaultLabel: 'Refunded'
  },
  active: { 
    color: Colors.success, 
    icon: 'checkmark-circle',
    defaultLabel: 'Active'
  },
  inactive: { 
    color: Colors.text.secondary, 
    icon: 'close-circle',
    defaultLabel: 'Inactive'
  },
  verified: { 
    color: Colors.success, 
    icon: 'shield-checkmark',
    defaultLabel: 'Verified'
  },
  unverified: { 
    color: Colors.warning, 
    icon: 'shield-outline',
    defaultLabel: 'Unverified'
  },
  online: { 
    color: Colors.success, 
    icon: 'radio-button-on',
    defaultLabel: 'Online'
  },
  offline: { 
    color: Colors.text.secondary, 
    icon: 'radio-button-off',
    defaultLabel: 'Offline'
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'medium',
  showIcon = true,
  outlined = false,
  style,
  customColor,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const displayLabel = label || config.defaultLabel;
  const color = customColor || config.color;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          text: styles.smallText,
          iconSize: 12,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          text: styles.largeText,
          iconSize: 18,
        };
      default:
        return {
          container: styles.mediumContainer,
          text: styles.mediumText,
          iconSize: 14,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const containerStyle = [
    styles.badge,
    sizeStyles.container,
    outlined ? styles.outlined : styles.filled,
    outlined ? { borderColor: color } : { backgroundColor: color + '20' },
    style,
  ];

  const textStyle = [
    sizeStyles.text,
    { color: outlined ? color : color },
  ];

  return (
    <View style={containerStyle}>
      {showIcon && (
        <Ionicons 
          name={config.icon} 
          size={sizeStyles.iconSize} 
          color={outlined ? color : color}
          style={styles.icon}
        />
      )}
      <Text style={textStyle}>{displayLabel}</Text>
    </View>
  );
};

// Additional specialized status badges
interface AvailabilityBadgeProps {
  isAvailable: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const AvailabilityBadge: React.FC<AvailabilityBadgeProps> = ({
  isAvailable,
  size = 'medium',
  showLabel = true,
}) => {
  return (
    <StatusBadge
      status={isAvailable ? 'online' : 'offline'}
      label={showLabel ? (isAvailable ? 'Available' : 'Not Available') : undefined}
      size={size}
    />
  );
};

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  isVerified,
  size = 'medium',
}) => {
  return (
    <StatusBadge
      status={isVerified ? 'verified' : 'unverified'}
      size={size}
    />
  );
};

interface PaymentStatusBadgeProps {
  status: 'paid' | 'unpaid' | 'refunded';
  size?: 'small' | 'medium' | 'large';
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  size = 'medium',
}) => {
  return <StatusBadge status={status} size={size} />;
};

// Dot indicator for compact spaces
interface StatusDotProps {
  status: StatusType;
  size?: number;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  size = 8,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  return (
    <View 
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.color,
        },
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 100,
  },
  filled: {
    backgroundColor: 'transparent',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  // Small size
  smallContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  smallText: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Medium size
  mediumContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mediumText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Large size
  largeContainer: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  largeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Dot indicator
  dot: {
    marginHorizontal: 2,
  },
});