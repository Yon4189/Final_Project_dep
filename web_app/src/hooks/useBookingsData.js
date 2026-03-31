import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export const useBookingsData = () => {
  const query = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await api.get('/admin/bookings');
      if (!response.data.success) throw new Error(response.data.message);
      return response.data.data || [];
    },
    staleTime: 60000,
    refetchInterval: 30000,
  });

  return {
    bookings: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};