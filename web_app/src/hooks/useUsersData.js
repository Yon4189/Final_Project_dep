import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export const useUsersData = (userType) => {
  const query = useQuery({
    queryKey: ['users', userType],
    queryFn: async () => {
      const url = userType === 'Provider' ? '/admin/providers' : '/admin/customers';
      const response = await api.get(url);
      const users = response.data.data || [];

      return users.map(u => ({
        id: u.customerID || u.providerID,
        name: u.fullname,
        email: u.email,
        phone: u.phone,
        type: userType,
        status: (u.status || 'Active').charAt(0).toUpperCase() + (u.status || 'Active').slice(1).toLowerCase(),
        location: u.location || u.service_city || 'Not Provided',
        profilePicture: u.profilePicture || null,
        walletBalance: u.walletBalance || 0,
        joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
      }));
    },
    staleTime: 60000,
    refetchInterval: 10000,
  });

  return {
    users: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};