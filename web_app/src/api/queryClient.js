import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes (renamed from cacheTime in TanStack Query v5)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default queryClient;
