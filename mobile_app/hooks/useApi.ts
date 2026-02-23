// hooks/useApi.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  showSuccessMessage?: boolean;
  showErrorMessage?: boolean;
  successMessage?: string;
  errorMessage?: string;
  hapticFeedback?: boolean;
  retry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
}

export function useApi<T = any, P = any>(
  apiFunction: (params?: P) => Promise<{ data?: T; success: boolean; message?: string }>,
  options: UseApiOptions<T> = {}
) {
  const {
    onSuccess,
    onError,
    onSettled,
    showSuccessMessage = false,
    showErrorMessage = true,
    successMessage,
    errorMessage,
    hapticFeedback = true,
    retry = false,
    retryDelay = 1000,
    maxRetries = 3,
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    status: 'idle',
  });

  const retryCount = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (params?: P): Promise<T | null> => {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      setState(prev => ({ ...prev, loading: true, status: 'loading', error: null }));

      try {
        const response = await apiFunction(params);

        if (response.success && response.data) {
          setState({
            data: response.data,
            loading: false,
            error: null,
            status: 'success',
          });

          if (hapticFeedback) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }

          if (showSuccessMessage) {
            Alert.alert('Success', successMessage || response.message || 'Operation successful');
          }

          onSuccess?.(response.data);
          return response.data;
        } else {
          throw new Error(response.message || 'Operation failed');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('An error occurred');
        
        // Handle retry logic
        if (retry && retryCount.current < maxRetries) {
          retryCount.current += 1;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return execute(params);
        }

        setState({
          data: null,
          loading: false,
          error: err,
          status: 'error',
        });

        if (hapticFeedback) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }

        if (showErrorMessage) {
          Alert.alert('Error', errorMessage || err.message);
        }

        onError?.(err);
        return null;
      } finally {
        setState(prev => ({ ...prev, loading: false }));
        onSettled?.();
        retryCount.current = 0;
        abortControllerRef.current = null;
      }
    },
    [apiFunction, onSuccess, onError, onSettled, showSuccessMessage, showErrorMessage, successMessage, errorMessage, hapticFeedback, retry, retryDelay, maxRetries]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      status: 'idle',
    });
    retryCount.current = 0;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, loading: false }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    cancel,
  };
}

// Paginated API Hook
interface UsePaginatedApiOptions<T> extends UseApiOptions<T[]> {
  itemsPerPage?: number;
  initialPage?: number;
}

export function usePaginatedApi<T, P = any>(
  apiFunction: (params?: P & { page: number; perPage: number }) => Promise<{
    data?: T[];
    success: boolean;
    message?: string;
    meta?: {
      currentPage: number;
      lastPage: number;
      perPage: number;
      total: number;
    };
  }>,
  options: UsePaginatedApiOptions<T> = {}
) {
  const {
    itemsPerPage = 20,
    initialPage = 1,
    ...apiOptions
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { execute: fetchData, loading, error, status } = useApi(
    async (params?: P & { page: number; perPage: number }) => {
      const response = await apiFunction(params);
      return response;
    },
    apiOptions
  );

  const loadMore = useCallback(async (params?: P) => {
    if (!hasMore || loading) return;

    const nextPage = page + 1;
    const result = await fetchData({ ...params, page: nextPage, perPage: itemsPerPage } as P & { page: number; perPage: number });

    if (result?.data) {
      setItems(prev => [...prev, ...result.data]);
      setPage(nextPage);
      setHasMore(result.data.length === itemsPerPage);
      setTotal(result.meta?.total || 0);
    }
  }, [fetchData, hasMore, loading, page, itemsPerPage]);

  const refresh = useCallback(async (params?: P) => {
    setRefreshing(true);
    const result = await fetchData({ ...params, page: 1, perPage: itemsPerPage } as P & { page: number; perPage: number });

    if (result?.data) {
      setItems(result.data);
      setPage(1);
      setHasMore(result.data.length === itemsPerPage);
      setTotal(result.meta?.total || 0);
    }
    setRefreshing(false);
  }, [fetchData, itemsPerPage]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(initialPage);
    setHasMore(true);
    setTotal(0);
  }, [initialPage]);

  return {
    items,
    loading,
    refreshing,
    error,
    status,
    hasMore,
    total,
    page,
    loadMore,
    refresh,
    reset,
  };
}

// Mutation Hook
export function useMutation<T = any, P = any>(
  mutationFn: (params: P) => Promise<{ data?: T; success: boolean; message?: string }>,
  options: UseApiOptions<T> = {}
) {
  return useApi<T, P>(mutationFn, options);
}

// Query Hook
export function useQuery<T = any, P = any>(
  queryKey: string | any[],
  queryFn: (params?: P) => Promise<{ data?: T; success: boolean; message?: string }>,
  options: UseApiOptions<T> & {
    enabled?: boolean;
    dependencies?: any[];
    cacheTime?: number;
    staleTime?: number;
  } = {}
) {
  const {
    enabled = true,
    dependencies = [],
    cacheTime = 5 * 60 * 1000,
    staleTime = 0,
    ...apiOptions
  } = options;

  const [cachedData, setCachedData] = useState<{ [key: string]: { data: T; timestamp: number } }>({});
  const queryKeyString = Array.isArray(queryKey) ? queryKey.join('-') : queryKey;

  const apiResult = useApi(queryFn, {
    ...apiOptions,
    onSuccess: (data) => {
      setCachedData(prev => ({
        ...prev,
        [queryKeyString]: {
          data,
          timestamp: Date.now(),
        },
      }));
      apiOptions.onSuccess?.(data);
    },
  });

  const { execute, ...state } = apiResult;

  const refetch = useCallback(async (params?: P) => {
    return execute(params);
  }, [execute]);

  useEffect(() => {
    if (!enabled) return;

    const cached = cachedData[queryKeyString];
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      // Use cached data by setting state through a custom mechanism
      // Since we can't directly modify state, we'll rely on the cache for this render
      return;
    }

    refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, queryKeyString, ...dependencies]);

  // Check if we have cached data that should be used
  const cached = cachedData[queryKeyString];
  const useCachedData = enabled && cached && Date.now() - cached.timestamp < cacheTime;
  
  const displayData = useCachedData ? cached.data : state.data;
  const displayLoading = useCachedData ? false : state.loading;
  const displayError = useCachedData ? null : state.error;
  const displayStatus = useCachedData ? 'success' : state.status;

  return {
    data: displayData,
    loading: displayLoading,
    error: displayError,
    status: displayStatus,
    refetch,
    isStale: staleTime > 0 && !!cachedData[queryKeyString] && 
             Date.now() - cachedData[queryKeyString].timestamp > staleTime,
    ...(useCachedData ? {} : { execute, reset: apiResult.reset, cancel: apiResult.cancel }),
  };
}