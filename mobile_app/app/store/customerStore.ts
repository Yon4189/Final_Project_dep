// store/customerStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { produce } from 'immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Location, ServiceRequest, Review, Complaint } from '../types/customer.types';

interface CustomerState {
  // User Data
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Locations
  locations: Location[];
  selectedLocation: Location | null;
  
  // Requests
  requests: ServiceRequest[];
  activeRequest: ServiceRequest | null;
  requestStats: {
    total: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  
  // Reviews
  reviews: Review[];
  
  // Complaints
  complaints: Complaint[];
  
  // Favorites
  favorites: string[]; // Array of provider IDs
  
  // Notifications
  unreadNotifications: number;
  
  // UI State
  isRefreshing: boolean;
  lastSync: number | null;
}

interface CustomerActions {
  // User Actions
  setUser: (user: User | null) => void;
  updateUser: (data: Partial<User>) => void;
  clearUser: () => void;
  
  // Location Actions
  setLocations: (locations: Location[]) => void;
  addLocation: (location: Location) => void;
  updateLocation: (id: string, data: Partial<Location>) => void;
  removeLocation: (id: string) => void;
  setSelectedLocation: (location: Location | null) => void;
  
  // Request Actions
  setRequests: (requests: ServiceRequest[]) => void;
  addRequest: (request: ServiceRequest) => void;
  updateRequest: (id: string, data: Partial<ServiceRequest>) => void;
  removeRequest: (id: string) => void;
  setActiveRequest: (request: ServiceRequest | null) => void;
  updateRequestStats: () => void;
  
  // Review Actions
  setReviews: (reviews: Review[]) => void;
  addReview: (review: Review) => void;
  updateReview: (id: string, data: Partial<Review>) => void;
  removeReview: (id: string) => void;
  
  // Complaint Actions
  setComplaints: (complaints: Complaint[]) => void;
  addComplaint: (complaint: Complaint) => void;
  updateComplaint: (id: string, data: Partial<Complaint>) => void;
  
  // Favorite Actions
  setFavorites: (favorites: string[]) => void;
  addFavorite: (providerId: string) => void;
  removeFavorite: (providerId: string) => void;
  toggleFavorite: (providerId: string) => boolean;
  isFavorite: (providerId: string) => boolean;
  
  // Notification Actions
  setUnreadNotifications: (count: number) => void;
  incrementUnreadNotifications: () => void;
  decrementUnreadNotifications: () => void;
  resetUnreadNotifications: () => void;
  
  // UI Actions
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  setLastSync: (timestamp: number) => void;
  
  // Batch Actions
  hydrateFromAPI: (data: Partial<CustomerState>) => void;
  reset: () => void;
}

const initialState: CustomerState = {
  user: null,
  isLoading: false,
  error: null,
  locations: [],
  selectedLocation: null,
  requests: [],
  activeRequest: null,
  requestStats: {
    total: 0,
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  },
  reviews: [],
  complaints: [],
  favorites: [],
  unreadNotifications: 0,
  isRefreshing: false,
  lastSync: null,
};

export const useCustomerStore = create<CustomerState & CustomerActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // User Actions
      setUser: (user) => set({ user }),
      
      updateUser: (data) => 
        set(produce((state: CustomerState) => {
          if (state.user) {
            state.user = { ...state.user, ...data };
          }
        })),
      
      clearUser: () => set({ user: null }),

      // Location Actions
      setLocations: (locations) => set({ locations }),
      
      addLocation: (location) =>
        set(produce((state: CustomerState) => {
          state.locations.push(location);
          if (location.isPrimary) {
            state.locations.forEach(l => {
              if (l.id !== location.id) l.isPrimary = false;
            });
          }
        })),
      
