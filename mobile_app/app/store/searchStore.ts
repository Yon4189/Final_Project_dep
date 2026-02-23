// store/searchStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { produce } from "immer";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SearchFilters, ServiceProvider } from "../types/customer.types";

interface SearchState {
  // Search Query
  query: string;
  filters: SearchFilters;

  // Results
  results: ServiceProvider[];
  totalResults: number;
  currentPage: number;
  hasMore: boolean;

  // Loading States
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;

  // Error
  error: string | null;

  // Search History
  recentSearches: string[];
  searchHistory: string[];

  // Suggestions
  suggestions: string[];

  // Selected Items
  selectedProvider: ServiceProvider | null;
  selectedCategory: string | null;
  selectedService: string | null;

  // View Preferences
  viewMode: "list" | "grid" | "map";
  sortBy: "rating" | "distance" | "price_low" | "price_high" | "reviews";

  // Cache
  lastSearch: {
    query: string;
    filters: SearchFilters;
    timestamp: number;
  } | null;
}

interface SearchActions {
  // Search Actions
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  clearSearch: () => void;

  // Results Actions
  setResults: (results: ServiceProvider[]) => void;
  appendResults: (results: ServiceProvider[]) => void;
  setTotalResults: (total: number) => void;
  setCurrentPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;

  // Loading Actions
  setLoading: (isLoading: boolean) => void;
  setLoadingMore: (isLoadingMore: boolean) => void;
  setRefreshing: (isRefreshing: boolean) => void;

  // Error Actions
  setError: (error: string | null) => void;

  // History Actions
  setRecentSearches: (searches: string[]) => void;
  addToRecentSearches: (query: string) => void;
  removeFromRecentSearches: (query: string) => void;
  clearRecentSearches: () => void;

  setSearchHistory: (history: string[]) => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // Suggestions Actions
  setSuggestions: (suggestions: string[]) => void;
  clearSuggestions: () => void;

  // Selection Actions
  setSelectedProvider: (provider: ServiceProvider | null) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setSelectedService: (serviceId: string | null) => void;

  // View Actions
  setViewMode: (mode: "list" | "grid" | "map") => void;
  setSortBy: (
    sortBy: "rating" | "distance" | "price_low" | "price_high" | "reviews",
  ) => void;

  // Cache Actions
  setLastSearch: (query: string, filters: SearchFilters) => void;
  clearLastSearch: () => void;

  // Batch Actions
  resetSearch: () => void;
  hydrateSearchResults: (data: Partial<SearchState>) => void;
}

const initialFilters: SearchFilters = {
  sortBy: "rating",
  minRating: 0,
  maxDistance: 50,
  verifiedOnly: false,
  availableNow: false,
};

const initialState: SearchState = {
  query: "",
  filters: initialFilters,
  results: [],
  totalResults: 0,
  currentPage: 1,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  isRefreshing: false,
  error: null,
  recentSearches: [],
  searchHistory: [],
  suggestions: [],
  selectedProvider: null,
  selectedCategory: null,
  selectedService: null,
  viewMode: "list",
  sortBy: "rating",
  lastSearch: null,
};

export const useSearchStore = create<SearchState & SearchActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Search Actions
      setQuery: (query) => set({ query }),

      setFilters: (newFilters) =>
        set(
          produce((state: SearchState) => {
            state.filters = { ...state.filters, ...newFilters };
            // Reset pagination when filters change
            state.currentPage = 1;
            state.hasMore = false;
          }),
        ),

      resetFilters: () =>
        set({ filters: initialFilters, currentPage: 1, hasMore: false }),

      clearSearch: () =>
        set({
          query: "",
          filters: initialFilters,
          results: [],
          totalResults: 0,
          currentPage: 1,
          hasMore: false,
          error: null,
          selectedProvider: null,
          selectedCategory: null,
          selectedService: null,
        }),

      // Results Actions
      setResults: (results) =>
        set(
          produce((state: SearchState) => {
            state.results = results;
            state.hasMore = results.length === 20; // Assuming 20 per page
          }),
        ),

      appendResults: (results) =>
        set(
          produce((state: SearchState) => {
            state.results = [...state.results, ...results];
            state.hasMore = results.length === 20;
          }),
        ),

      setTotalResults: (total) => set({ totalResults: total }),

      setCurrentPage: (page) => set({ currentPage: page }),

      setHasMore: (hasMore) => set({ hasMore }),

      // Loading Actions
      setLoading: (isLoading) => set({ isLoading }),

      setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),

      setRefreshing: (isRefreshing) => set({ isRefreshing }),

      // Error Actions
      setError: (error) => set({ error }),

      // History Actions
      setRecentSearches: (searches) => set({ recentSearches: searches }),

      addToRecentSearches: (query) =>
        set(
          produce((state: SearchState) => {
            if (!query.trim()) return;

            // Remove if exists
            const filtered = state.recentSearches.filter((q) => q !== query);
            // Add to front and limit to 10
            state.recentSearches = [query, ...filtered].slice(0, 10);
          }),
        ),

      removeFromRecentSearches: (query) =>
        set(
          produce((state: SearchState) => {
            state.recentSearches = state.recentSearches.filter(
              (q) => q !== query,
            );
          }),
        ),

      clearRecentSearches: () => set({ recentSearches: [] }),

      setSearchHistory: (history) => set({ searchHistory: history }),

      addToSearchHistory: (query) =>
        set(
          produce((state: SearchState) => {
            if (!query.trim()) return;

            // Remove if exists
            const filtered = state.searchHistory.filter((q) => q !== query);
            // Add to front and limit to 20
            state.searchHistory = [query, ...filtered].slice(0, 20);
          }),
        ),

      clearSearchHistory: () => set({ searchHistory: [] }),

      // Suggestions Actions
      setSuggestions: (suggestions) => set({ suggestions }),

      clearSuggestions: () => set({ suggestions: [] }),

      // Selection Actions
      setSelectedProvider: (provider) => set({ selectedProvider: provider }),

      setSelectedCategory: (categoryId) =>
        set({ selectedCategory: categoryId }),

      setSelectedService: (serviceId) => set({ selectedService: serviceId }),

      // View Actions
      setViewMode: (mode) => set({ viewMode: mode }),

      setSortBy: (sortBy) =>
        set(
          produce((state: SearchState) => {
            state.sortBy = sortBy;
            state.filters.sortBy = sortBy;
            // Reset pagination when sort changes
            state.currentPage = 1;
            state.hasMore = false;
          }),
        ),

      // Cache Actions
      setLastSearch: (query, filters) =>
        set({
          lastSearch: {
            query,
            filters,
            timestamp: Date.now(),
          },
        }),

      clearLastSearch: () => set({ lastSearch: null }),

      // Batch Actions
      resetSearch: () => set(initialState),

      hydrateSearchResults: (data) =>
        set(
          produce((state: SearchState) => {
            if (data.results) state.results = data.results;
            if (data.totalResults !== undefined)
              state.totalResults = data.totalResults;
            if (data.currentPage) state.currentPage = data.currentPage;
            if (data.hasMore !== undefined) state.hasMore = data.hasMore;
            if (data.filters)
              state.filters = { ...state.filters, ...data.filters };
          }),
        ),
    }),
    {
      name: "search-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        searchHistory: state.searchHistory,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
      }),
    },
  ),
);

