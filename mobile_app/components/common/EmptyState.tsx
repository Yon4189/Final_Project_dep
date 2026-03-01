// components/common/EmptyState.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'error' | 'loading';
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'alert-circle-outline',
  title,
  message,
  actionLabel,
  onAction,
  variant = 'default',
  style,
}) => {
  const getIconColor = () => {
    switch (variant) {
      case 'error':
        return Colors.error;
      case 'search':
        return Colors.primary;
      case 'loading':
        return Colors.text.secondary;
      default:
        return Colors.text.secondary;
    }
  };

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    if (icon) return icon;
    
    switch (variant) {
      case 'error':
        return 'alert-circle';
      case 'search':
        return 'search';
      case 'loading':
        return 'time';
      default:
        return 'alert-circle-outline';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={getIconName()} size={64} color={getIconColor()} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
      
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  iconContainer: {
    marginBottom: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: 8,
  },
});