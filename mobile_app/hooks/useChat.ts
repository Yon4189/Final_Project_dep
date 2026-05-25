import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/services/api';

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversation: (id: string | number) => [...chatKeys.all, 'conversations', id] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: async () => {
      const response = await api.get<any>('/chat/conversations');
      if (!response.success) throw new Error(response.message || 'Failed to fetch conversations');
      return response.data.data || [];
    },
  });
}