      updateLocation: (id, data) =>
        set(produce((state: CustomerState) => {
          const index = state.locations.findIndex(l => l.id === id);
          if (index !== -1) {
            state.locations[index] = { ...state.locations[index], ...data };
            
            // Handle primary status change
            if (data.isPrimary) {
              state.locations.forEach((l, i) => {
                if (i !== index) l.isPrimary = false;
              });
            }
          }
        })),
      
      removeLocation: (id) =>
        set(produce((state: CustomerState) => {
          state.locations = state.locations.filter(l => l.id !== id);
          if (state.selectedLocation?.id === id) {
            state.selectedLocation = null;
          }
        })),
      
      setSelectedLocation: (location) => set({ selectedLocation: location }),

      // Request Actions
      setRequests: (requests) => 
        set(produce((state: CustomerState) => {
          state.requests = requests;
          state.requestStats = calculateRequestStats(requests);
        })),
      
      addRequest: (request) =>
        set(produce((state: CustomerState) => {
          state.requests.unshift(request);
          state.requestStats = calculateRequestStats(state.requests);
        })),
      
      updateRequest: (id, data) =>
        set(produce((state: CustomerState) => {
          const index = state.requests.findIndex(r => r.id === id);
          if (index !== -1) {
            state.requests[index] = { ...state.requests[index], ...data };
            state.requestStats = calculateRequestStats(state.requests);
            
            if (state.activeRequest?.id === id) {
              state.activeRequest = { ...state.activeRequest, ...data };
            }
          }
        })),
      
      removeRequest: (id) =>
        set(produce((state: CustomerState) => {
          state.requests = state.requests.filter(r => r.id !== id);
          state.requestStats = calculateRequestStats(state.requests);
          
          if (state.activeRequest?.id === id) {
            state.activeRequest = null;
          }
        })),
      
      setActiveRequest: (request) => set({ activeRequest: request }),
      
      updateRequestStats: () =>
        set(produce((state: CustomerState) => {
          state.requestStats = calculateRequestStats(state.requests);
        })),

      // Review Actions
      setReviews: (reviews) => set({ reviews }),
      
      addReview: (review) =>
        set(produce((state: CustomerState) => {
          state.reviews.unshift(review);
        })),
      
      updateReview: (id, data) =>
        set(produce((state: CustomerState) => {
          const index = state.reviews.findIndex(r => r.id === id);
          if (index !== -1) {
            state.reviews[index] = { ...state.reviews[index], ...data };
          }
        })),
      
      removeReview: (id) =>
        set(produce((state: CustomerState) => {
          state.reviews = state.reviews.filter(r => r.id !== id);
        })),

      // Complaint Actions
      setComplaints: (complaints) => set({ complaints }),
      
      addComplaint: (complaint) =>
        set(produce((state: CustomerState) => {
          state.complaints.unshift(complaint);
        })),
      
      updateComplaint: (id, data) =>
        set(produce((state: CustomerState) => {
          const index = state.complaints.findIndex(c => c.id === id);
          if (index !== -1) {
            state.complaints[index] = { ...state.complaints[index], ...data };
          }
        })),

      // Favorite Actions
      setFavorites: (favorites) => set({ favorites }),
      
      addFavorite: (providerId) =>
        set(produce((state: CustomerState) => {
          if (!state.favorites.includes(providerId)) {
            state.favorites.push(providerId);
          }
        })),
      
      removeFavorite: (providerId) =>
        set(produce((state: CustomerState) => {
          state.favorites = state.favorites.filter(id => id !== providerId);
        })),
      
      toggleFavorite: (providerId) => {
        const isFavorite = get().favorites.includes(providerId);
        if (isFavorite) {
          get().removeFavorite(providerId);
        } else {
          get().addFavorite(providerId);
        }
        return !isFavorite;
      },
      
      isFavorite: (providerId) => get().favorites.includes(providerId),

