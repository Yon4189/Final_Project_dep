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
import { useTheme } from '@/app/context/ThemeContext';
import { ThemeColors } from '@/app/constants/Colors';

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
  variant?: 'default' | 'compact' | 'large' | 'card';
  illustration?: boolean;
  iconColor?: string;
  iconSize?: number;
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
  iconColor,
  iconSize,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const getIconSize = () => {
    if (iconSize) return iconSize;
    switch (variant) {
      case 'compact':
        return 48;
      case 'large':
        return 100;
      case 'card':
        return 40;
      default:
        return 70;
    }
  };

  const getIconColor = () => {
    if (iconColor) return iconColor;
    switch (icon) {
      case 'alert-circle-outline':
        return colors.error;
      case 'checkmark-circle-outline':
        return colors.success;
      case 'time-outline':
        return colors.warning;
      case 'cloud-offline-outline':
        return colors.info;
      default:
        return colors.text.secondary;
    }
  };

  const renderIcon = () => {
    if (image) {
      return <Image source={image} style={[styles.image, { width: getIconSize(), height: getIconSize() }]} />;
    }

    if (illustration) {
      return (
        <LinearGradient
          colors={[colors.primary + '20', colors.primary + '05']}
          style={[styles.illustrationContainer, { width: getIconSize() * 2, height: getIconSize() * 2 }]}
        >
          <Ionicons name={icon} size={getIconSize()} color={colors.primary} />
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
          <Ionicons name={icon} size={24} color={colors.text.secondary} />
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

  if (variant === 'card') {
    return (
      <View style={styles.cardContainer}>
        {renderIcon()}
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardMessage}>{message}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity style={styles.cardAction} onPress={onAction}>
            <Text style={styles.cardActionText}>{actionLabel}</Text>
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

export const NoBookings: React.FC<{ onBrowse?: () => void; isProvider?: boolean }> = ({ 
  onBrowse, 
  isProvider = false 
}) => (
  <EmptyState
    icon="calendar-outline"
    title="No bookings yet"
    message={isProvider 
      ? "When customers book your services, they'll appear here"
      : "When you book a service, it will appear here"}
    actionLabel={isProvider ? "Update Availability" : "Browse Services"}
    onAction={onBrowse}
    illustration
  />
);

export const NoRequests: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyState
    icon="document-text-outline"
    title="No requests"
    message="You don't have any service requests at the moment"
    actionLabel="Refresh"
    onAction={onRefresh}
  />
);

export const NoMessages: React.FC<{ onBrowse?: () => void }> = ({ onBrowse }) => (
  <EmptyState
    icon="chatbubbles-outline"
    title="No messages"
    message="Start a conversation with a customer or provider"
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

export const NoReviews: React.FC<{ isProvider?: boolean }> = ({ isProvider = false }) => (
  <EmptyState
    icon="star-outline"
    title="No reviews"
    message={isProvider
      ? "When customers review your services, they'll appear here"
      : "You haven't reviewed any services yet"}
    variant="card"
  />
);

export const NoComplaints: React.FC<{ onNew?: () => void; isProvider?: boolean }> = ({ 
  onNew, 
  isProvider = false 
}) => (
  <EmptyState
    icon="alert-circle-outline"
    title="No disputes"
    message={isProvider
      ? "You haven't filed any disputes"
      : "If you have an issue with a service, you can report it here"}
    actionLabel={isProvider ? "File a Dispute" : "Report an Issue"}
    onAction={onNew}
  />
);

export const NoTransactions: React.FC<{ onTopUp?: () => void; isProvider?: boolean }> = ({ 
  onTopUp, 
  isProvider = false 
}) => (
  <EmptyState
    icon="wallet-outline"
    title="No transactions"
    message={isProvider
      ? "Your earnings and withdrawals will appear here"
      : "Your transaction history will appear here"}
    actionLabel={isProvider ? "View Earnings" : "Top Up Wallet"}
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

export const NoServices: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
  <EmptyState
    icon="construct-outline"
    title="No services added"
    message="Add your services to start getting bookings"
    actionLabel="Add Service"
    onAction={onAdd}
    variant="card"
  />
);

export const NoEarnings: React.FC = () => (
  <EmptyState
    icon="cash-outline"
    title="No earnings yet"
    message="Complete jobs to start earning money"
    variant="card"
  />
);

export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { colors } = useTheme();
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Network Error"
      message="Unable to connect. Please check your internet connection"
      actionLabel="Try Again"
      onAction={onRetry}
      iconColor={colors.info}
    />
  );
};

export const ServerError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { colors } = useTheme();
  return (
    <EmptyState
      icon="alert-circle-outline"
      title="Server Error"
      message="Something went wrong on our end. Please try again later"
      actionLabel="Retry"
      onAction={onRetry}
      iconColor={colors.error}
    />
  );
};

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

export const AccessDenied: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { colors } = useTheme();
  return (
    <EmptyState
      icon="lock-closed-outline"
      title="Access Denied"
      message="You don't have permission to view this content"
      actionLabel="Go Back"
      onAction={onBack}
      iconColor={colors.error}
    />
  );
};

export const NoLocation: React.FC<{ onEnable?: () => void }> = ({ onEnable }) => {
  const { colors } = useTheme();
  return (
    <EmptyState
      icon="location-outline"
      title="Location Required"
      message="Please enable location services to find providers near you"
      actionLabel="Enable Location"
      onAction={onEnable}
      iconColor={colors.primary}
    />
  );
};

export const NoData: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyState
    icon="document-outline"
    title="No Data"
    message="Unable to load data. Please try again"
    actionLabel="Refresh"
    onAction={onRefresh}
    variant="card"
  />
);

const getStyles = (colors: ThemeColors) => StyleSheet.create({
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
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  largeTitle: {
    fontSize: 22,
  },
  message: {
    fontSize: 14,
    color: colors.text.secondary,
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
    backgroundColor: colors.primary,
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
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  largeActionText: {
    fontSize: 17,
  },
  secondaryActionButton: {
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  largeSecondaryActionButton: {
    paddingVertical: 16,
    borderRadius: 14,
  },
  secondaryActionText: {
    color: colors.text.secondary,
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text.primary,
    marginBottom: 2,
  },
  compactMessage: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  compactAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary + '10',
    borderRadius: 20,
    marginLeft: 12,
  },
  compactActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  // Card variant
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    margin: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  cardMessage: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  cardAction: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cardActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
});

// Merge styles
const styles = {}; 
// Actually we have to use useMemo to get the styles from getStyles.
// I'll update the component logic to reflect this.