// Selector Hooks
export const useSearchQuery = () => useSearchStore((state) => state.query);
export const useSearchFilters = () => useSearchStore((state) => state.filters);
export const useSearchResults = () => useSearchStore((state) => state.results);
export const useSearchPagination = () => ({
  totalResults: useSearchStore((state) => state.totalResults),
  currentPage: useSearchStore((state) => state.currentPage),
  hasMore: useSearchStore((state) => state.hasMore),
});
export const useSearchLoading = () => ({
  isLoading: useSearchStore((state) => state.isLoading),
  isLoadingMore: useSearchStore((state) => state.isLoadingMore),
  isRefreshing: useSearchStore((state) => state.isRefreshing),
});
export const useSearchError = () => useSearchStore((state) => state.error);
export const useRecentSearches = () =>
  useSearchStore((state) => state.recentSearches);
export const useSearchHistory = () =>
  useSearchStore((state) => state.searchHistory);
export const useSuggestions = () =>
  useSearchStore((state) => state.suggestions);
export const useSelectedItems = () => ({
  selectedProvider: useSearchStore((state) => state.selectedProvider),
  selectedCategory: useSearchStore((state) => state.selectedCategory),
  selectedService: useSearchStore((state) => state.selectedService),
});
export const useViewPreferences = () => ({
  viewMode: useSearchStore((state) => state.viewMode),
  sortBy: useSearchStore((state) => state.sortBy),
});
export const useLastSearch = () => useSearchStore((state) => state.lastSearch);

// Action Hooks
export const useSearchActions = () => {
  const store = useSearchStore();
  return {
    setQuery: store.setQuery,
    setFilters: store.setFilters,
    resetFilters: store.resetFilters,
    clearSearch: store.clearSearch,
    setResults: store.setResults,
    appendResults: store.appendResults,
    setTotalResults: store.setTotalResults,
    setCurrentPage: store.setCurrentPage,
    setHasMore: store.setHasMore,
    setLoading: store.setLoading,
    setLoadingMore: store.setLoadingMore,
    setRefreshing: store.setRefreshing,
    setError: store.setError,
    addToRecentSearches: store.addToRecentSearches,
    removeFromRecentSearches: store.removeFromRecentSearches,
    clearRecentSearches: store.clearRecentSearches,
    addToSearchHistory: store.addToSearchHistory,
    clearSearchHistory: store.clearSearchHistory,
    setSuggestions: store.setSuggestions,
    clearSuggestions: store.clearSuggestions,
    setSelectedProvider: store.setSelectedProvider,
    setSelectedCategory: store.setSelectedCategory,
    setSelectedService: store.setSelectedService,
    setViewMode: store.setViewMode,
    setSortBy: store.setSortBy,
    setLastSearch: store.setLastSearch,
    clearLastSearch: store.clearLastSearch,
    resetSearch: store.resetSearch,
    hydrateSearchResults: store.hydrateSearchResults,
  };
};

// Derived Hooks
export const useActiveFiltersCount = () => {
  const filters = useSearchFilters();
  let count = 0;
  if (filters.minRating && filters.minRating > 0) count++;
  if (filters.maxDistance && filters.maxDistance < 50) count++;
  if (filters.categoryId) count++;
  if (filters.serviceId) count++;
  if (filters.verifiedOnly) count++;
  if (filters.availableNow) count++;
  if (filters.priceRange) count++;
  return count;
};

export const useHasActiveFilters = () => {
  const count = useActiveFiltersCount();
  return count > 0;
};

export const useSearchSummary = () => {
  const query = useSearchQuery();
  const results = useSearchResults();
  const { totalResults } = useSearchPagination();
  const { isLoading } = useSearchLoading();

  return {
    hasQuery: !!query,
    hasResults: results.length > 0,
    resultCount: results.length,
    totalResults,
    isEmpty: !isLoading && results.length === 0 && !!query,
  };
};
