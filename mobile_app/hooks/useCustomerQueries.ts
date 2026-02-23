// hooks/useCustomerQueries.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { customerService } from '@/app/services/customer.service';
import type { 
  ServiceProvider, 
  ServiceRequest, 
  Review, 
  Complaint,
  Location,
  User,
  AvailabilitySlot,
  ApiResponse 
} from '@/app/types/customer.types';

// Query Keys
export const customerKeys = {
  all: ['customer'] as const,
  profile: () => [...customerKeys.all, 'profile'] as const,
  locations: () => [...customerKeys.all, 'locations'] as const,
  location: (id: string) => [...customerKeys.locations(), id] as const,
  requests: () => [...customerKeys.all, 'requests'] as const,
  request: (id: string) => [...customerKeys.requests(), id] as const,
  providers: () => [...customerKeys.all, 'providers'] as const,
  provider: (id: string) => [...customerKeys.providers(), id] as const,
  reviews: () => [...customerKeys.all, 'reviews'] as const,
  review: (id: string) => [...customerKeys.reviews(), id] as const,
  complaints: () => [...customerKeys.all, 'complaints'] as const,
  complaint: (id: string) => [...customerKeys.complaints(), id] as const,
  wallet: () => [...customerKeys.all, 'wallet'] as const,
  transactions: () => [...customerKeys.all, 'transactions'] as const,
  transaction: (id: string) => [...customerKeys.transactions(), id] as const,
  favorites: () => [...customerKeys.all, 'favorites'] as const,
  notifications: () => [...customerKeys.all, 'notifications'] as const,
};

// Utility function to handle query errors
const handleQueryError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'An error occurred';
  Alert.alert('Error', message);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

// Utility function to handle mutation success
const handleMutationSuccess = (message?: string) => {
  if (message) {
    Alert.alert('Success', message);
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// ==================== Profile Hooks ====================

export function useProfile(options?: UseQueryOptions<User>) {
  return useQuery<User, Error>({
    queryKey: customerKeys.profile(),
    queryFn: async () => {
      const response = await customerService.getProfile();
      if (!response.success) throw new Error(response.message);
      return response.data as User;
    },
    ...options,
  });
}

export function useUpdateProfile(options?: UseMutationOptions<User, Error, Partial<User>>) {
  const queryClient = useQueryClient();

  return useMutation<User, Error, Partial<User>>({
    mutationFn: async (data: Partial<User>) => {
      const response = await customerService.updateProfile(data);
      if (!response.success) throw new Error(response.message);
      return response.data as User;
    },
  onSuccess: (data, variables, context, meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
      handleMutationSuccess('Profile updated successfully');
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context, meta);
    },
  });
}

export function useUploadProfileImage(options?: UseMutationOptions<{ url: string }, Error, FormData>) {
  return useMutation<{ url: string }, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const response = await customerService.uploadProfileImage(formData);
      if (!response.success) throw new Error(response.message);
      return response.data as { url: string };
    },
    onSuccess: (data, variables, context, meta) => {
      handleMutationSuccess('Profile image updated');
      options?.onSuccess?.(data, variables, context, meta);
    },
    onError: (error, variables, context, meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context, meta);
    },
  });
}

// ==================== Location Hooks ====================

export function useLocations(options?: UseQueryOptions<Location[]>) {
  return useQuery<Location[], Error>({
    queryKey: customerKeys.locations(),
    queryFn: async () => {
      const response = await customerService.getLocations();
      if (!response.success) throw new Error(response.message);
      return response.data as Location[];
    },
    ...options,
  });
}

