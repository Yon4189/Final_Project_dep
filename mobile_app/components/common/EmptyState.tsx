// components/common/EmptyState.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/app/constants/Colors';

const { width } = Dimensions.get('window');

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  image?: any;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: 'default' | 'compact' | 'large';
  illustration?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'search-outline',
  image,
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
  illustration = false,
}) => {
  const getIconSize = () => {
    switch (variant) {
      case 'compact':
        return 48;
      case 'large':
        return 100;
      default:
        return 70;
    }
  };

  const getIconColor = () => {
    switch (icon) {
      case 'alert-circle-outline':
        return Colors.error;
      case 'checkmark-circle-outline':
        return Colors.success;
      case 'time-outline':
        return Colors.warning;
      default:
        return Colors.text.secondary;
    }
  };

  const renderIcon = () => {
    if (image) {
      return <Image source={image} style={[styles.image, { width: getIconSize(), height: getIconSize() }]} />;
    }

    if (illustration) {
      return (
        <LinearGradient
          colors={[Colors.primary + '20', Colors.primary + '05']}
          style={[styles.illustrationContainer, { width: getIconSize() * 2, height: getIconSize() * 2 }]}
        >
          <Ionicons name={icon} size={getIconSize()} color={Colors.primary} />
        </LinearGradient>
      );
    }

    return (
      <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '10' }]}>
        <Ionicons name={icon} size={getIconSize()} color={getIconColor()} />
      </View>
    );
  };

  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer]}>
        <View style={styles.compactContent}>
          <Ionicons name={icon} size={24} color={Colors.text.secondary} />
          <View style={styles.compactTextContainer}>
            <Text style={styles.compactTitle}>{title}</Text>
            <Text style={styles.compactMessage}>{message}</Text>
          </View>
        </View>
        {actionLabel && onAction && (
          <TouchableOpacity style={styles.compactAction} onPress={onAction}>
            <Text style={styles.compactActionText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, variant === 'large' && styles.largeContainer]}>
      {renderIcon()}
      
      <Text style={[styles.title, variant === 'large' && styles.largeTitle]}>
        {title}
      </Text>
      
      <Text style={[styles.message, variant === 'large' && styles.largeMessage]}>
        {message}
      </Text>

      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actionsContainer}>
          {actionLabel && onAction && (
            <TouchableOpacity
              style={[styles.actionButton, variant === 'large' && styles.largeActionButton]}
              onPress={onAction}
            >
              <Text style={[styles.actionText, variant === 'large' && styles.largeActionText]}>
                {actionLabel}
              </Text>
            </TouchableOpacity>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <TouchableOpacity
              style={[styles.secondaryActionButton, variant === 'large' && styles.largeSecondaryActionButton]}
              onPress={onSecondaryAction}
            >
              <Text style={[styles.secondaryActionText, variant === 'large' && styles.largeSecondaryActionText]}>
                {secondaryActionLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// Predefined Empty States
export const NoSearchResults: React.FC<{ query?: string; onClear?: () => void }> = ({
  query,
  onClear,
}) => (
  <EmptyState
    icon="search-outline"
    title="No results found"
    message={
      query
        ? `We couldn't find any results for "${query}"`
        : 'Try adjusting your search or filters'
    }
    actionLabel="Clear Search"
    onAction={onClear}
  />
);

export const NoBookings: React.FC<{ onBrowse?: () => void }> = ({ onBrowse }) => (
  <EmptyState
    icon="calendar-outline"
    title="No bookings yet"
    message="When you book a service, it will appear here"
    actionLabel="Browse Services"
    onAction={onBrowse}
    illustration
  />
);

export const NoMessages: React.FC<{ onBrowse?: () => void }> = ({ onBrowse }) => (
  <EmptyState
    icon="chatbubbles-outline"
    title="No messages"
    message="Start a conversation with a service provider"
    actionLabel="Find Providers"
    onAction={onBrowse}
    illustration
  />
);

export const NoNotifications: React.FC = () => (
  <EmptyState
    icon="notifications-outline"
    title="All caught up!"
    message="You don't have any notifications at the moment"
  />
);

export const NoFavorites: React.FC<{ onBrowse?: () => void }> = ({ onBrowse }) => (
  <EmptyState
    icon="heart-outline"
    title="No favorites yet"
    message="Save your favorite providers to quickly book them later"
    actionLabel="Explore Providers"
    onAction={onBrowse}
    illustration
  />
);

export const NoReviews: React.FC = () => (
  <EmptyState
    icon="star-outline"
    title="No reviews"
    message="You haven't reviewed any services yet"
  />
);

export const NoComplaints: React.FC<{ onNew?: () => void }> = ({ onNew }) => (
  <EmptyState
    icon="alert-circle-outline"
    title="No complaints"
    message="You haven't filed any complaints"
    actionLabel="File a Complaint"
    onAction={onNew}
  />
);

export const NoTransactions: React.FC<{ onTopUp?: () => void }> = ({ onTopUp }) => (
  <EmptyState
    icon="wallet-outline"
    title="No transactions"
    message="Your transaction history will appear here"
    actionLabel="Top Up Wallet"
    onAction={onTopUp}
    illustration
  />
);

export const NoProviders: React.FC<{ onClear?: () => void }> = ({ onClear }) => (
  <EmptyState
    icon="construct-outline"
    title="No providers found"
    message="Try adjusting your filters or search in a different area"
    actionLabel="Clear Filters"
    onAction={onClear}
  />
);

export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="cloud-offline-outline"
    title="Network Error"
    message="Unable to connect. Please check your internet connection"
    actionLabel="Try Again"
    onAction={onRetry}
  />
);

export const ServerError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon="alert-circle-outline"
    title="Server Error"
    message="Something went wrong on our end. Please try again later"
    actionLabel="Retry"
    onAction={onRetry}
  />
);

export const ComingSoon: React.FC<{ feature?: string; onNotify?: () => void }> = ({
  feature,
  onNotify,
}) => (
  <EmptyState
    icon="construct-outline"
    title="Coming Soon"
    message={`${feature || 'This feature'} is under development`}
    actionLabel={onNotify ? "Notify Me" : undefined}
    onAction={onNotify}
    illustration
  />
);

export const AccessDenied: React.FC<{ onBack?: () => void }> = ({ onBack }) => (
  <EmptyState
    icon="lock-closed-outline"
    title="Access Denied"
    message="You don't have permission to view this content"
    actionLabel="Go Back"
    onAction={onBack}
  />
);

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  largeContainer: {
    minHeight: 400,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  illustrationContainer: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  image: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  largeTitle: {
    fontSize: 22,
  },
  message: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  largeMessage: {
    fontSize: 16,
    lineHeight: 22,
  },
  actionsContainer: {
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  largeActionButton: {
    paddingVertical: 16,
    borderRadius: 14,
  },
  actionText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  largeActionText: {
    fontSize: 17,
  },
  secondaryActionButton: {
    backgroundColor: Colors.background,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  largeSecondaryActionButton: {
    paddingVertical: 16,
    borderRadius: 14,
  },
  secondaryActionText: {
    color: Colors.text.secondary,
    fontSize: 15,
    fontWeight: '500',
  },
  largeSecondaryActionText: {
    fontSize: 17,
  },
  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  compactMessage: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  compactAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary + '10',
    borderRadius: 20,
    marginLeft: 12,
  },
  compactActionText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
});

// Merge styles
const styles = { ...emptyStyles };