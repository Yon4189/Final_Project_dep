// hooks/useCustomerQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '@/app/services/customer.service';
import type { ServiceProvider, Review, User } from '@/app/types/customer.types';

// Query Keys
export const customerKeys = {
  all: ['customer'] as const,
  profile: () => [...customerKeys.all, 'profile'] as const,
  notifications: () => [...customerKeys.all, 'notifications'] as const,
  notificationsSettings: () => [...customerKeys.all, 'notifications', 'settings'] as const,
  locations: () => [...customerKeys.all, 'locations'] as const,
  serviceCity: () => [...customerKeys.all, 'serviceCity'] as const,
  favorites: () => [...customerKeys.all, 'favorites'] as const,
  reviews: () => [...customerKeys.all, 'reviews'] as const,
  review: (id: string) => [...customerKeys.all, 'reviews', id] as const,
  complaints: () => [...customerKeys.all, 'complaints'] as const,
  complaint: (id: string) => [...customerKeys.all, 'complaints', id] as const,
  serviceRequests: () => [...customerKeys.all, 'serviceRequests'] as const,
  serviceRequest: (id: string) => [...customerKeys.all, 'serviceRequests', id] as const,
  providers: {
    all: ['providers'] as const,
    search: (params: any) => ['providers', 'search', params] as const,
    details: (id: string) => ['providers', id] as const,
    topRated: (limit: number) => ['providers', 'top-rated', limit] as const,
    nearby: (params: any) => ['providers', 'nearby', params] as const,
    reviews: (providerId: string, page: number) => ['providers', providerId, 'reviews', page] as const,
    availability: (providerId: string, date: string) => ['providers', providerId, 'availability', date] as const,
  },
  wallet: {
    balance: () => [...customerKeys.all, 'wallet', 'balance'] as const,
  },
  dashboard: {
    stats: () => [...customerKeys.all, 'dashboard', 'stats'] as const,
    activity: (limit: number) => [...customerKeys.all, 'dashboard', 'activity', limit] as const,
  },
  categories: {
    all: ['serviceCategories'] as const,
  },
};

// ==================== Profile Hooks ====================

export const useProfile = () => {
  return useQuery({
    queryKey: customerKeys.profile(),
    queryFn: async () => {
      const response = await customerService.getProfile();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch profile');
      }
      return response.data as User;
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await customerService.updateProfile(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update profile');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data: {
      current_password: string;
      new_password: string;
      new_password_confirmation: string;
    }) => {
      const response = await customerService.changePassword(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to change password');
      }
      return response.data;
    },
  });
};

// ==================== Notification Hooks ====================

export const useNotifications = () => {
  return useQuery({
    queryKey: customerKeys.notifications(),
    queryFn: async () => {
      const response = await customerService.getNotifications();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch notifications');
      }
      return response.data;
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await customerService.markNotificationRead(notificationId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to mark notification as read');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.notifications() });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await customerService.markAllNotificationsRead();
      if (!response.success) {
        throw new Error(response.message || 'Failed to mark all notifications as read');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.notifications() });
    },
  });
};

export const useSubmitReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingID, rating, comment, is_anonymous }: { 
      bookingID: string, 
      rating: number, 
      comment?: string, 
      is_anonymous?: boolean 
    }) => {
      const response = await api.post<any>(`/customer/bookings/${bookingID}/review`, {
        rating,
        comment,
        is_anonymous
      });
      if (!response.success) {
        throw new Error(response.message || 'Failed to submit review');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [customerKeys.all, 'serviceRequests'] });
      queryClient.invalidateQueries({ queryKey: [customerKeys.all, 'serviceRequests', variables.bookingID] });
    },
  });
};

export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: [...customerKeys.notifications(), 'unread-count'],
    queryFn: async () => {
      const response = await customerService.getUnreadCount();
      if (!response.success) {
        return 0;
      }
      return response.data?.unread_count ?? 0;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
};

export const useNotificationSettings = () => {
  return useQuery({
    queryKey: customerKeys.notificationsSettings(),
    queryFn: async () => {
      const response = await customerService.getNotificationSettings();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch notification settings');
      }
      return response.data;
    },
  });
};

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await customerService.updateNotificationSettings(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update notification settings');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.notificationsSettings() });
    },
  });
};

// ==================== Location Hooks ====================