export function useAddLocation(options?: UseMutationOptions<Location, Error, Omit<Location, 'id'>>) {
  const queryClient = useQueryClient();

  return useMutation<Location, Error, Omit<Location, 'id'>>({
    mutationFn: async (data: Omit<Location, 'id'>) => {
      const response = await customerService.addLocation(data);
      if (!response.success) throw new Error(response.message);
      return response.data as Location;
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.locations() });
      handleMutationSuccess('Location added successfully');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

export function useUpdateLocation(id: string, options?: UseMutationOptions<Location, Error, Partial<Location>>) {
  const queryClient = useQueryClient();

  return useMutation<Location, Error, Partial<Location>>({
    mutationFn: async (data: Partial<Location>) => {
      const response = await customerService.updateLocation(id, data);
      if (!response.success) throw new Error(response.message);
      return response.data as Location;
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.locations() });
      queryClient.invalidateQueries({ queryKey: customerKeys.location(id) });
      handleMutationSuccess('Location updated successfully');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

export function useDeleteLocation(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const response = await customerService.deleteLocation(id);
      if (!response.success) throw new Error(response.message);
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.locations() });
      handleMutationSuccess('Location deleted successfully');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

export function useSetPrimaryLocation(options?: UseMutationOptions<Location, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<Location, Error, string>({
    mutationFn: async (id: string) => {
      const response = await customerService.setPrimaryLocation(id);
      if (!response.success) throw new Error(response.message);
      return response.data as Location;
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.locations() });
      handleMutationSuccess('Primary location updated');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

// ==================== Service Request Hooks ====================

export function useServiceRequests(status?: string, options?: UseQueryOptions<ServiceRequest[]>) {
  return useQuery<ServiceRequest[], Error>({
    queryKey: [...customerKeys.requests(), status],
    queryFn: async () => {
      const response = await customerService.getMyRequests(status);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest[];
    },
    ...options,
  });
}

export function useServiceRequest(id: string, options?: UseQueryOptions<ServiceRequest>) {
  return useQuery<ServiceRequest, Error>({
    queryKey: customerKeys.request(id),
    queryFn: async () => {
      const response = await customerService.getRequestDetails(id);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest;
    },
    enabled: !!id,
    ...options,
  });
}

export function useCreateServiceRequest(options?: UseMutationOptions<ServiceRequest, Error, any>) {
  const queryClient = useQueryClient();

  return useMutation<ServiceRequest, Error, any>({
    mutationFn: async (data: any) => {
      const response = await customerService.createServiceRequest(data);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest;
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.requests() });
      handleMutationSuccess('Service request created successfully');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

export function useCancelRequest(options?: UseMutationOptions<ServiceRequest, Error, { id: string; reason: string }>) {
  const queryClient = useQueryClient();

  return useMutation<ServiceRequest, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await customerService.cancelRequest(id, reason);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceRequest;
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.requests() });
      queryClient.invalidateQueries({ queryKey: customerKeys.request(variables.id) });
      handleMutationSuccess('Request cancelled successfully');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

// ==================== Provider Hooks ====================

export function useProviderDetails(id: string, options?: UseQueryOptions<ServiceProvider>) {
  return useQuery<ServiceProvider, Error>({
    queryKey: customerKeys.provider(id),
    queryFn: async () => {
      const response = await customerService.getProviderDetails(id);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceProvider;
    },
    enabled: !!id,
    ...options,
  });
}

export function useProviderAvailability(providerId: string, date: string, options?: UseQueryOptions<AvailabilitySlot[]>) {
  return useQuery<AvailabilitySlot[], Error>({
    queryKey: [...customerKeys.provider(providerId), 'availability', date],
    queryFn: async () => {
      const response = await customerService.getProviderAvailability(providerId, date);
      if (!response.success) throw new Error(response.message);
      return response.data as AvailabilitySlot[];
    },
    enabled: !!providerId && !!date,
    ...options,
  });
}

export function useTopRatedProviders(limit: number = 10, options?: UseQueryOptions<ServiceProvider[]>) {
  return useQuery<ServiceProvider[], Error>({
    queryKey: [...customerKeys.providers(), 'top-rated', limit],
    queryFn: async () => {
      const response = await customerService.getTopRatedProviders(limit);
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceProvider[];
    },
    ...options,
  });
}

// ==================== Review Hooks ====================

export function useReviews(options?: UseQueryOptions<Review[]>) {
  return useQuery<Review[], Error>({
    queryKey: customerKeys.reviews(),
    queryFn: async () => {
      // This would be implemented in the service
      throw new Error('Not implemented');
    },
    ...options,
  });
}

export function useReviewForBooking(bookingId: string, options?: UseQueryOptions<Review>) {
  return useQuery<Review, Error>({
    queryKey: [...customerKeys.reviews(), 'booking', bookingId],
    queryFn: async () => {
      const response = await customerService.getReviewForBooking(bookingId);
      if (!response.success) throw new Error(response.message);
      return response.data as Review;
    },
    enabled: !!bookingId,
    ...options,
  });
}

export function useCreateReview(options?: UseMutationOptions<Review, Error, any>) {
  const queryClient = useQueryClient();

  return useMutation<Review, Error, any>({
    mutationFn: async (data: any) => {
      const response = await customerService.createReview(data);
      if (!response.success) throw new Error(response.message);
      return response.data as Review;
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.requests() });
      queryClient.invalidateQueries({ queryKey: customerKeys.request(variables.bookingId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.reviews() });
      queryClient.invalidateQueries({ queryKey: customerKeys.providers() });
      handleMutationSuccess('Thank you for your review!');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

export function useUpdateReview(options?: UseMutationOptions<Review, Error, { id: string; data: Partial<Review> }>) {
  const queryClient = useQueryClient();

  return useMutation<Review, Error, { id: string; data: Partial<Review> }>({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Review> }) => {
      const response = await customerService.updateReview(id, data);
      if (!response.success) throw new Error(response.message);
      return response.data as Review;
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.reviews() });
      queryClient.invalidateQueries({ queryKey: customerKeys.review(variables.id) });
      handleMutationSuccess('Review updated successfully');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

export function useDeleteReview(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const response = await customerService.deleteReview(id);
      if (!response.success) throw new Error(response.message);
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.reviews() });
      handleMutationSuccess('Review deleted successfully');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

// ==================== Complaint Hooks ====================

export function useComplaints(options?: UseQueryOptions<Complaint[]>) {
  return useQuery<Complaint[], Error>({
    queryKey: customerKeys.complaints(),
    queryFn: async () => {
      const response = await customerService.getMyComplaints();
      if (!response.success) throw new Error(response.message);
      return response.data as Complaint[];
    },
    ...options,
  });
}

export function useComplaintDetails(id: string, options?: UseQueryOptions<Complaint>) {
  return useQuery<Complaint, Error>({
    queryKey: customerKeys.complaint(id),
    queryFn: async () => {
      const response = await customerService.getComplaintDetails(id);
      if (!response.success) throw new Error(response.message);
      return response.data as Complaint;
    },
    enabled: !!id,
    ...options,
  });
}

export function useCreateComplaint(options?: UseMutationOptions<Complaint, Error, any>) {
  const queryClient = useQueryClient();

  return useMutation<Complaint, Error, any>({
    mutationFn: async (data: any) => {
      const response = await customerService.createComplaint(data);
      if (!response.success) throw new Error(response.message);
      return response.data as Complaint;
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.complaints() });
      handleMutationSuccess('Complaint submitted successfully');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

export function useAddComplaintResponse(complaintId: string, options?: UseMutationOptions<Complaint, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<Complaint, Error, string>({
    mutationFn: async (message: string) => {
      const response = await customerService.addComplaintResponse(complaintId, message);
      if (!response.success) throw new Error(response.message);
      return response.data as Complaint;
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.complaint(complaintId) });
      handleMutationSuccess('Response added successfully');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

// ==================== Payment & Wallet Hooks ====================

export function useInitiatePayment(options?: UseMutationOptions<any, Error, any>) {
  return useMutation<any, Error, any>({
    mutationFn: async (data: any) => {
      const response = await customerService.initiatePayment(data);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context,meta) => {
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
    ...options,
  });
}

export function useVerifyPayment(options?: UseMutationOptions<any, Error, string>) {
  return useMutation<any, Error, string>({
    mutationFn: async (transactionId: string) => {
      const response = await customerService.verifyPayment(transactionId);
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    onSuccess: (data, variables, context,meta) => {
      handleMutationSuccess('Payment verified successfully');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

export function useWalletBalance(options?: Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>) {
  return useQuery<any, Error>({
    queryKey: customerKeys.wallet(),
    queryFn: async () => {
      const response = await customerService.getWalletBalance();
      if (!response.success) throw new Error(response.message);
      return response.data;
    },
    ...options,
  });
}

export function useTransactionHistory(page: number = 1, options?: UseQueryOptions<any[]>) {
  return useQuery<any[], Error>({
    queryKey: [...customerKeys.transactions(), page],
    queryFn: async () => {
      const response = await customerService.getTransactionHistory(page);
      if (!response.success) throw new Error(response.message);
      return response.data as any[]; // Add type assertion
    },
    ...options,
  });
}

// ==================== Favorites Hooks ====================

export function useFavorites(options?: UseQueryOptions<ServiceProvider[]>) {
  return useQuery<ServiceProvider[], Error>({
    queryKey: customerKeys.favorites(),
    queryFn: async () => {
      const response = await customerService.getFavorites();
      if (!response.success) throw new Error(response.message);
      return response.data as ServiceProvider[];
    },
    ...options,
  });
}

export function useAddFavorite(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (providerId: string) => {
      const response = await customerService.addFavorite(providerId);
      if (!response.success) throw new Error(response.message);
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.favorites() });
      handleMutationSuccess('Added to favorites');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

export function useRemoveFavorite(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (providerId: string) => {
      const response = await customerService.removeFavorite(providerId);
      if (!response.success) throw new Error(response.message);
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.favorites() });
      handleMutationSuccess('Removed from favorites');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

// ==================== Notification Hooks ====================

export function useNotifications(
  page: number = 1, 
  options?: UseQueryOptions<any[]>
) {
  return useQuery<any[], Error>({
    queryKey: [...customerKeys.notifications(), page],
    queryFn: async () => {
      // Pass the page parameter to the service
      const response = await customerService.getNotifications(page);
      if (!response.success) throw new Error(response.message);
      
      // Ensure we return an array
      return response.data as any[];
    },
    ...options,
  });
}

export function useMarkNotificationRead(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (notificationId: string) => {
      const response = await customerService.markNotificationRead(notificationId);
      if (!response.success) throw new Error(response.message);
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.notifications() });
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}

export function useMarkAllNotificationsRead(options?: UseMutationOptions<void, Error, void>) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await customerService.markAllNotificationsRead();
      if (!response.success) throw new Error(response.message);
    },
    onSuccess: (data, variables, context,meta) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.notifications() });
      handleMutationSuccess('All notifications marked as read');
      options?.onSuccess?.(data, variables, context,meta);
    },
    onError: (error, variables, context,meta) => {
      handleQueryError(error);
      options?.onError?.(error, variables, context,meta);
    },
  });
}