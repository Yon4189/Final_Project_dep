import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { providerService } from '@/app/services/provider.service';

const NOTIFICATIONS_COUNT_KEY = ['provider', 'notifications', 'count'] as const;

export function useProviderNotificationCount(options?: UseQueryOptions<number, Error>) {
  return useQuery<number, Error>({
    queryKey: NOTIFICATIONS_COUNT_KEY,
    queryFn: async () => {
      const response = await providerService.getNotifications(1);
      if (!response.success) {
        throw new Error(response.message || 'Unable to fetch notifications');
      }
      return response.data?.unread_count ?? 0;
    },
    ...options,
  });
}
