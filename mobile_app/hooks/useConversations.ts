// hooks/useConversations.ts
import { useQuery } from '@tanstack/react-query';
import { customerService } from '@/app/services/customer.service';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await customerService.getConversations();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch conversations');
      }
      return response.data;
    },
  });
}
