// store/providerStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { produce } from "immer";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { providerService } from "../services/provider.service";
import type {
  BankDetails,
  ProviderProfile,
  ProviderService,
  ServiceRequest,
  WorkingHours,
} from "../types/provider.types";

interface ProviderState {
  // Profile Data
  profile: ProviderProfile | null;
  isLoading: boolean;
  error: string | null;

  requests: ServiceRequest[];
  pendingRequests: ServiceRequest[];
  todaySchedule: ServiceRequest[];
  activeRequest: ServiceRequest | null;

  // Services
  services: ProviderService[];

  // Bank Details
  bankDetails: BankDetails | null;

  // UI State
  isOnline: boolean;
  isRefreshing: boolean;
  lastSync: number | null;

  // Stats
  stats: {
    pendingRequests: number;
    todayJobs: number;
    weeklyEarnings: number;
    rating: number;
    completionRate: number;
    responseRate: number;
  } | null;
}

interface ProviderActions {
  // Profile Actions
  setProfile: (profile: ProviderProfile | null) => void;
  updateProfile: (data: Partial<ProviderProfile>) => void;
  loadProfile: () => Promise<void>;

  // Availability Actions
  setOnline: (isOnline: boolean) => void;
  toggleAvailability: () => Promise<void>;

  // Request Actions
  setRequests: (requests: ServiceRequest[]) => void;
  addRequest: (request: ServiceRequest) => void;
  updateRequest: (id: string, data: Partial<ServiceRequest>) => void;
  removeRequest: (id: string) => void;
  setActiveRequest: (request: ServiceRequest | null) => void;
  loadRequests: () => Promise<void>;
  loadPendingRequests: () => Promise<void>;
  loadTodaySchedule: () => Promise<void>;

  // Service Actions
  setServices: (services: ProviderService[]) => void;
  addService: (service: ProviderService) => void;
  updateService: (id: string, data: Partial<ProviderService>) => void;
  removeService: (id: string) => void;
  toggleServiceStatus: (id: string, isActive: boolean) => Promise<void>;
  loadServices: () => Promise<void>;

  // Bank Actions
  setBankDetails: (details: BankDetails | null) => void;
  updateBankDetails: (data: Partial<BankDetails>) => Promise<void>;
  loadBankDetails: () => Promise<void>;

  // Stats Actions
  setStats: (stats: any) => void;
  loadStats: () => Promise<void>;

  // Working Hours Actions
  updateWorkingHours: (hours: WorkingHours) => Promise<void>;

  // UI Actions
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  setLastSync: (timestamp: number) => void;

  // Batch Actions
  refreshAll: () => Promise<void>;
  hydrateFromAPI: (data: Partial<ProviderState>) => void;
  reset: () => void;
}

const initialState: ProviderState = {
  profile: null,
  isLoading: false,
  error: null,
  requests: [],
  pendingRequests: [],
  todaySchedule: [],
  activeRequest: null,
  services: [],
  bankDetails: null,
  isOnline: true,
  isRefreshing: false,
  lastSync: null,
  stats: null,
};

