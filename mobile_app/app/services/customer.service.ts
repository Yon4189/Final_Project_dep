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
    console.log('[CustomerService] searchProviders called with filters:', filters);
    
    const params = new URLSearchParams();
    
    const searchQuery = filters.query || (filters as any).q;
    if (searchQuery) params.append('q', searchQuery);
    if (filters.categoryId) params.append('category_id', filters.categoryId);
    if (filters.serviceId) params.append('service_id', filters.serviceId);
    if (filters.minRating) params.append('min_rating', filters.minRating.toString());
    if (filters.maxDistance) params.append('max_distance', filters.maxDistance.toString());
    
    // Support both nested object and flattened params
    const pMin = filters.priceRange?.min ?? (filters as any).price_min;
    const pMax = filters.priceRange?.max ?? (filters as any).price_max;
    
    if (pMin !== undefined && pMin !== null) params.append('price_min', pMin.toString());
    if (pMax !== undefined && pMax !== null) params.append('price_max', pMax.toString());
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
        console.log('[CustomerService] Added location to search:', { lat: location.latitude, lng: location.longitude });
      } else {
        console.log('[CustomerService] No valid location available for search');
      }
    } catch (error) {
      console.warn('Failed to get location from storage:', error);
      // Continue without location params
    }

    const url = `${this.BASE_PATH}/providers/search?${params.toString()}`;
    console.log('[CustomerService] Calling API:', url);
    
    const response = await api.get<ServiceProvider[]>(url);
    console.log('[CustomerService] Search response:', { success: response.success, dataLength: response.data?.length });
    
    return response;
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
    console.log(`[CustomerService] getTopRatedProviders called with limit: ${limit}`);
    
    const cacheKey = `top_rated_providers_${limit}`;
    const cached = await storage.getItem<ServiceProvider[]>(cacheKey);
    
    if (cached && isValidArray<ServiceProvider>(cached)) {
      console.log(`[CustomerService] Returning cached top rated providers:`, cached.length);
      return { success: true, data: cached };
    }
    
    console.log(`[CustomerService] Fetching top rated providers from API...`);
    const response = await api.get<ServiceProvider[]>(
      `${this.BASE_PATH}/providers/top-rated?limit=${limit}`
    );
    
    console.log(`[CustomerService] API response:`, {
      success: response.success,
      dataLength: response.data?.length,
      data: response.data
    });
    
    if (response.success && response.data) {
      // Cache for 1 hour
      await storage.setItem(cacheKey, response.data, 60 * 60 * 1000);
      console.log(`[CustomerService] Cached ${response.data.length} providers`);
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

  async confirmBookingCompletion(bookingId: string): Promise<ApiResponse<any>> {
    const response = await api.post<any>(`${this.BASE_PATH}/bookings/${bookingId}/confirm`);
    
    if (response.success) {
      // Invalidate relevant caches
      await storage.removeItem(`request_${bookingId}`);
      await storage.removeItem('user_requests');
    }
    
    return response;
  }

  // ==================== Bookings ====================

  async createBooking(data: {
    providerID: string;
    serviceID: string;
    scheduledDate: string;
    agreed_price: number;
    location_source: 'gps' | 'saved' | 'new';
    latitude?: number;
    longitude?: number;
    full_address?: string;
    saved_address_id?: string;
    notes?: string;
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

  async submitBookingReview(bookingID: string, data: {
    rating: number;
    comment?: string;
    is_anonymous?: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await api.post<any>(`${this.BASE_PATH}/bookings/${bookingID}/review`, data);
    
    if (response.success) {
      await storage.removeItem(`request_${bookingID}`);
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
    bookingId?: string;
    booking_id?: string;
    provider_id?: string;
    subject?: string;
    description: string;
    issueType?: string;
    type?: string;
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
    
    const response = await api.get<any[]>(`${this.BASE_PATH}/complaints`);
    
    if (response.success && response.data) {
      // Normalize: map disputeID → id for frontend consistency
      const normalized = (response.data as any[]).map((item: any) => ({
        ...item,
        id: item.id || item.disputeID?.toString() || item.complaintID?.toString(),
        complaintNumber: item.complaintNumber || item.disputeID?.toString(),
        subject: item.subject || item.title,
        description: item.description,
        status: item.status,
        createdAt: item.createdAt || item.created_at,
        resolvedAt: item.resolvedAt || item.resolved_at,
        providerName: item.providerName || item.against?.fullname || item.booking?.provider?.fullname || 'Provider',
        providerImage: item.providerImage || item.against?.profilePicture || item.booking?.provider?.profilePicture,
      }));
      await storage.setItem(cacheKey, normalized);
      return { success: true, data: normalized };
    }
    
    return response;
  }

  async getComplaintDetails(id: string): Promise<ApiResponse<Complaint>> {
    const response = await api.get<any>(`${this.BASE_PATH}/complaints/${id}`);
    
    if (response.success && response.data) {
      const item = response.data as any;
      const normalized = {
        ...item,
        id: item.id || item.disputeID?.toString(),
        complaintNumber: item.complaintNumber || item.disputeID?.toString(),
        subject: item.subject || item.title,
        createdAt: item.createdAt || item.created_at,
        resolvedAt: item.resolvedAt || item.resolved_at,
        rejectedAt: item.rejectedAt || item.rejected_at,
        providerName: item.providerName || item.against?.fullname || item.booking?.provider?.fullname || 'Provider',
        providerImage: item.providerImage || item.against?.profilePicture || item.booking?.provider?.profilePicture,
        bookingId: item.bookingId || item.bookingID?.toString(),
        responses: item.responses || item.messages?.filter((m: any) => m.sender_type === 'admin') || [],
        userResponses: item.userResponses || item.messages?.filter((m: any) => m.sender_type === 'customer') || [],
      };
      return { success: true, data: normalized };
    }
    
    return response;
  }

  async addComplaintResponse(id: string, message: string): Promise<ApiResponse<any>> {
    const response = await api.post<any>(`${this.BASE_PATH}/complaints/${id}/messages`, { message });
    return response;
  }

  async getComplaintMessages(id: string): Promise<ApiResponse<any[]>> {
    const response = await api.get<any[]>(`${this.BASE_PATH}/complaints/${id}/messages`);
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

  async getNotifications(page: number = 1): Promise<ApiResponse<{
    notifications: {
      current_page: number;
      data: any[];
      last_page: number;
      total: number;
    };
    unread_count: number;
  }>> {
    return api.get(`${this.BASE_PATH}/notifications?page=${page}`);
  }

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    const response = await api.patch<void>(`${this.BASE_PATH}/notifications/${id}/read`);
    return response;
  }

  async markAllNotificationsRead(): Promise<ApiResponse<void>> {
    const response = await api.patch<void>(`${this.BASE_PATH}/notifications/read-all`);
    return response;
  }

  async getUnreadCount(): Promise<ApiResponse<{ unread_count: number }>> {
    return api.get<{ unread_count: number }>(`${this.BASE_PATH}/notifications/unread-count`);
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