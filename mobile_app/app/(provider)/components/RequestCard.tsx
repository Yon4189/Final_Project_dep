// app/(provider)/requests/components/RequestCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { formatCurrency, formatTimeAgo } from '../.././utils/formatters';
import type { ServiceRequest } from '../../types/provider.types';

interface RequestCardProps {
  request: ServiceRequest;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onReschedule?: (id: string) => void;
  onDirections?: (id: string) => void;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

const STATUS_COLORS = {
  pending: Colors.warning,
  confirmed: Colors.primary,
  in_progress: Colors.info,
  completed: Colors.success,
  cancelled: Colors.error,
};

const STATUS_ICONS = {
  pending: 'time-outline',
  confirmed: 'checkmark-circle-outline',
  in_progress: 'construct-outline',
  completed: 'checkmark-done-outline',
  cancelled: 'close-circle-outline',
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onAccept,
  onReject,
  onReschedule,
  onDirections,
  onStart,
  onComplete,
  showActions = true,
  compact = false,
}) => {
  const router = useRouter();

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
    router.push(`/(provider)/requests/${request.id}`);
  };

  const handleAccept = () => {
    onAccept?.(request.id);
  };

  const handleReject = () => {
    onReject?.(request.id);
  };

  const handleReschedule = () => {
    onReschedule?.(request.id);
  };

  const handleDirections = () => {
    onDirections?.(request.id);
  };

  const handleStart = () => {
    onStart?.(request.id);
  };

  const handleComplete = () => {
    onComplete?.(request.id);
  };

  const renderCompactCard = () => (
    <TouchableOpacity
      style={styles.compactCard}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.compactHeader}>
        <View style={styles.compactCustomer}>
          <Image
            source={{ uri: request.customerImage || 'https://via.placeholder.com/32' }}
            style={styles.compactImage}
          />
          <View>
            <Text style={styles.compactCustomerName} numberOfLines={1}>
              {request.customerName}
            </Text>
            <Text style={styles.compactServiceName} numberOfLines={1}>
              {request.serviceName}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
         <Ionicons 
            name={getStatusIcon(request.status) as keyof typeof Ionicons.glyphMap} 
            size={12} 
            color={getStatusColor(request.status)} 
             />
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {getStatusLabel(request.status)}
          </Text>
        </View>
      </View>

      <View style={styles.compactDetails}>
        <View style={styles.compactDetail}>
          <Ionicons name="time-outline" size={12} color={Colors.text.secondary} />
          <Text style={styles.compactDetailText}>
            {request.scheduledTime}
          </Text>
        </View>

        <View style={styles.compactDetail}>
          <Ionicons name="location-outline" size={12} color={Colors.text.secondary} />
          <Text style={styles.compactDetailText} numberOfLines={1}>
            {request.customerAddress}
          </Text>
        </View>

        {request.distance && (
          <View style={styles.compactDetail}>
            <Ionicons name="navigate-outline" size={12} color={Colors.text.secondary} />
            <Text style={styles.compactDetailText}>
              {request.distance.toFixed(1)} km
            </Text>
          </View>
        )}
      </View>

      <View style={styles.compactFooter}>
        <Text style={styles.compactPrice}>{formatCurrency(request.estimatedPrice)}</Text>
        <Text style={styles.compactTime}>{formatTimeAgo(request.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFullCard = () => (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <Image
            source={{ uri: request.customerImage || 'https://via.placeholder.com/40' }}
            style={styles.customerImage}
          />
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{request.customerName}</Text>
            <Text style={styles.requestNumber}>#{request.requestNumber}</Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
          <Ionicons 
              name={getStatusIcon(request.status) as keyof typeof Ionicons.glyphMap} 
              size={12} 
              color={getStatusColor(request.status)} 
/>
          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
            {getStatusLabel(request.status)}
          </Text>
        </View>
      </View>

      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{request.serviceName}</Text>
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>{formatCurrency(request.estimatedPrice)}</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.text.secondary} />
          <Text style={styles.detailText}>
            {request.scheduledDate} at {request.scheduledTime}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
          <Text style={styles.detailText} numberOfLines={1}>
            {request.customerAddress}
          </Text>
        </View>

        {request.distance && (
          <View style={styles.detailRow}>
            <Ionicons name="navigate-outline" size={14} color={Colors.text.secondary} />
            <Text style={styles.detailText}>
              {request.distance.toFixed(1)} km • {request.travelTime} min drive
            </Text>
          </View>
        )}
      </View>

      {showActions && (
        <View style={styles.cardFooter}>
          <Text style={styles.timeAgo}>
            {formatTimeAgo(request.createdAt)}
          </Text>

          <View style={styles.actionButtons}>
            {request.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleAccept}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleReject}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}

            {request.status === 'confirmed' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rescheduleButton]}
                  onPress={handleReschedule}
                >
                  <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.directionsButton]}
                  onPress={handleDirections}
                >
                  <Ionicons name="navigate" size={14} color={Colors.surface} />
                  <Text style={styles.directionsButtonText}>Go</Text>
                </TouchableOpacity>
              </>
            )}

            {request.status === 'in_progress' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={handleComplete}
              >
                <Text style={styles.completeButtonText}>Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return compact ? renderCompactCard() : renderFullCard();
};

const styles = StyleSheet.create({
  // Full Card Styles
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  requestNumber: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  serviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  priceTag: {
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeAgo: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  acceptButton: {
    backgroundColor: Colors.success + '10',
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  acceptButtonText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: Colors.error + '10',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  rejectButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  rescheduleButton: {
    backgroundColor: Colors.warning + '10',
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  rescheduleButtonText: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  directionsButton: {
    backgroundColor: Colors.primary,
  },
  directionsButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: Colors.success,
  },
  completeButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },

  // Compact Card Styles
  compactCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 280,
    marginRight: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  compactCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  compactCustomerName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  compactServiceName: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  compactDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  compactDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactDetailText: {
    fontSize: 10,
    color: Colors.text.secondary,
    maxWidth: 120,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  compactTime: {
    fontSize: 9,
    color: Colors.text.secondary,
  },
});