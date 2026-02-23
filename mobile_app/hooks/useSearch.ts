// hooks/useSearch.ts
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import debounce from 'lodash.debounce';
import { customerService } from '@/app/services/customer.service';
import { useLocation } from './useLocation';
import type { ServiceProvider, SearchFilters } from '@/app/types/customer.types';

interface UseSearchOptions {
  initialQuery?: string;
  initialFilters?: Partial<SearchFilters>;
  autoSearch?: boolean;
  debounceMs?: number;
  cacheResults?: boolean;
  maxCacheSize?: number;
}

interface SearchCache {
  [key: string]: {
    results: ServiceProvider[];
    timestamp: number;
    total: number;
  };
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    initialQuery = '',
    initialFilters = {},
    autoSearch = true,
    debounceMs = 500,
    cacheResults = true,
    maxCacheSize = 20,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'rating',
    minRating: 0,
    maxDistance: 50,
    ...initialFilters,
  });

  const [results, setResults] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const { location, calculateDistance } = useLocation();
  const cacheRef = useRef<SearchCache>({});

  /* -------------------- Helpers -------------------- */

  const getCacheKey = useCallback(
    (q: string, f: SearchFilters, p: number) =>
      `${q}-${JSON.stringify(f)}-${p}`,
    []
  );

  const cleanCache = useCallback(() => {
    const keys = Object.keys(cacheRef.current);
    if (keys.length <= maxCacheSize) return;

    const sorted = keys.sort(
      (a, b) =>
        cacheRef.current[b].timestamp - cacheRef.current[a].timestamp
    );

    const trimmed: SearchCache = {};
    sorted.slice(0, maxCacheSize).forEach(key => {
      trimmed[key] = cacheRef.current[key];
    });

    cacheRef.current = trimmed;
  }, [maxCacheSize]);

  const sortProviders = useCallback(
    (providers: ServiceProvider[], sortBy: SearchFilters['sortBy']) => {
      const sorted = [...providers];

      switch (sortBy) {
        case 'rating':
          return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        case 'distance':
          return sorted.sort(
            (a, b) => (a.distance ?? 0) - (b.distance ?? 0)
          );
        case 'price_low':
          return sorted.sort(
            (a, b) =>
              (a.priceRange?.min ?? 0) - (b.priceRange?.min ?? 0)
          );
        case 'price_high':
          return sorted.sort(
            (a, b) =>
              (b.priceRange?.max ?? 0) - (a.priceRange?.max ?? 0)
          );
        case 'reviews':
          return sorted.sort(
            (a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
          );
        default:
          return sorted;
      }
    },
    []
  );

  /* -------------------- Search -------------------- */

  const performSearch = useCallback(
    async (
      searchQuery: string,
      searchFilters: SearchFilters,
      pageNum: number,
      isLoadMore = false
    ) => {
      if (!location) {
        setError('Location not available');
        return;
      }

      if (!isLoadMore) setLoading(true);
      setError(null);

      const cacheKey = getCacheKey(searchQuery, searchFilters, pageNum);
      const cached = cacheRef.current[cacheKey];

      if (
        cacheResults &&
        cached &&
        Date.now() - cached.timestamp < 5 * 60 * 1000
      ) {
        setResults(prev =>
          isLoadMore ? [...prev, ...cached.results] : cached.results
        );
        setTotal(cached.total);
        setHasMore(cached.results.length === 20);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      try {
        const response = await customerService.searchProviders({
          ...searchFilters,
          query: searchQuery,
          page: pageNum,
          perPage: 20,
        });

        if (response?.success && response.data) {
          const providersWithDistance = response.data.map(provider => {
            const lat = provider.location?.latitude;
            const lng = provider.location?.longitude;

            return {
              ...provider,
              distance:
                lat && lng
                  ? calculateDistance(
                      location.latitude,
                      location.longitude,
                      lat,
                      lng
                    )
                  : undefined,
            };
          });

          const sorted = sortProviders(
            providersWithDistance,
            searchFilters.sortBy
          );

          setResults(prev =>
            isLoadMore ? [...prev, ...sorted] : sorted
          );

          setTotal(response.meta?.total ?? 0);
          setHasMore(response.data.length === 20);

          if (cacheResults) {
            cacheRef.current[cacheKey] = {
              results: sorted,
              timestamp: Date.now(),
              total: response.meta?.total ?? 0,
            };
            cleanCache();
          }
        }
      } catch (err: any) {
        setError(err?.message ?? 'Search failed');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      location,
      calculateDistance,
      cacheResults,
      getCacheKey,
      cleanCache,
      sortProviders,
    ]
  );

  /* -------------------- Debounced -------------------- */

  const debouncedSearch = useMemo(() => {
    return debounce(
      (q: string, f: SearchFilters) => {
        setPage(1);
        performSearch(q, f, 1, false);
      },
      debounceMs
    );
  }, [performSearch, debounceMs]);

  const getSuggestions = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setSuggestions([
      `${searchQuery} plumbing`,
      `${searchQuery} electrician`,
      `${searchQuery} cleaning`,
      `${searchQuery} repair`,
      `${searchQuery} installation`,
    ]);
  }, []);

  const debouncedSuggestions = useMemo(
    () => debounce(getSuggestions, 300),
    [getSuggestions]
  );

  /* -------------------- Actions -------------------- */

  const updateQuery = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      debouncedSearch(newQuery, filters);
      debouncedSuggestions(newQuery);
    },
    [filters, debouncedSearch, debouncedSuggestions]
  );

  const updateFilters = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      setFilters(prev => {
        const updated = { ...prev, ...newFilters };
        debouncedSearch(query, updated);
        return updated;
      });
    },
    [query, debouncedSearch]
  );

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      const next = page + 1;
      setPage(next);
      setLoadingMore(true);
      performSearch(query, filters, next, true);
    }
  }, [loading, loadingMore, hasMore, page, query, filters, performSearch]);

  const refresh = useCallback(() => {
    setPage(1);
    performSearch(query, filters, 1, false);
  }, [query, filters, performSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  const addToHistory = useCallback((q: string) => {
    if (!q.trim()) return;
    setSearchHistory(prev =>
      [q, ...prev.filter(item => item !== q)].slice(0, 10)
    );
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  /* -------------------- Effects -------------------- */

  useEffect(() => {
    if (autoSearch && location) refresh();
  }, [autoSearch, location, refresh]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
      debouncedSuggestions.cancel();
    };
  }, [debouncedSearch, debouncedSuggestions]);

  /* -------------------- Return -------------------- */

  return {
    query,
    filters,
    results,
    loading,
    loadingMore,
    error,
    hasMore,
    total,
    page,
    suggestions,
    searchHistory,

    setQuery: updateQuery,
    updateFilters,
    loadMore,
    refresh,
    clearSearch,
    addToHistory,
    clearHistory,

    performSearch,
    getSuggestions,
  };
}

/* -------------------- Extra Hooks -------------------- */

export function useProviderSearch(initialCategory?: string) {
  return useSearch({
    initialFilters: initialCategory
      ? { categoryId: initialCategory }
      : {},
  });
}

export function useNearbyProviders(radius = 10) {
  return useSearch({
    initialFilters: { maxDistance: radius, sortBy: 'distance' },
  });
}

export function useTopRatedProviders() {
  return useSearch({
    initialFilters: { sortBy: 'rating', minRating: 4 },
  });
}