      // Notification Actions
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),
      
      incrementUnreadNotifications: () =>
        set(produce((state: CustomerState) => {
          state.unreadNotifications += 1;
        })),
      
      decrementUnreadNotifications: () =>
        set(produce((state: CustomerState) => {
          if (state.unreadNotifications > 0) {
            state.unreadNotifications -= 1;
          }
        })),
      
      resetUnreadNotifications: () => set({ unreadNotifications: 0 }),

      // UI Actions
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      setRefreshing: (isRefreshing) => set({ isRefreshing }),
      
      setLastSync: (timestamp) => set({ lastSync: timestamp }),

      // Batch Actions
      hydrateFromAPI: (data) =>
        set(produce((state: CustomerState) => {
          if (data.user) state.user = data.user;
          if (data.locations) state.locations = data.locations;
          if (data.requests) {
            state.requests = data.requests;
            state.requestStats = calculateRequestStats(data.requests);
          }
          if (data.reviews) state.reviews = data.reviews;
          if (data.complaints) state.complaints = data.complaints;
          if (data.favorites) state.favorites = data.favorites;
          if (data.unreadNotifications !== undefined) {
            state.unreadNotifications = data.unreadNotifications;
          }
          state.lastSync = Date.now();
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'customer-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        locations: state.locations,
        favorites: state.favorites,
        unreadNotifications: state.unreadNotifications,
      }),
    }
  )
);

// Helper function to calculate request statistics
const calculateRequestStats = (requests: ServiceRequest[]) => {
  return {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    confirmed: requests.filter(r => r.status === 'confirmed').length,
    inProgress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
  };
};

// Selector Hooks for optimized re-renders
export const useUser = () => useCustomerStore((state) => state.user);
export const useLocations = () => useCustomerStore((state) => state.locations);
export const useSelectedLocation = () => useCustomerStore((state) => state.selectedLocation);
export const useRequests = () => useCustomerStore((state) => state.requests);
export const useRequestStats = () => useCustomerStore((state) => state.requestStats);
export const useActiveRequest = () => useCustomerStore((state) => state.activeRequest);
export const useReviews = () => useCustomerStore((state) => state.reviews);
export const useComplaints = () => useCustomerStore((state) => state.complaints);
export const useFavorites = () => useCustomerStore((state) => state.favorites);
export const useUnreadNotifications = () => useCustomerStore((state) => state.unreadNotifications);
export const useIsFavorite = (providerId: string) => 
  useCustomerStore((state) => state.favorites.includes(providerId));
export const useLoading = () => useCustomerStore((state) => state.isLoading);
export const useError = () => useCustomerStore((state) => state.error);

// Action Hooks
export const useCustomerActions = () => {
  const store = useCustomerStore();
  return {
    setUser: store.setUser,
    updateUser: store.updateUser,
    clearUser: store.clearUser,
    setLocations: store.setLocations,
    addLocation: store.addLocation,
    updateLocation: store.updateLocation,
    removeLocation: store.removeLocation,
    setSelectedLocation: store.setSelectedLocation,
    setRequests: store.setRequests,
    addRequest: store.addRequest,
    updateRequest: store.updateRequest,
    removeRequest: store.removeRequest,
    setActiveRequest: store.setActiveRequest,
    setReviews: store.setReviews,
    addReview: store.addReview,
    updateReview: store.updateReview,
    removeReview: store.removeReview,
    setComplaints: store.setComplaints,
    addComplaint: store.addComplaint,
    updateComplaint: store.updateComplaint,
    addFavorite: store.addFavorite,
    removeFavorite: store.removeFavorite,
    toggleFavorite: store.toggleFavorite,
    setUnreadNotifications: store.setUnreadNotifications,
    incrementUnreadNotifications: store.incrementUnreadNotifications,
    decrementUnreadNotifications: store.decrementUnreadNotifications,
    resetUnreadNotifications: store.resetUnreadNotifications,
    setLoading: store.setLoading,
    setError: store.setError,
    setRefreshing: store.setRefreshing,
    hydrateFromAPI: store.hydrateFromAPI,
    reset: store.reset,
  };
};