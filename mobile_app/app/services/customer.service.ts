// services/customer.service.ts
import { api } from './api';
import { storage } from './storage.service';
import type {
  User,
  Location as UserLocation,
  ServiceProvider,
  ServiceRequest,
  Review,
  Complaint,
  SearchFilters,
  AvailabilitySlot,
  ApiResponse,
  WalletBalance 
} from '../types/customer.types';

// Add interface for location data from storage
interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

// Type guard for validating location data

function isValidLocation(location: unknown): location is LocationData {
  if (!location || typeof location !== 'object') return false;
  
  const loc = location as Record<string, unknown>;
  return (
    typeof loc.latitude === 'number' &&
    typeof loc.longitude === 'number' &&
    !isNaN(loc.latitude) &&
    !isNaN(loc.longitude)
  );
}

// Type guard for validating arrays
function isValidArray<T>(data: unknown): data is T[] {
  return Array.isArray(data);
}

class CustomerService {
  private readonly BASE_PATH = '/customer';

  // ==================== Profile Management ====================

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await api.get<User>(`${this.BASE_PATH}/profile`);
    
    // Cache profile data
    if (response.success && response.data) {
      await storage.setItem('user_profile', response.data);
    }
    
    return response;
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await api.put<User>(`${this.BASE_PATH}/profile`, data);
    
    // Update cached profile
    if (response.success && response.data) {
      await storage.setItem('user_profile', response.data);
    }
    