export const useLocations = () => {
  return useQuery({
    queryKey: customerKeys.locations(),
    queryFn: async () => {
      const response = await customerService.getLocations();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch locations');
      }
      return response.data;
    },
  });
};

export const useAddLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await customerService.addLocation(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to add location');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.locations() });
    },
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await customerService.updateLocation(id, data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update location');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.locations() });
    },
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await customerService.deleteLocation(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete location');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.locations() });
    },
  });
};

export const useSetPrimaryLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await customerService.setPrimaryLocation(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to set primary location');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.locations() });
    },
  });
};

export const useServiceCity = () => {
  return useQuery({
    queryKey: customerKeys.serviceCity(),
    queryFn: async () => {
      const response = await customerService.getServiceCity();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch service city');
      }
      return response.data;
    },
  });
};

export const useUpdateServiceCity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { service_city: string }) => {
      const response = await customerService.updateServiceCity(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update service city');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.serviceCity() });
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
    },
  });
};

// ==================== Provider Search Hooks ====================

export const useProviderSearch = (params: any) => {
  return useQuery({
    queryKey: customerKeys.providers.search(params),
    queryFn: async () => {
      const response = await customerService.searchProviders(params);
      if (!response.success) {
        throw new Error(response.message || 'Failed to search providers');
      }
      return response.data as ServiceProvider[];
    },
    enabled: !!params, // Only run if params exist
  });
};

export const useProviderDetails = (id: string) => {
  return useQuery({
    queryKey: customerKeys.providers.details(id),
    queryFn: async () => {
      const response = await customerService.getProviderDetails(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch provider details');
      }
      return response.data as ServiceProvider;
    },
    enabled: !!id, // Only run if id exists
  });
};

export const useTopRatedProviders = (limit: number = 10) => {
  return useQuery({
    queryKey: customerKeys.providers.topRated(limit),
    queryFn: async () => {
      const response = await customerService.getTopRatedProviders(limit);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch top rated providers');
      }
      return response.data as ServiceProvider[];
    },
  });
};

export const useNearbyProviders = (latitude: number, longitude: number, radius: number = 10) => {
  return useQuery({
    queryKey: customerKeys.providers.nearby({ latitude, longitude, radius }),
    queryFn: async () => {
      const response = await customerService.getNearbyProviders(latitude, longitude, radius);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch nearby providers');
      }
      return response.data as ServiceProvider[];
    },
    enabled: !!latitude && !!longitude, // Only run if coordinates exist
  });
};

export const useProviderReviews = (providerId: string, page: number = 1) => {
  return useQuery({
    queryKey: customerKeys.providers.reviews(providerId, page),
    queryFn: async () => {
      const response = await customerService.getProviderReviews(providerId, page);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch provider reviews');
      }
      return response.data as Review[];
    },
    enabled: !!providerId,
  });
};

export const useProviderAvailability = (providerId: string, date: string) => {
  return useQuery({
    queryKey: customerKeys.providers.availability(providerId, date),
    queryFn: async () => {
      const response = await customerService.getProviderAvailability(providerId, date);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch provider availability');
      }
      return response.data;
    },
    enabled: !!providerId && !!date,
  });
};

// ==================== Service Request Hooks ====================

export const useServiceRequests = (status?: string) => {
  return useQuery({
    queryKey: status ? [...customerKeys.serviceRequests(), status] : customerKeys.serviceRequests(),
    queryFn: async () => {
      const response = await customerService.getMyRequests(status);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch service requests');
      }
      return response.data;
    },
  });
};

export const useServiceRequestDetails = (id: string) => {
  return useQuery({
    queryKey: customerKeys.serviceRequest(id),
    queryFn: async () => {
      const response = await customerService.getRequestDetails(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch request details');
      }
      return response.data;
    },
    enabled: !!id,
  });
};

// Alias for backward compatibility and consistency with components
export const useServiceRequest = useServiceRequestDetails;
export const useMyRequests = useServiceRequests;

export const useCreateServiceRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await customerService.createBooking(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create service request');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.serviceRequests() });
    },
  });
};

export const useCancelServiceRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await customerService.cancelRequest(id, reason);
      if (!response.success) {
        throw new Error(response.message || 'Failed to cancel request');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.serviceRequest(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.serviceRequests() });
    },
  });
};

// Alias for backward compatibility and consistency with components
export const useCancelRequest = useCancelServiceRequest;

