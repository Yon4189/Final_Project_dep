// app/(customer)/requests/components/RequestCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/app/constants/Colors';
import type { ServiceRequest } from '@/app/types/customer.types';
import { API_BASE_URL } from '@/app/config/api';

interface RequestCardProps {
  request: ServiceRequest;
  onPress?: () => void;
  showActions?: boolean;
}

const STATUS_COLORS = {
  pending: Colors.warning,
  accepted: Colors.info,
  confirmed: Colors.info,
  in_progress: Colors.primary,
  completed: Colors.success,
  cancelled: Colors.error,
  disputed: Colors.error,
};

const STATUS_ICONS = {
  pending: 'time-outline',
  accepted: 'checkmark-circle-outline',
  confirmed: 'checkmark-circle-outline',
  in_progress: 'construct-outline',
  completed: 'checkmark-done-outline',
  cancelled: 'close-circle-outline',
  disputed: 'alert-circle-outline',
};

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onPress,
  showActions = true,
}) => {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || Colors.text.secondary;
  };

  const getStatusIcon = (status: string) => {
    return STATUS_ICONS[status as keyof typeof STATUS_ICONS] || 'help-outline';
  };

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(customer)/requests/${request.id}`);
    }
  };

  const handleActionPress = (action: string) => {
    switch (action) {
      case 'track':
        router.push(`/(customer)/requests/${request.id}`);
        break;
      case 'message':
        router.push(`/(customer)/chat/${request.providerId}`);
        break;
      case 'review':
        router.push(`/(customer)/requests/${request.id}`);
        break;
      case 'pay':
        router.push(`/(customer)/requests/${request.id}`);
        break;
    }
  };

  const renderActions = () => {
    switch (request.status) {
      case 'pending':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleActionPress('cancel')}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton]}
              onPress={() => handleActionPress('message')}
            >
              <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        );

      case 'accepted':
      case 'confirmed':
        return (
          <View style={styles.actionButtons}>
            {request.status === 'accepted' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.trackButton, { backgroundColor: Colors.success }]}
                onPress={() => handleActionPress('pay')}
              >
                <Ionicons name="card-outline" size={16} color={Colors.surface} />
                <Text style={styles.trackButtonText}>Pay Now</Text>
              </TouchableOpacity>
            )}
            {request.status === 'confirmed' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.trackButton]}
                onPress={() => handleActionPress('track')}
              >
                <Ionicons name="location-outline" size={16} color={Colors.surface} />
                <Text style={styles.trackButtonText}>Track</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton]}
              onPress={() => handleActionPress('message')}
            >
              <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        );

      case 'in_progress':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.trackButton]}
              onPress={() => handleActionPress('track')}
            >
              <Ionicons name="location-outline" size={16} color={Colors.surface} />
              <Text style={styles.trackButtonText}>Track</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton]}
              onPress={() => handleActionPress('message')}
            >
              <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        );

      case 'completed':
        return request.review ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.reviewButton]}
            onPress={() => handleActionPress('view-review')}
          >
            <Ionicons name="star" size={16} color={Colors.warning} />
            <Text style={styles.reviewButtonText}>View Review</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.reviewButton]}
            onPress={() => handleActionPress('review')}
          >
            <Ionicons name="star-outline" size={16} color={Colors.warning} />
            <Text style={styles.reviewButtonText}>Write Review</Text>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header with Status */}
      <View style={styles.header}>
        <View style={styles.providerInfo}>
          <Image
            source={{
              uri: request.providerImage
                ? (request.providerImage.startsWith('http')
                  ? request.providerImage
                  : `${API_BASE_URL.replace('/api', '')}/${request.providerImage}`)
                : 'https://via.placeholder.com/40'
            }}
            style={styles.providerImage}
          />
          <View>
            <Text style={styles.providerName}>{request.providerName}</Text>
            <Text style={styles.serviceName}>{request.serviceName}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
          <Ionicons
            name={getStatusIcon(request.status) as keyof typeof Ionicons.glyphMap}
            size={14}
            color={getStatusColor(request.status)}
          />
        </View>
        <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
          {getStatusLabel(request.status)}
        </Text>
      </View>
      {/* Request Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.detailText}>
            {formatDate(request.scheduledDate)} at {formatTime(request.scheduledTime)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.detailText} numberOfLines={1}>
            {request.address}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color={Colors.text.secondary} />
          <Text style={styles.priceText}>
            ${request.estimatedPrice.toFixed(2)}
            {request.paymentStatus === 'paid' && (
              <Text style={styles.paidText}> • Paid</Text>
            )}
          </Text>
        </View>

        {request.specialInstructions && (
          <View style={styles.instructionsContainer}>
            <Ionicons name="document-text-outline" size={16} color={Colors.text.secondary} />
            <Text style={styles.instructionsText} numberOfLines={2}>
              {request.specialInstructions}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {showActions && renderActions()}

      {/* Request Number */}
      <Text style={styles.requestNumber}>
        Request #{request.requestNumber}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  priceText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  paidText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '500',
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  instructionsText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.text.secondary,
    flex: 1,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: Colors.error + '10',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  cancelButtonText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  messageButton: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  messageButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  trackButton: {
    backgroundColor: Colors.primary,
  },
  trackButtonText: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  reviewButton: {
    backgroundColor: Colors.warning + '10',
    borderWidth: 1,
    borderColor: Colors.warning + '30',
    alignSelf: 'flex-end',
  },
  reviewButtonText: {
    color: Colors.warning,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  requestNumber: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'right',
  },
});