    return response;
  }

  async uploadProfileImage(formData: FormData): Promise<ApiResponse<{ url: string }>> {
    return api.upload<{ url: string }>(`${this.BASE_PATH}/profile/image`, formData);
  }

  async changePassword(data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<ApiResponse<void>> {
    const response = await api.post<void>(`${this.BASE_PATH}/profile/password`, data);
    return response;
  }

  async getNotificationSettings(): Promise<ApiResponse<any>> {
    const cached = await storage.getItem<any>('notification_settings');
    if (cached) {
      return { success: true, data: cached };
    }
    
    const response = await api.get<any>(`${this.BASE_PATH}/notifications/settings`);
    
    if (response.success && response.data) {
      await storage.setItem('notification_settings', response.data);
    }
    
    return response;
  }

  async updateNotificationSettings(data: any): Promise<ApiResponse<any>> {
    const response = await api.put<any>(`${this.BASE_PATH}/notifications/settings`, data);
    
    if (response.success && response.data) {
      await storage.setItem('notification_settings', response.data);
    }
    
    return response;
  }

  // ==================== Location Management ====================

  async getLocations(): Promise<ApiResponse<UserLocation[]>> {
    const cached = await storage.getItem<UserLocation[]>('user_locations');
    
    if (cached && isValidArray<UserLocation>(cached)) {
      return { 
        success: true, 
        data: cached 
      };
    }
    
    const response = await api.get<UserLocation[]>(`${this.BASE_PATH}/locations`);
    
    if (response.success && response.data) {
      await storage.setItem('user_locations', response.data);
    }
    
    return response;
  }

  async addLocation(data: Omit<UserLocation, 'id'>): Promise<ApiResponse<UserLocation>> {
    const response = await api.post<UserLocation>(`${this.BASE_PATH}/locations`, data);
    
    if (response.success) {
      // Invalidate cache
      await storage.removeItem('user_locations');
    }
    
    return response;
  }

  async updateLocation(id: string, data: Partial<UserLocation>): Promise<ApiResponse<UserLocation>> {
    const response = await api.put<UserLocation>(`${this.BASE_PATH}/locations/${id}`, data);
    
    if (response.success) {
      // Invalidate cache
      await storage.removeItem('user_locations');
    }
    
    return response;
  }

  async deleteLocation(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<void>(`${this.BASE_PATH}/locations/${id}`);
    
    if (response.success) {
      await storage.removeItem('user_locations');
    }
    
    return response;
  }

  async setPrimaryLocation(id: string): Promise<ApiResponse<UserLocation>> {
    const response = await api.patch<UserLocation>(`${this.BASE_PATH}/locations/${id}/primary`);
    
    if (response.success) {
      // Invalidate cache
      await storage.removeItem('user_locations');
    }
    
    return response;
  }

  async getServiceCity(): Promise<ApiResponse<{ service_city: string }>> {
    return api.get<{ service_city: string }>(`${this.BASE_PATH}/service-city`);
  }

  async updateServiceCity(data: { service_city: string }): Promise<ApiResponse<{ service_city: string }>> {
    return api.put<{ service_city: string }>(`${this.BASE_PATH}/service-city`, data);
  }

  // ==================== Service Provider Search ====================

  async searchProviders(filters: SearchFilters & { page?: number; perPage?: number }): Promise<ApiResponse<ServiceProvider[]>> {
    const params = new URLSearchParams();
    
    if (filters.query) params.append('query', filters.query);
    if (filters.categoryId) params.append('category_id', filters.categoryId);
    if (filters.serviceId) params.append('service_id', filters.serviceId);
    if (filters.minRating) params.append('min_rating', filters.minRating.toString());
    if (filters.maxDistance) params.append('max_distance', filters.maxDistance.toString());
    if (filters.priceRange) {
      params.append('price_min', filters.priceRange.min.toString());
      params.append('price_max', filters.priceRange.max.toString());
    }
    if (filters.verifiedOnly) params.append('verified_only', 'true');
    if (filters.availableNow) params.append('available_now', 'true');
    if (filters.sortBy) params.append('sort_by', filters.sortBy);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.perPage) params.append('per_page', filters.perPage.toString());

    // Add location if available
    try {
      const location = await storage.getItem<LocationData>('last_location');
      if (isValidLocation(location)) {
        params.append('latitude', location.latitude.toString());
        params.append('longitude', location.longitude.toString());
      }
    } catch (error) {
      console.warn('Failed to get location from storage:', error);
      // Continue without location params
    }

    return api.get<ServiceProvider[]>(`${this.BASE_PATH}/providers/search?${params.toString()}`);
  }

  async getProviderDetails(id: string): Promise<ApiResponse<ServiceProvider>> {
    const cacheKey = `provider_${id}`;
    const cached = await storage.getItem<ServiceProvider>(cacheKey);
    
    if (cached) {
      return { success: true, data: cached };
    }
    
    const response = await api.get<ServiceProvider>(`${this.BASE_PATH}/providers/${id}`);
    
    if (response.success && response.data) {
      // Cache for 5 minutes
      await storage.setItem(cacheKey, response.data, 5 * 60 * 1000);
    }
    
    return response;
  }

  async getProviderAvailability(
    providerId: string,
    date: string
  ): Promise<ApiResponse<AvailabilitySlot[]>> {
    return api.get<AvailabilitySlot[]>(
      `${this.BASE_PATH}/providers/${providerId}/availability?date=${date}`
    );
  }

  async getTopRatedProviders(limit: number = 10): Promise<ApiResponse<ServiceProvider[]>> {
    const cacheKey = `top_rated_providers_${limit}`;
    const cached = await storage.getItem<ServiceProvider[]>(cacheKey);
    
    if (cached && isValidArray<ServiceProvider>(cached)) {
      return { success: true, data: cached };
    }
    
    const response = await api.get<ServiceProvider[]>(
      `${this.BASE_PATH}/providers/top-rated?limit=${limit}`
    );
    
    if (response.success && response.data) {
      // Cache for 1 hour
      await storage.setItem(cacheKey, response.data, 60 * 60 * 1000);
    }
    
    return response;
  }

  async getSearchSuggestions(query: string): Promise<ApiResponse<string[]>> {
    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    try {
      const response = await api.get<string[]>(
        `${this.BASE_PATH}/search/suggestions?query=${encodeURIComponent(query)}`
      );
      return response;
    } catch (error) {
      // Fallback to mock suggestions if API fails
      const mockSuggestions = [
        `${query} plumbing`,
        `${query} electrician`,
        `${query} cleaning`,
        `${query} repair`,
        `${query} installation`,
        `${query} maintenance`,
      ];
      return { success: true, data: mockSuggestions };
    }
  }

  async getNearbyProviders(
    latitude: number,
    longitude: number,
    radius: number = 10
  ): Promise<ApiResponse<ServiceProvider[]>> {
    return api.get<ServiceProvider[]>(
      `${this.BASE_PATH}/providers/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`
    );
  }

  async getProviderReviews(
    providerId: string,
    page: number = 1
  ): Promise<ApiResponse<Review[]>> {
    return api.get<Review[]>(
      `${this.BASE_PATH}/providers/${providerId}/reviews?page=${page}`
    );
  }

  // ==================== Service Requests ====================

  async getMyRequests(status?: string): Promise<ApiResponse<ServiceRequest[]>> {
    const cacheKey = status ? `user_requests_${status}` : 'user_requests';
    const cached = await storage.getItem<ServiceRequest[]>(cacheKey);
    
    if (cached && isValidArray<ServiceRequest>(cached)) {
      return { success: true, data: cached };
    }
    
    const url = status 
      ? `${this.BASE_PATH}/requests?status=${status}` 
      : `${this.BASE_PATH}/requests`;
    
    const response = await api.get<ServiceRequest[]>(url);
    
    if (response.success && response.data) {
      // Cache for 2 minutes
      await storage.setItem(cacheKey, response.data, 2 * 60 * 1000);
    }
    
    return response;
  }

  async getRequestDetails(id: string): Promise<ApiResponse<ServiceRequest>> {
    const cacheKey = `request_${id}`;
    const cached = await storage.getItem<ServiceRequest>(cacheKey);
    
    if (cached) {
      return { success: true, data: cached };
    }
    
    const response = await api.get<ServiceRequest>(`${this.BASE_PATH}/requests/${id}`);
    
    if (response.success && response.data) {
      await storage.setItem(cacheKey, response.data);
    }
    
    return response;
  }

  async cancelRequest(id: string, reason: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/requests/${id}/cancel`, { reason });
    
    if (response.success) {
      // Invalidate caches
      await storage.removeItem(`request_${id}`);
      await storage.removeItem('user_requests');
    }
    
    return response;
  }

  async rescheduleRequest(
    id: string,
    data: { date: string; time: string }
  ): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/requests/${id}/reschedule`, data);
    
    if (response.success) {
      await storage.removeItem(`request_${id}`);
      await storage.removeItem('user_requests');
    }
    
    return response;
  }

  async getRequestStatus(id: string): Promise<ApiResponse<{ status: string; timeline: any[] }>> {
    return api.get<{ status: string; timeline: any[] }>(`${this.BASE_PATH}/requests/${id}/status`);
  }

  async trackProvider(id: string): Promise<ApiResponse<{ latitude: number; longitude: number }>> {
    return api.get<{ latitude: number; longitude: number }>(`${this.BASE_PATH}/requests/${id}/track`);
  }

  // ==================== Bookings ====================

  async createBooking(data: {
    provider_id: string;
    service_id: string;
    scheduled_date: string;
    scheduled_time: string;
    address: string;
    description?: string;
    estimated_price?: number;
  }): Promise<ApiResponse<any>> {
    const response = await api.post<any>(`${this.BASE_PATH}/requests`, data);
    
    if (response.success) {
      // Invalidate relevant caches
      await storage.removeItem('user_requests');
    }
    
    return response;
  }

  // ==================== Reviews ====================

  async createReview(data: {
    bookingId: string;
    rating: number;
    comment?: string;
    criteriaRatings?: {
      punctuality: number;
      quality: number;
      professionalism: number;
      communication: number;
      valueForMoney: number;
    };
    isRecommended: boolean;
    isAnonymous?: boolean;
  }): Promise<ApiResponse<Review>> {
    const response = await api.post<Review>(`${this.BASE_PATH}/reviews`, data);
    
    if (response.success) {
      // Invalidate relevant caches
      await storage.removeItem(`request_${data.bookingId}`);
      await storage.removeItem('user_requests');
    }
    
    return response;
  }

  async updateReview(id: string, data: Partial<Review>): Promise<ApiResponse<Review>> {
    const response = await api.put<Review>(`${this.BASE_PATH}/reviews/${id}`, data);
    
    if (response.success) {
      await storage.removeItem(`review_${id}`);
    }
    
    return response;
  }

  async deleteReview(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<void>(`${this.BASE_PATH}/reviews/${id}`);
    
    if (response.success) {
      await storage.removeItem(`review_${id}`);
    }
    
    return response;
  }

  async getReviewForBooking(bookingId: string): Promise<ApiResponse<Review>> {
    return api.get<Review>(`${this.BASE_PATH}/reviews/booking/${bookingId}`);
  }

  async getMyReviews(): Promise<ApiResponse<Review[]>> {
    return api.get<Review[]>(`${this.BASE_PATH}/reviews/my`);
  }

  // ==================== Complaints ====================

  async createComplaint(data: {
    bookingId: string;
    subject: string;
    description: string;
    issueType: string;
    priority?: 'low' | 'medium' | 'high';
    attachments?: string[];
  }): Promise<ApiResponse<Complaint>> {
    const response = await api.post<Complaint>(`${this.BASE_PATH}/complaints`, data);
    
    if (response.success) {
      await storage.removeItem('user_complaints');
    }
    
    return response;
  }

  async getMyComplaints(): Promise<ApiResponse<Complaint[]>> {
    const cacheKey = 'user_complaints';
    const cached = await storage.getItem<Complaint[]>(cacheKey);
    
    if (cached && isValidArray<Complaint>(cached)) {
      return { success: true, data: cached };
    }
    
    const response = await api.get<Complaint[]>(`${this.BASE_PATH}/complaints`);
    
    if (response.success && response.data) {
      await storage.setItem(cacheKey, response.data);
    }
    
    return response;
  }

  async getComplaintDetails(id: string): Promise<ApiResponse<Complaint>> {
    const cacheKey = `complaint_${id}`;
    const cached = await storage.getItem<Complaint>(cacheKey);
    
    if (cached) {
      return { success: true, data: cached };
    }
    
    const response = await api.get<Complaint>(`${this.BASE_PATH}/complaints/${id}`);
    
    if (response.success && response.data) {
      await storage.setItem(cacheKey, response.data);
    }
    
    return response;
  }

  async addComplaintResponse(id: string, message: string): Promise<ApiResponse<Complaint>> {
    const response = await api.post<Complaint>(`${this.BASE_PATH}/complaints/${id}/respond`, { message });
    
    if (response.success) {
      await storage.removeItem(`complaint_${id}`);
    }
    
    return response;
  }

  // ==================== Favorites ====================

  async getFavorites(): Promise<ApiResponse<ServiceProvider[]>> {
    return api.get<ServiceProvider[]>(`${this.BASE_PATH}/favorites`);
  }

  async addFavorite(providerId: string): Promise<ApiResponse<void>> {
    const response = await api.post<void>(`${this.BASE_PATH}/favorites/${providerId}`);
    return response;
  }

  async removeFavorite(providerId: string): Promise<ApiResponse<void>> {
    const response = await api.delete<void>(`${this.BASE_PATH}/favorites/${providerId}`);
    return response;
  }

  async checkFavorite(providerId: string): Promise<ApiResponse<boolean>> {
    return api.get<boolean>(`${this.BASE_PATH}/favorites/${providerId}/check`);
  }

  // ==================== Wallet & Payment Methods ====================

  async getWalletBalance(): Promise<ApiResponse<WalletBalance>> {
    return api.get<WalletBalance>(`${this.BASE_PATH}/wallet/balance`);
  }

  // ==================== Notifications ====================

  async getNotifications(page: number = 1): Promise<ApiResponse<any[]>> {
    return api.get<any[]>(`${this.BASE_PATH}/notifications?page=${page}`);
  }

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    const response = await api.patch<void>(`${this.BASE_PATH}/notifications/${id}/read`);
    return response;
  }

  async markAllNotificationsRead(): Promise<ApiResponse<void>> {
    const response = await api.patch<void>(`${this.BASE_PATH}/notifications/read-all`);
    return response;
  }

  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    return api.get<{ count: number }>(`${this.BASE_PATH}/notifications/unread-count`);
  }

  // ==================== Dashboard ====================

  async getDashboardStats(): Promise<ApiResponse<any>> {
    return api.get<any>(`${this.BASE_PATH}/dashboard/stats`);
  }

  async getRecentActivity(limit: number = 10): Promise<ApiResponse<any[]>> {
    return api.get<any[]>(`${this.BASE_PATH}/dashboard/activity?limit=${limit}`);
  }

  // ==================== Support ====================

  async getFAQs(): Promise<ApiResponse<any[]>> {
    return api.get<any[]>('/faqs');
  }

  async contactSupport(data: {
    subject: string;
    message: string;
    attachments?: string[];
  }): Promise<ApiResponse<void>> {
    const response = await api.post<void>('/support/contact', data);
    return response;
  }

  async getSupportTickets(): Promise<ApiResponse<any[]>> {
    return api.get<any[]>('/support/tickets');
  }

  // ==================== Utility ====================

  async searchServices(query: string): Promise<ApiResponse<any[]>> {
    return api.get<any[]>(`/services/search?q=${encodeURIComponent(query)}`);
  }

  async getServiceCategories(): Promise<ApiResponse<any[]>> {
    const cacheKey = 'service_categories';
    const cached = await storage.getItem<any[]>(cacheKey);
    
    if (cached && isValidArray<any>(cached)) {
      return { success: true, data: cached };
    }
    
    const response = await api.get<any[]>('/categories');
    
    if (response.success && response.data) {
      // Cache for 24 hours
      await storage.setItem(cacheKey, response.data, 24 * 60 * 60 * 1000);
    }
    
    return response;
  }

  async getServicesByCategory(categoryId: string): Promise<ApiResponse<any[]>> {
    return api.get<any[]>(`/categories/${categoryId}/services`);
  }
}

export const customerService = new CustomerService();