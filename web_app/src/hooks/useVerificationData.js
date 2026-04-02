import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export const useVerificationData = (filter) => {
  const query = useQuery({
    queryKey: ['providers', filter],
    queryFn: async () => {
      let endpoint = '/admin/providers/pending';
      if (filter === 'Approved') endpoint = '/admin/providers/approved';
      if (filter === 'Rejected') endpoint = '/admin/providers/rejected';
      if (filter === 'Suspended') endpoint = '/admin/providers/suspended';
      if (filter === 'All') endpoint = '/admin/providers';

      const response = await api.get(endpoint);
      if (!response.data.success) throw new Error(response.data.message);
      return response.data.data || [];
    },
    staleTime: 30000,
    refetchInterval: 10000,
  });

  return {
    providers: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};