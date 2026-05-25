// components/common/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/app/constants/Colors';
import { Platform } from 'react-native';
const { width } = Dimensions.get('window');
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showResetButton?: boolean;
  resetButtonText?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Trigger haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    // Log error to console in development
    if (__DEV__) {
      console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Here you would typically send to your error tracking service
    // Example: Sentry.captureException(error);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    this.handleReset();
    // Optionally reload the app or navigate to home
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={80} color={Colors.error} />
            </View>

            <Text style={styles.title}>Oops! Something went wrong</Text>
            
            <Text style={styles.message}>
              We're sorry for the inconvenience. Please try again or contact support if the problem persists.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorName}>
                  {this.state.error.name}: {this.state.error.message}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.actionsContainer}>
              {this.props.showResetButton !== false && (
                <TouchableOpacity
                  style={[styles.button, styles.resetButton]}
                  onPress={this.handleReset}
                >
                  <Ionicons name="refresh" size={20} color={Colors.surface} />
                  <Text style={styles.resetButtonText}>
                    {this.props.resetButtonText || 'Try Again'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.homeButton]}
                onPress={() => {
                  // Navigate to home screen
                  // You'll need to use router here
                  this.handleReset();
                }}
              >
                <Ionicons name="home" size={20} color={Colors.primary} />
                <Text style={styles.homeButtonText}>Go to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.supportButton]}
                onPress={() => {
                  // Navigate to support
                  // You'll need to use router here
                }}
              >
                <Ionicons name="headset" size={20} color={Colors.text.secondary} />
                <Text style={styles.supportButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

// API Error Component
interface ApiErrorProps {
  error: Error;
  retry?: () => void;
  variant?: 'full' | 'card' | 'toast';
}

export const ApiError: React.FC<ApiErrorProps> = ({
  error,
  retry,
  variant = 'card',
}) => {
  const getErrorMessage = (error: Error): string => {
    if (error.message.includes('Network')) {
      return 'Network connection error. Please check your internet connection.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('401')) {
      return 'You are not authorized. Please login again.';
    }
    if (error.message.includes('403')) {
      return 'You do not have permission to perform this action.';
    }
    if (error.message.includes('404')) {
      return 'The requested resource was not found.';
    }
    if (error.message.includes('500')) {
      return 'Server error. Please try again later.';
    }
    return error.message || 'An unexpected error occurred.';
  };

  if (variant === 'toast') {
    return (
      <View style={styles.toastError}>
        <Ionicons name="alert-circle" size={20} color={Colors.error} />
        <Text style={styles.toastErrorText}>{getErrorMessage(error)}</Text>
        {retry && (
          <TouchableOpacity onPress={retry} style={styles.toastRetry}>
            <Text style={styles.toastRetryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (variant === 'card') {
    return (
      <View style={styles.cardError}>
        <Ionicons name="alert-circle" size={40} color={Colors.error} />
        <Text style={styles.cardErrorTitle}>Error</Text>
        <Text style={styles.cardErrorMessage}>{getErrorMessage(error)}</Text>
        {retry && (
          <TouchableOpacity style={styles.cardRetryButton} onPress={retry}>
            <Text style={styles.cardRetryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fullError}>
      <Ionicons name="alert-circle" size={60} color={Colors.error} />
      <Text style={styles.fullErrorTitle}>Error</Text>
      <Text style={styles.fullErrorMessage}>{getErrorMessage(error)}</Text>
      {retry && (
        <TouchableOpacity style={styles.fullRetryButton} onPress={retry}>
          <Text style={styles.fullRetryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: Colors.error + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.error + '20',
  },
  errorName: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '500',
    marginBottom: 8,
  },
   errorStack: {
  fontSize: 12,
  color: Colors.text.secondary,
  fontFamily: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
},
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  resetButton: {
    backgroundColor: Colors.primary,
  },
  resetButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  homeButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  supportButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  supportButtonText: {
    color: Colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  // API Error variants
  toastError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  toastErrorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: Colors.error,
  },
  toastRetry: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.error,
    borderRadius: 16,
  },
  toastRetryText: {
    fontSize: 12,
    color: Colors.surface,
    fontWeight: '500',
  },
  cardError: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    margin: 20,
  },
  cardErrorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  cardErrorMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  cardRetryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cardRetryText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '500',
  },
  fullError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullErrorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  fullErrorMessage: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  fullRetryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  fullRetryText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

// Merge styles
const styles = { ...errorStyles };