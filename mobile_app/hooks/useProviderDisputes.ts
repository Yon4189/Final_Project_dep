// hooks/useProviderDisputes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { providerService } from '@/app/services/provider.service';
import type { Dispute } from '@/app/types/provider.types';

// Query Keys
export const disputeKeys = {
  all: ['disputes'] as const,
  lists: () => [...disputeKeys.all, 'list'] as const,
  list: (filters?: any) => [...disputeKeys.lists(), filters] as const,
  details: () => [...disputeKeys.all, 'detail'] as const,
  detail: (id: string) => [...disputeKeys.details(), id] as const,
};

// Utility functions
const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'An error occurred';
  Alert.alert('Error', message);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

const handleSuccess = (message?: string) => {
  if (message) {
    Alert.alert('Success', message);
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Hook to fetch all disputes for the provider
 * @returns {Object} Query result with disputes data, loading state, and refetch function
 */
export function useProviderDisputes() {
  const query = useQuery<Dispute[], Error>({
    queryKey: disputeKeys.lists(),
    queryFn: async () => {
      const response = await providerService.getDisputes();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch disputes');
      }
      return response.data as Dispute[];
    },
  });

  return {
    disputes: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    error: query.error,
  };
}

/**
 * Hook to fetch a single dispute by ID
 * @param {string} id - Dispute ID
 * @returns {Object} Query result with dispute data, loading state, and refetch function
 */
export function useProviderDispute(id: string) {
  const query = useQuery<Dispute, Error>({
    queryKey: disputeKeys.detail(id),
    queryFn: async () => {
      if (!id) throw new Error('Dispute ID is required');
      
      const response = await providerService.getDisputeDetails(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch dispute details');
      }
      return response.data as Dispute;
    },
    enabled: !!id,
  });

  return {
    dispute: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    error: query.error,
  };
}

/**
 * Hook to create a new dispute
 * @returns {Object} Mutation function for creating a dispute
 */
export function useCreateDispute() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: {
      bookingId: string;
      reason: string;
      description: string;
      evidence?: string[];
    }) => {
      const response = await providerService.createDispute(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create dispute');
      }
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate disputes list query to refetch
      queryClient.invalidateQueries({ queryKey: disputeKeys.lists() });
      
      // Also invalidate the specific booking if needed
      if (data?.bookingId) {
        queryClient.invalidateQueries({ 
          queryKey: ['bookings', 'detail', data.bookingId] 
        });
      }
      
      handleSuccess('Dispute filed successfully');
    },
    onError: (error) => {
      handleError(error);
    },
  });

  return {
    createDispute: mutation.mutate,
    createDisputeAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
}

/**
 * Hook to add evidence to an existing dispute
 * @returns {Object} Mutation function for adding evidence
 */
export function useAddDisputeEvidence() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, evidence }: { id: string; evidence: string[] }) => {
      const response = await providerService.addDisputeEvidence(id, evidence);
      if (!response.success) {
        throw new Error(response.message || 'Failed to add evidence');
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific dispute query
      queryClient.invalidateQueries({ 
        queryKey: disputeKeys.detail(variables.id) 
      });
      
      handleSuccess('Evidence added successfully');
    },
    onError: (error) => {
      handleError(error);
    },
  });

  return {
    addEvidence: mutation.mutate,
    addEvidenceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
}

/**
 * Hook to get dispute statistics
 * @param {Dispute[]} disputes - Array of disputes
 * @returns {Object} Dispute statistics
 */
export function useDisputeStats(disputes: Dispute[] = []) {
  const stats = {
    total: disputes.length,
    pending: disputes.filter(d => d.status === 'pending').length,
    underReview: disputes.filter(d => d.status === 'under_review').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    rejected: disputes.filter(d => d.status === 'rejected').length,
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: '#F59E0B',
      under_review: '#3B82F6',
      resolved: '#10B981',
      rejected: '#EF4444',
    };
    return colors[status as keyof typeof colors] || '#6B7280';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: 'time-outline',
      under_review: 'eye-outline',
      resolved: 'checkmark-circle-outline',
      rejected: 'close-circle-outline',
    };
    return icons[status as keyof typeof icons] || 'help-outline';
  };

  return {
    stats,
    getStatusColor,
    getStatusIcon,
  };
}

// Export all hooks as a combined object for convenience
export const disputeHooks = {
  useProviderDisputes,
  useProviderDispute,
  useCreateDispute,
  useAddDisputeEvidence,
  useDisputeStats,
};