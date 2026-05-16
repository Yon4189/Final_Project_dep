import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export const useAdminData = () => {
  const statsQuery = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats');
      return response.data.success ? response.data.data : null;
    },
    refetchInterval: 30000,
  });

  const queueQuery = useQuery({
    queryKey: ['pendingProviders'],
    queryFn: async () => {
      const response = await api.get('/admin/providers/pending');
      return response.data.success ? (response.data.data || []) : [];
    },
    refetchInterval: 10000,
  });

  const isLoading = statsQuery.isLoading || queueQuery.isLoading;
  const isError = statsQuery.isError || queueQuery.isError;

  const refresh = () => {
    statsQuery.refetch();
    queueQuery.refetch();
  };

  return {
    stats: statsQuery.data || { providers: 0, customers: 0, pending: 0, categories: 0, services: 0, revenue: 0 },
    pendingQueue: queueQuery.data || [],
    isLoading,
    isError,
    refresh,
  };
};