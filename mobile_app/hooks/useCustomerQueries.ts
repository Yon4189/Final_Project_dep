// hooks/useCustomerQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '@/app/services/customer.service';
import type { ServiceProvider, Review, ServiceRequest, User } from '@/app/types/customer.types';

// Query Keys
export const customerKeys = {
  all: ['customer'] as const,
  profile: () => [...customerKeys.all, 'profile'] as const,
  notifications: () => [...customerKeys.all, 'notifications'] as const,
  notificationsSettings: () => [...customerKeys.all, 'notifications', 'settings'] as const,
  locations: () => [...customerKeys.all, 'locations'] as const,
  serviceCity: () => [...customerKeys.all, 'serviceCity'] as const,
  favorites: () => [...customerKeys.all, 'favorites'] as const,
  requests: (status?: string) => [...customerKeys.all, 'requests', status] as const,
  request: (id: string) => [...customerKeys.all, 'requests', id] as const,
  reviews: () => [...customerKeys.all, 'reviews'] as const,
  review: (id: string) => [...customerKeys.all, 'reviews', id] as const,
  complaints: () => [...customerKeys.all, 'complaints'] as const,
  complaint: (id: string) => [...customerKeys.all, 'complaints', id] as const,
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

export const useMyRequests = (status?: string) => {
  return useQuery({
    queryKey: customerKeys.requests(status),
    queryFn: async () => {
      const response = await customerService.getMyRequests(status);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch requests');
      }
      return response.data as ServiceRequest[];
    },
  });
};

export const useRequestDetails = (id: string) => {
  return useQuery({
    queryKey: customerKeys.request(id),
    queryFn: async () => {
      const response = await customerService.getRequestDetails(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch request details');
      }
      return response.data as ServiceRequest;
    },
    enabled: !!id,
  });
};

export const useCancelRequest = () => {
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
      queryClient.invalidateQueries({ queryKey: customerKeys.request(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.requests() });
    },
  });
};

export const useRescheduleRequest = () => {
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
      queryClient.invalidateQueries({ queryKey: customerKeys.request(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.requests() });
    },
  });
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      provider_id: string;
      service_id: string;
      scheduled_date: string;
      scheduled_time: string;
      address: string;
      description?: string;
      estimated_price?: number;
    }) => {
      const response = await customerService.createBooking(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create booking');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.requests() });
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
      queryClient.invalidateQueries({ queryKey: customerKeys.request(variables.bookingId) });
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

// ==================== Complaint Hooks ====================

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
    queryKey: ['serviceCategories'],
    queryFn: async () => {
      const response = await customerService.getServiceCategories();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch categories');
      }
      return response.data;
    },
  });
};