export const useProviderStore = create<ProviderState & ProviderActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Profile Actions
      setProfile: (profile) => set({ profile }),

      updateProfile: (data) =>
        set(
          produce((state: ProviderState) => {
            if (state.profile) {
              state.profile = { ...state.profile, ...data };
            }
          }),
        ),

      loadProfile: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await providerService.getProfile();
          if (response.success && response.data) {
            set({
              profile: response.data as ProviderProfile,
              isOnline: (response.data as ProviderProfile).isAvailable,
            });
          } else {
            set({ error: response.message });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to load profile",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // Availability Actions
      setOnline: (isOnline) => set({ isOnline }),

      toggleAvailability: async () => {
        const current = get().isOnline;
        try {
          set({ isLoading: true });
          const response = await providerService.updateAvailability(!current);
          if (response.success && response.data) {
            set({
              isOnline: !current,
              profile: response.data as ProviderProfile,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to update availability",
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
          set({ isLoading: false });
        }
      },

      // Request Actions
      setRequests: (requests) => set({ requests }),

      addRequest: (request) =>
        set(
          produce((state: ProviderState) => {
            state.requests.unshift(request);
            if (request.status === "pending") {
              state.pendingRequests.unshift(request);
            }
          }),
        ),

      updateRequest: (id, data) =>
        set(
          produce((state: ProviderState) => {
            // Update in requests array
            const requestIndex = state.requests.findIndex((r) => r.id === id);
            if (requestIndex !== -1) {
              state.requests[requestIndex] = {
                ...state.requests[requestIndex],
                ...data,
              };
            }

            // Update in pending requests
            const pendingIndex = state.pendingRequests.findIndex(
              (r) => r.id === id,
            );
            if (pendingIndex !== -1) {
              state.pendingRequests[pendingIndex] = {
                ...state.pendingRequests[pendingIndex],
                ...data,
              };

              // Remove from pending if status changed
              if (data.status && data.status !== "pending") {
                state.pendingRequests = state.pendingRequests.filter(
                  (r) => r.id !== id,
                );
              }
            }

            // Update in today schedule
            const todayIndex = state.todaySchedule.findIndex(
              (r) => r.id === id,
            );
            if (todayIndex !== -1) {
              state.todaySchedule[todayIndex] = {
                ...state.todaySchedule[todayIndex],
                ...data,
              };
            }

            // Update active request
            if (state.activeRequest?.id === id) {
              state.activeRequest = { ...state.activeRequest, ...data };
            }
          }),
        ),

      removeRequest: (id) =>
        set(
          produce((state: ProviderState) => {
            state.requests = state.requests.filter((r) => r.id !== id);
            state.pendingRequests = state.pendingRequests.filter(
              (r) => r.id !== id,
            );
            state.todaySchedule = state.todaySchedule.filter(
              (r) => r.id !== id,
            );
            if (state.activeRequest?.id === id) {
              state.activeRequest = null;
            }
          }),
        ),

      setActiveRequest: (request) => set({ activeRequest: request }),

      loadRequests: async () => {
        try {
          set({ isLoading: true });
          const response = await providerService.getRequests();
          if (response.success && response.data) {
            set({ requests: response.data as ServiceRequest[] });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load requests",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      loadPendingRequests: async () => {
        try {
          const response = await providerService.getRequests("pending");
          if (response.success && response.data) {
            set({ pendingRequests: response.data as ServiceRequest[] });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load pending requests",
          });
        }
      },

      loadTodaySchedule: async () => {
        try {
          const response = await providerService.getTodaySchedule();
          if (response.success && response.data) {
            set({ todaySchedule: response.data as ServiceRequest[] });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load today schedule",
          });
        }
      },

      // Service Actions
      setServices: (services) => set({ services }),

      addService: (service) =>
        set(
          produce((state: ProviderState) => {
            state.services.push(service);
          }),
        ),

      updateService: (id, data) =>
        set(
          produce((state: ProviderState) => {
            const index = state.services.findIndex((s) => s.id === id);
            if (index !== -1) {
              state.services[index] = { ...state.services[index], ...data };
            }
          }),
        ),

      removeService: (id) =>
        set(
          produce((state: ProviderState) => {
            state.services = state.services.filter((s) => s.id !== id);
          }),
        ),

      toggleServiceStatus: async (id, isActive) => {
        try {
          const response = await providerService.toggleServiceStatus(
            id,
            isActive,
          );
          if (response.success) {
            set(
              produce((state: ProviderState) => {
                const index = state.services.findIndex((s) => s.id === id);
                if (index !== -1) {
                  if (response.data) {
                    state.services[index] =
                      response.data as unknown as ProviderService;
                  } else {
                    state.services[index] = {
                      ...state.services[index],
                      isActive: isActive,
                    };
                  }
                }
              }),
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            set({
              error: response.message || "Failed to toggle service status",
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to toggle service status",
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      },

      loadServices: async () => {
        try {
          const response = await providerService.getMyServices();
          if (response.success && response.data) {
            set({ services: response.data as unknown as ProviderService[] });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load services",
          });
        }
      },

      // Bank Actions
      setBankDetails: (details) => set({ bankDetails: details }),

      updateBankDetails: async (data) => {
        try {
          set({ isLoading: true });
          const response = await providerService.updateBankDetails(data);
          if (response.success && response.data) {
            set({ bankDetails: response.data as BankDetails });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to update bank details",
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadBankDetails: async () => {
        try {
          const response = await providerService.getBankDetails();
          if (response.success && response.data) {
            set({ bankDetails: response.data as BankDetails });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load bank details",
          });
        }
      },

      // Stats Actions
      setStats: (stats) => set({ stats }),

      loadStats: async () => {
        try {
          const response = await providerService.getDashboardStats();
          if (response.success && response.data) {
            set({ stats: response.data });
          }
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to load stats",
          });
        }
      },

      // Working Hours Actions
      updateWorkingHours: async (hours) => {
        try {
          set({ isLoading: true });
          const response = await providerService.updateWorkingHours(hours);
          if (response.success && response.data) {
            set(
              produce((state: ProviderState) => {
                if (state.profile) {
                  state.profile.workingHours = hours;
                }
              }),
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to update working hours",
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
          set({ isLoading: false });
        }
      },

      // UI Actions
      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      setRefreshing: (isRefreshing) => set({ isRefreshing }),

      setLastSync: (timestamp) => set({ lastSync: timestamp }),

      // Batch Actions
      refreshAll: async () => {
        set({ isRefreshing: true, error: null });
        try {
          await Promise.all([
            get().loadProfile(),
            get().loadRequests(),
            get().loadPendingRequests(),
            get().loadTodaySchedule(),
            get().loadServices(),
            get().loadBankDetails(),
            get().loadStats(),
          ]);
          set({ lastSync: Date.now() });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to refresh data",
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
          set({ isRefreshing: false });
        }
      },

      hydrateFromAPI: (data) =>
        set(
          produce((state: ProviderState) => {
            if (data.profile) state.profile = data.profile;
            if (data.requests) state.requests = data.requests;
            if (data.pendingRequests)
              state.pendingRequests = data.pendingRequests;
            if (data.todaySchedule) state.todaySchedule = data.todaySchedule;
            if (data.services) state.services = data.services;
            if (data.bankDetails) state.bankDetails = data.bankDetails;
            if (data.stats) state.stats = data.stats;
            state.lastSync = Date.now();
          }),
        ),

      reset: () => set(initialState),
    }),
    {
      name: "provider-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        isOnline: state.isOnline,
        bankDetails: state.bankDetails,
      }),
    },
  ),
);

// Selector Hooks
export const useProviderProfile = () =>
  useProviderStore((state) => state.profile);
export const useProviderRequests = () =>
  useProviderStore((state) => state.requests);
export const usePendingRequests = () =>
  useProviderStore((state) => state.pendingRequests);
export const useTodaySchedule = () =>
  useProviderStore((state) => state.todaySchedule);
export const useProviderServices = () =>
  useProviderStore((state) => state.services);
export const useProviderBankDetails = () =>
  useProviderStore((state) => state.bankDetails);
export const useProviderStats = () => useProviderStore((state) => state.stats);
export const useProviderOnline = () =>
  useProviderStore((state) => state.isOnline);
export const useProviderLoading = () =>
  useProviderStore((state) => state.isLoading);
export const useProviderError = () => useProviderStore((state) => state.error);

// Action Hooks
export const useProviderActions = () => {
  const store = useProviderStore();
  return {
    loadProfile: store.loadProfile,
    updateProfile: store.updateProfile,
    toggleAvailability: store.toggleAvailability,
    loadRequests: store.loadRequests,
    loadPendingRequests: store.loadPendingRequests,
    loadTodaySchedule: store.loadTodaySchedule,
    updateRequest: store.updateRequest,
    setActiveRequest: store.setActiveRequest,
    loadServices: store.loadServices,
    addService: store.addService,
    updateService: store.updateService,
    removeService: store.removeService,
    toggleServiceStatus: store.toggleServiceStatus,
    updateBankDetails: store.updateBankDetails,
    loadBankDetails: store.loadBankDetails,
    updateWorkingHours: store.updateWorkingHours,
    refreshAll: store.refreshAll,
    reset: store.reset,
  };
};
