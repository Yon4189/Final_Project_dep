// hooks/useProviderQueries.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { providerService } from '@/app/services/provider.service';
import { useEarningsSummary } from './useProviderEarnings';
import type {
  ServiceRequest,
  ProviderProfile,
  CustomerReview,
  Dispute,
  RequestStatus,
} from '@/app/types/provider.types';

// Query Keys
export const providerKeys = {
  all: ['provider'] as const,
  profile: () => [...providerKeys.all, 'profile'] as const,
  requests: () => [...providerKeys.all, 'requests'] as const,
  request: (id: string) => [...providerKeys.requests(), id] as const,
  pendingRequests: () => [...providerKeys.requests(), 'pending'] as const,
  todaySchedule: () => [...providerKeys.requests(), 'today'] as const,
  stats: () => [...providerKeys.all, 'stats'] as const,
  reviews: () => [...providerKeys.all, 'reviews'] as const,
  disputes: () => [...providerKeys.all, 'disputes'] as const,
  dispute: (id: string) => [...providerKeys.disputes(), id] as const,
  services: () => [...providerKeys.all, 'services'] as const,
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

// ==================== Profile Hooks ====================

export function useProviderProfile(options?: Omit<UseQueryOptions<ProviderProfile, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<ProviderProfile, Error>({
    queryKey: providerKeys.profile(),
    queryFn: async () => {
      const response = await providerService.getProfile();
      if (!response.success) throw new Error(response.message);
      return response.data as ProviderProfile;
    },
    ...options,
  });
}

export function useUpdateProfile(options?: UseMutationOptions<ProviderProfile, Error, Partial<ProviderProfile>>) {
  const queryClient = useQueryClient();

  return useMutation<ProviderProfile, Error, Partial<ProviderProfile>>({
    mutationFn: async (data: Partial<ProviderProfile>) => {
      const response = await providerService.updateProfile(data);
      if (!response.success) throw new Error(response.message);
      return response.data as ProviderProfile;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.profile() });
      handleSuccess('Profile updated successfully');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useUpdateAvailability(options?: UseMutationOptions<ProviderProfile, Error, boolean>) {
  const queryClient = useQueryClient();

  return useMutation<ProviderProfile, Error, boolean>({
    mutationFn: async (isAvailable: boolean) => {
      const response = await providerService.updateAvailability(isAvailable);
      if (!response.success) throw new Error(response.message);
      return response.data as ProviderProfile;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.profile() });
      handleSuccess(variables ? 'You are now available' : 'You are now offline');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useUploadProfileImage(options?: UseMutationOptions<{ url: string }, Error, FormData>) {
  const queryClient = useQueryClient();

  return useMutation<{ url: string }, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const response = await providerService.uploadProfileImage(formData);
      if (!response.success) throw new Error(response.message);
      return response.data as { url: string };
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.profile() });
      handleSuccess('Profile image updated');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

// ==================== Service Request Hooks ====================

export function useProviderRequests(status?: RequestStatus, options?: Omit<UseQueryOptions<ServiceRequest[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<ServiceRequest[], Error>({
    queryKey: [...providerKeys.requests(), status],
    queryFn: async () => {
      const response = await providerService.getRequests(status);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest[];
    },
    ...options,
  });
}

export function useProviderRequest(id: string, options?: Omit<UseQueryOptions<ServiceRequest, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<ServiceRequest, Error>({
    queryKey: providerKeys.request(id),
    queryFn: async () => {
      const response = await providerService.getRequestDetails(id);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest;
    },
    enabled: !!id,
    ...options,
  });
}

export function useAcceptRequest(options?: UseMutationOptions<ServiceRequest, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<ServiceRequest, Error, string>({
    mutationFn: async (id: string) => {
      console.log('🚀 Accepting request:', id);
      const response = await providerService.acceptRequest(id);
      console.log('✅ Accept response:', response);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.requests() });
      queryClient.invalidateQueries({ queryKey: providerKeys.pendingRequests() });
      queryClient.invalidateQueries({ queryKey: providerKeys.request(variables) });
      queryClient.invalidateQueries({ queryKey: providerKeys.stats() });
      queryClient.invalidateQueries({ queryKey: providerKeys.todaySchedule() });
      handleSuccess('Request accepted successfully');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useRejectRequest(options?: UseMutationOptions<ServiceRequest, Error, { id: string; reason: string }>) {
  const queryClient = useQueryClient();

  return useMutation<ServiceRequest, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      console.log('🚀 Rejecting request:', id, 'reason:', reason);
      const response = await providerService.rejectRequest(id, reason);
      console.log('✅ Reject response:', response);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.requests() });
      queryClient.invalidateQueries({ queryKey: providerKeys.pendingRequests() });
      queryClient.invalidateQueries({ queryKey: providerKeys.request(variables.id) });
      queryClient.invalidateQueries({ queryKey: providerKeys.stats() });
      handleSuccess('Request rejected');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useRescheduleRequest(options?: UseMutationOptions<ServiceRequest, Error, { 
  id: string; 
  data: { scheduledDate: string; scheduledTime: string; reason?: string } 
}>) {
  const queryClient = useQueryClient();

  return useMutation<ServiceRequest, Error, { id: string; data: { scheduledDate: string; scheduledTime: string; reason?: string } }>({
    mutationFn: async ({ id, data }) => {
      const response = await providerService.rescheduleRequest(id, data);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.requests() });
      queryClient.invalidateQueries({ queryKey: providerKeys.request(variables.id) });
      handleSuccess('Request rescheduled');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useStartService(options?: UseMutationOptions<ServiceRequest, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<ServiceRequest, Error, string>({
    mutationFn: async (id: string) => {
      const response = await providerService.startService(id);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.requests() });
      queryClient.invalidateQueries({ queryKey: providerKeys.request(variables) });
      handleSuccess('Service started');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useCompleteService(options?: UseMutationOptions<ServiceRequest, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<ServiceRequest, Error, string>({
    mutationFn: async (id: string) => {
      const response = await providerService.completeService(id);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.requests() });
      queryClient.invalidateQueries({ queryKey: providerKeys.request(variables) });
      handleSuccess('Service completed. Payment will be released after customer confirmation.');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useGetDirections(id: string, options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, Error>({
    queryKey: [...providerKeys.request(id), 'directions'],
    queryFn: async () => {
      const response = await providerService.getDirectionsToCustomer(id);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    enabled: !!id,
    ...options,
  });
}

// ==================== Dashboard Stats Hooks ====================

export function useDashboardStats(options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, Error>({
    queryKey: providerKeys.stats(),
    queryFn: async () => {
      const response = await providerService.getDashboardStats();
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    ...options,
  });
}

export function useTodaySchedule(options?: Omit<UseQueryOptions<ServiceRequest[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<ServiceRequest[], Error>({
    queryKey: providerKeys.todaySchedule(),
    queryFn: async () => {
      const response = await providerService.getTodaySchedule();
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest[];
    },
    ...options,
  });
}

export function usePendingRequests(options?: Omit<UseQueryOptions<ServiceRequest[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<ServiceRequest[], Error>({
    queryKey: providerKeys.pendingRequests(),
    queryFn: async () => {
      const response = await providerService.getRequests('pending');
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest[];
    },
    ...options,
  });
}

// ==================== Review Hooks ====================

export function useProviderReviews(page: number = 1, options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, Error>({
    queryKey: [...providerKeys.reviews(), page],
    queryFn: async () => {
      const response = await providerService.getReviews(page);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    ...options,
  });
}

export function useRespondToReview(options?: UseMutationOptions<CustomerReview, Error, { reviewId: string; message: string }>) {
  const queryClient = useQueryClient();

  return useMutation<CustomerReview, Error, { reviewId: string; message: string }>({
    mutationFn: async ({ reviewId, message }) => {
      const response = await providerService.respondToReview(reviewId, message);
      if (!response.success) throw new Error(response.message);
      return response.data as CustomerReview;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.reviews() });
      handleSuccess('Response posted successfully');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

// ==================== Dispute Hooks ====================

export function useProviderDisputes(options?: Omit<UseQueryOptions<Dispute[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<Dispute[], Error>({
    queryKey: providerKeys.disputes(),
    queryFn: async () => {
      const response = await providerService.getDisputes();
      if (!response.success) throw new Error(response.message);
      return response.data as Dispute[];
    },
    ...options,
  });
}

export function useProviderDispute(id: string, options?: Omit<UseQueryOptions<Dispute, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<Dispute, Error>({
    queryKey: providerKeys.dispute(id),
    queryFn: async () => {
      const response = await providerService.getDisputeDetails(id);
      if (!response.success) throw new Error(response.message);
      return response.data as Dispute;
    },
    enabled: !!id,
    ...options,
  });
}

export function useCreateDispute(options?: UseMutationOptions<Dispute, Error, any>) {
  const queryClient = useQueryClient();

  return useMutation<Dispute, Error, any>({
    mutationFn: async (data: any) => {
      const response = await providerService.createDispute(data);
      if (!response.success) throw new Error(response.message);
      return response.data as Dispute;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.disputes() });
      handleSuccess('Dispute filed successfully');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useAddDisputeEvidence(options?: UseMutationOptions<Dispute, Error, { id: string; evidence: string[] }>) {
  const queryClient = useQueryClient();

  return useMutation<Dispute, Error, { id: string; evidence: string[] }>({
    mutationFn: async ({ id, evidence }) => {
      const response = await providerService.addDisputeEvidence(id, evidence);
      if (!response.success) throw new Error(response.message);
      return response.data as Dispute;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.dispute(variables.id) });
      handleSuccess('Evidence added successfully');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

// ==================== Services Management Hooks ====================

export function useProviderServices(options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery<any[], Error>({
    queryKey: providerKeys.services(),
    queryFn: async () => {
      const response = await providerService.getMyServices();
      if (!response.success) throw new Error(response.message);
      return response.data as any[];
    },
    ...options,
  });
}

export function useAddService(options?: UseMutationOptions<any, Error, any>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: async (data: any) => {
      const response = await providerService.addService(data);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.services() });
      handleSuccess('Service added successfully');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useUpdateService(options?: UseMutationOptions<any, Error, { id: string; data: any }>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: async ({ id, data }) => {
      const response = await providerService.updateService(id, data);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.services() });
      handleSuccess('Service updated successfully');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useToggleServiceStatus(options?: UseMutationOptions<any, Error, { id: string; isActive: boolean }>) {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; isActive: boolean }>({
    mutationFn: async ({ id, isActive }) => {
      const response = await providerService.toggleServiceStatus(id, isActive);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.services() });
      handleSuccess(variables.isActive ? 'Service activated' : 'Service deactivated');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

export function useDeleteService(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const response = await providerService.deleteService(id);
      if (!response.success) throw new Error(response.message);
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.services() });
      handleSuccess('Service deleted successfully');
    },
    onError: (error, variables, context) => {
      handleError(error);
    },
  });
}

// ==================== Combined Query Hook ====================

export function useProviderQueries() {
  const profileQuery = useProviderProfile();
  const statsQuery = useDashboardStats();
  const todayScheduleQuery = useTodaySchedule();
  const pendingRequestsQuery = usePendingRequests();
  const reviewsQuery = useProviderReviews();
  const earningsSummaryQuery = useEarningsSummary();

  // Create earnings object from summary data
  const earnings = earningsSummaryQuery.data ? {
  // If you have a 'today' property, add it to the type
  // Otherwise, use what's available
  today: 0, // Or calculate from transactions
  week: earningsSummaryQuery.data.thisWeek || 0,
  month: earningsSummaryQuery.data.thisMonth || 0,
  available: earningsSummaryQuery.data.availableForWithdrawal || 0,
} : {
  today: 0,
  week: 0,
  month: 0,
  available: 0,
};
  const isLoading = 
    profileQuery.isLoading || 
    statsQuery.isLoading || 
    todayScheduleQuery.isLoading || 
    pendingRequestsQuery.isLoading ||
    earningsSummaryQuery.isLoading;

  const refetch = async () => {
    await Promise.all([
      profileQuery.refetch(),
      statsQuery.refetch(),
      todayScheduleQuery.refetch(),
      pendingRequestsQuery.refetch(),
      reviewsQuery.refetch(),
      earningsSummaryQuery.refetch(),
    ]);
  };

  return {
    // Data
    profile: profileQuery.data,
    stats: statsQuery.data,
    todaySchedule: todayScheduleQuery.data || [],
    pendingRequests: pendingRequestsQuery.data || [],
    reviews: reviewsQuery.data,
    earnings, // ← Now properly defined

    // Loading states
    isLoading,
    isProfileLoading: profileQuery.isLoading,
    isStatsLoading: statsQuery.isLoading,
    isTodayLoading: todayScheduleQuery.isLoading,
    isPendingLoading: pendingRequestsQuery.isLoading,
    isEarningsLoading: earningsSummaryQuery.isLoading,

    // Error states
    error: profileQuery.error || statsQuery.error || earningsSummaryQuery.error,
    profileError: profileQuery.error,
    statsError: statsQuery.error,
    todayError: todayScheduleQuery.error,
    pendingError: pendingRequestsQuery.error,
    earningsError: earningsSummaryQuery.error,

    // Refetch
    refetch,

    // Mutations
    acceptRequest: useAcceptRequest(),
    rejectRequest: useRejectRequest(),
    rescheduleRequest: useRescheduleRequest(),
    startService: useStartService(),
    completeService: useCompleteService(),
    updateAvailability: useUpdateAvailability(),
    respondToReview: useRespondToReview(),
    createDispute: useCreateDispute(),
  };
}