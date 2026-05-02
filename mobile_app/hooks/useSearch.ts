// hooks/useSearch.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { customerService } from '@/app/services/customer.service';
import type { ServiceProvider, SearchFilters } from '@/app/types/customer.types';
import { useLocation } from './useLocation';

interface UseSearchOptions {
  initialQuery?: string;
  initialFilters?: Partial<SearchFilters>;
  autoSearch?: boolean;
}

export const useSearch = ({
  initialQuery = '',
  initialFilters = {},
  autoSearch = true,
}: UseSearchOptions = {}) => {
  const { location, loading: locationLoading } = useLocation();
  
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Partial<SearchFilters>>({
    sortBy: 'rating',
    ...initialFilters,
  });
  const [results, setResults] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Perform search with current query and filters
  const performSearch = useCallback(async (searchPage: number = 1, append: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Search - Performing search:', { query, filters, page: searchPage });
      
      const searchParams: any = {
        query: query || undefined,
        categoryId: filters.categoryId,
        serviceId: filters.serviceId,
        minRating: filters.minRating,
        maxDistance: filters.maxDistance,
        sortBy: filters.sortBy || 'rating',
        page: searchPage,
        perPage: 10,
      };

      // Add price range if provided
      if (filters.priceRange) {
        searchParams.price_min = filters.priceRange.min;
        searchParams.price_max = filters.priceRange.max;
      }

      // Add verified filter if provided
      if (filters.verifiedOnly) {
        searchParams.verified_only = filters.verifiedOnly;
      }

      // Add online now filter if provided
      if (filters.onlineNow) {
        searchParams.online_now = filters.onlineNow;
      }

      const response = await customerService.searchProviders(searchParams);
      
      if (response.success && response.data) {
        const newResults = response.data;
        
        setResults(prev => append ? [...prev, ...newResults] : newResults);
        setHasMore(newResults.length === 10); // If we got 10 results, there might be more
        setPage(searchPage);
        
        // Try to get total from meta if available
        if (response.meta?.total) {
          setTotalResults(response.meta.total);
        }
        
        console.log(`Search - Found ${newResults.length} providers`);
      } else {
        setError(response.message || 'Search failed');
      }
    } catch (err: any) {
      console.error('Search - Error:', err);
      setError(err.message || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  // Debounced search for query/filter/location changes
  useEffect(() => {
    if (!autoSearch || locationLoading) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(1, false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, filters, performSearch, autoSearch, location, locationLoading]);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    // Replace filters entirely — don't merge with old values
    setFilters({ sortBy: 'rating', ...newFilters });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      sortBy: 'rating',
    });
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    resetFilters();
    setResults([]);
    setError(null);
  }, [resetFilters]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      performSearch(page + 1, true);
    }
  }, [hasMore, loading, page, performSearch]);

  const refresh = useCallback(() => {
    performSearch(1, false);
  }, [performSearch]);

  return {
    query,
    setQuery,
    filters,
    updateFilters,
    resetFilters,
    results,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    clearSearch,
    totalResults,
    performSearch,
  };
};