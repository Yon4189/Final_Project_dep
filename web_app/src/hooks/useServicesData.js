import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const extractData = (response, expectedKey = null) => {
  if (!response || !response.data) return [];
  if (Array.isArray(response.data)) return response.data;
  const obj = response.data.data ? response.data.data : response.data;
  if (Array.isArray(obj)) return obj;
  if (expectedKey && Array.isArray(obj[expectedKey])) return obj[expectedKey];
  for (let key in obj) {
    if (Array.isArray(obj[key])) return obj[key];
  }
  return [];
};

export const useServicesData = () => {
  const query = useQuery({
    queryKey: ['servicesSystem'],
    queryFn: async () => {
      const [catRes, svcRes, provRes] = await Promise.allSettled([
        api.get('/admin/categories'),
        api.get('/admin/services'),
        api.get('/admin/providers')
      ]);

      const categories = catRes.status === 'fulfilled' ? extractData(catRes.value, 'categories') : [];
      const services = svcRes.status === 'fulfilled' ? extractData(svcRes.value, 'services') : [];
      const providers = provRes.status === 'fulfilled' ? extractData(provRes.value, 'providers') : [];

      return { categories, services, providers };
    },
    staleTime: 60000,
    refetchInterval: 30000,
  });

  return {
    categories: query.data?.categories || [],
    services: query.data?.services || [],
    providers: query.data?.providers || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};