export const useConfirmCompletion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await customerService.confirmBookingCompletion(bookingId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to confirm service completion');
      }
      return response.data;
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.serviceRequest(bookingId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.serviceRequests() });
    },
  });
};

export const useRescheduleServiceRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { date: string; time: string } }) => {
      const response = await customerService.rescheduleRequest(id, data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to reschedule request');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.serviceRequest(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.serviceRequests() });
    },
  });
};

// ==================== Review Hooks ====================

export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await customerService.createReview(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create review');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.reviews() });
      if (variables.providerId) {
        queryClient.invalidateQueries({
          queryKey: customerKeys.providers.reviews(variables.providerId, 1)
        });
      }
    },
  });
};

export const useMyReviews = () => {
  return useQuery({
    queryKey: customerKeys.reviews(),
    queryFn: async () => {
      const response = await customerService.getMyReviews();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch reviews');
      }
      return response.data;
    },
  });
};

export const useUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await customerService.updateReview(id, data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update review');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.review(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.reviews() });
    },
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await customerService.deleteReview(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete review');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.reviews() });
    },
  });
};

// ==================== Complaint Hooks ====================

export const useMyComplaints = () => {
  return useQuery({
    queryKey: customerKeys.complaints(),
    queryFn: async () => {
      const response = await customerService.getMyComplaints();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch complaints');
      }
      return response.data;
    },
  });
};

// Alias for backward compatibility - must come AFTER useMyComplaints is defined
export const useComplaints = useMyComplaints;

export const useComplaintDetails = (id: string) => {
  return useQuery({
    queryKey: customerKeys.complaint(id),
    queryFn: async () => {
      const response = await customerService.getComplaintDetails(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch complaint details');
      }
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await customerService.createComplaint(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create complaint');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.complaints() });
    },
  });
};

export const useAddComplaintResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const response = await customerService.addComplaintResponse(id, message);
      if (!response.success) {
        throw new Error(response.message || 'Failed to add response');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.complaint(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.complaints() });
    },
  });
};

// ==================== Favorite Hooks ====================

export const useFavorites = () => {
  return useQuery({
    queryKey: customerKeys.favorites(),
    queryFn: async () => {
      const response = await customerService.getFavorites();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch favorites');
      }
      return response.data as ServiceProvider[];
    },
  });
};

export const useAddFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (providerId: string) => {
      const response = await customerService.addFavorite(providerId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to add favorite');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.favorites() });
    },
  });
};

export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (providerId: string) => {
      const response = await customerService.removeFavorite(providerId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to remove favorite');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.favorites() });
    },
  });
};

export const useCheckFavorite = (providerId: string) => {
  return useQuery({
    queryKey: [...customerKeys.favorites(), providerId, 'check'],
    queryFn: async () => {
      const response = await customerService.checkFavorite(providerId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to check favorite');
      }
      return response.data;
    },
    enabled: !!providerId,
  });
};

// ==================== Wallet Hooks ====================

export const useWalletBalance = () => {
  return useQuery({
    queryKey: customerKeys.wallet.balance(),
    queryFn: async () => {
      const response = await customerService.getWalletBalance();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch wallet balance');
      }
      return response.data;
    },
  });
};

// Note: useAddFunds and useTransactionHistory are not available yet
// They will be added when the backend endpoints are ready

// ==================== Dashboard Hooks ====================

export const useDashboardStats = () => {
  return useQuery({
    queryKey: customerKeys.dashboard.stats(),
    queryFn: async () => {
      const response = await customerService.getDashboardStats();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch dashboard stats');
      }
      return response.data;
    },
  });
};

export const useRecentActivity = (limit: number = 10) => {
  return useQuery({
    queryKey: customerKeys.dashboard.activity(limit),
    queryFn: async () => {
      const response = await customerService.getRecentActivity(limit);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch recent activity');
      }
      return response.data;
    },
  });
};

// ==================== Category Hooks ====================

export const useServiceCategories = () => {
  return useQuery({
    queryKey: customerKeys.categories.all,
    queryFn: async () => {
      const response = await customerService.getServiceCategories();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch categories');
      }
      return response.data;
    },
  });
};

export const useCategoryServices = (categoryId: string) => {
  return useQuery({
    queryKey: [...customerKeys.categories.all, categoryId, 'services'],
    queryFn: async () => {
      const response = await customerService.getServicesByCategory(categoryId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch category services');
      }
      return response.data;
    },
    enabled: !!categoryId,
  });
};