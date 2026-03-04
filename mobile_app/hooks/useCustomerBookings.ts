// hooks/useCustomerBookings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/services/api';
import type { Booking, CreateBookingDTO } from '@/app/types/booking.types';

// Booking Query Keys
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters: any) => [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
  status: (id: string) => [...bookingKeys.all, 'status', id] as const,
  track: (id: string) => [...bookingKeys.all, 'track', id] as const,
};

// ==================== Booking List Hooks ====================

export const useBookings = (status?: string) => {
  return useQuery({
    queryKey: bookingKeys.list({ status }),
    queryFn: async () => {
      const url = status ? `/customer/bookings?status=${status}` : '/customer/bookings';
      const response = await api.get<any>(url);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch bookings');
      }
      
      return response.data;
    },
  });
};

// ==================== Booking Details Hooks ====================

export const useBookingDetails = (id: string) => {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<any>(`/customer/bookings/${id}`);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch booking details');
      }
      
      return response.data;
    },
    enabled: !!id,
  });
};

// ==================== Create Booking Hook ====================

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateBookingDTO) => {
      const response = await api.post<any>('/customer/bookings', data);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to create booking');
      }
      
      return response.data;
    },
    onSuccess: () => {
      // Invalidate bookings list
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
};

// ==================== Cancel Booking Hook ====================

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post<any>(`/customer/bookings/${id}/cancel`, { reason });
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to cancel booking');
      }
      
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific booking and list
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
};

// ==================== Booking Status Hook ====================

export const useBookingStatus = (id: string) => {
  return useQuery({
    queryKey: bookingKeys.status(id),
    queryFn: async () => {
      const response = await api.get<any>(`/customer/bookings/${id}/status`);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch booking status');
      }
      
      return response.data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Refetch every 30 seconds for pending/accepted bookings
      const data = query.state.data?.data;
      if (data && ['pending', 'accepted'].includes(data.status)) {
        return 30000; // 30 seconds
      }
      return false; // Stop refetching for completed/cancelled bookings
    },
  });
};

// ==================== Track Provider Hook ====================

export const useTrackProvider = (id: string) => {
  return useQuery({
    queryKey: bookingKeys.track(id),
    queryFn: async () => {
      const response = await api.get<any>(`/customer/bookings/${id}/track`);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to track provider');
      }
      
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 10000, // Refetch every 10 seconds for live tracking
  });
};

// ==================== Reschedule Booking Hook ====================

export const useRescheduleBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, scheduledDate }: { id: string; scheduledDate: string }) => {
      const response = await api.post<any>(`/customer/bookings/${id}/reschedule`, {
        scheduledDate,
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to reschedule booking');
      }
      
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
};

// ==================== Booking Stats Hook ====================

export const useBookingStats = () => {
  return useQuery({
    queryKey: [...bookingKeys.all, 'stats'],
    queryFn: async () => {
      const response = await api.get<any>('/customer/bookings/stats');
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch booking stats');
      }
      
      return response.data;
    },
  });
};