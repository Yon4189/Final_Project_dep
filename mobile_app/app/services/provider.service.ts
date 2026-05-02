// services/provider.service.ts
import { api } from './api';
import { storage } from './storage.service';
import type {
  ProviderProfile,
  ServiceRequest,
  EarningsSummary,
  Transaction,
  WithdrawalRequest,
  CustomerReview,
  Dispute,
  RequestStatus,
  BankDetails,
  ProviderNotificationPayload,
} from '@/app/types/provider.types';
import { ApiResponse } from '../types/customer.types';

/**
 * Normalizes a service request from the backend to ensure it has an 'id' property.
 * Backend models often use 'bookingID' while the frontend expects 'id'.
 */
const normalizeServiceRequest = (data: any): ServiceRequest => {
  if (!data) return data;
  return {
    ...data,
    id: data.id?.toString() || data.bookingID?.toString() || data.id,
    customerLatitude: data.customerLatitude || data.service_latitude || (data.service_city && typeof data.service_city === 'object' ? data.service_city.latitude : null),
    customerLongitude: data.customerLongitude || data.service_longitude || (data.service_city && typeof data.service_city === 'object' ? data.service_city.longitude : null),
    customerAddress: data.customerAddress || data.service_address || (typeof data.service_city === 'string' ? data.service_city : null),
  };
};

class ProviderService {
  private readonly BASE_PATH = '/provider';

  // Helper method to get provider ID from storage
  private async getProviderId(): Promise<string | null> {
    try {
      const userData = await storage.getItem('user_data');
      if (userData && typeof userData === 'string') {
        const parsed = JSON.parse(userData);
        return parsed.providerID || parsed.id || null;
      }
      
      // Also try to get from provider profile in storage
      const profileData = await storage.getItem('provider_profile');
      if (profileData && typeof profileData === 'string') {
        const parsed = JSON.parse(profileData);
        return parsed.providerID || parsed.id || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting provider ID:', error);
      return null;
    }
  }

  // ==================== Profile Management ====================

  async getProfile(): Promise<ApiResponse<ProviderProfile>> {
    const response = await api.get<ProviderProfile>(`${this.BASE_PATH}/profile`);
    
    if (response.success && response.data) {
      // Store in provider_profile
      await storage.setItem('provider_profile', response.data);
      
      // ALSO store in user_data with the same format as customer
      const userData = {
        id: (response.data as any).providerID || (response.data as any).id,
        providerID: (response.data as any).providerID,
        fullname: (response.data as any).fullname,
        businessName: (response.data as any).businessName,
        email: (response.data as any).email,
        phone: (response.data as any).phone,
        profilePicture: (response.data as any).profilePicture,
      };
      
      await storage.setItem('user_data', JSON.stringify(userData));
    }
    
    return response;
  }

  async updateProfile(data: Partial<ProviderProfile> | FormData): Promise<ApiResponse<ProviderProfile>> {
    const response = await api.post<ProviderProfile>(`${this.BASE_PATH}/profile/update`, data);
    
    if (response.success && response.data) {
      await storage.setItem('provider_profile', response.data);
    }
    
    return response;
  }

  async updateAvailability(isAvailable: boolean): Promise<ApiResponse<ProviderProfile>> {
    const response = await api.patch<ProviderProfile>(`${this.BASE_PATH}/availability`, { isAvailable });
    return response;
  }

  async getSchedule(): Promise<ApiResponse<any[]>> {
    return api.get<any[]>(`${this.BASE_PATH}/schedule`);
  }

  async updateSchedule(schedule: any[]): Promise<ApiResponse<void>> {
    return api.post<void>(`${this.BASE_PATH}/schedule`, { schedule });
  }

  async uploadProfileImage(formData: FormData): Promise<ApiResponse<{ url: string }>> {
    return api.upload<{ url: string }>(`${this.BASE_PATH}/profile/image`, formData);
  }

  async uploadCoverImage(formData: FormData): Promise<ApiResponse<{ url: string }>> {
    return api.upload<{ url: string }>(`${this.BASE_PATH}/profile/cover`, formData);
  }

  // ==================== Service Requests ====================

  async getRequests(status?: RequestStatus): Promise<ApiResponse<ServiceRequest[]>> {
    const url = status 
      ? `${this.BASE_PATH}/requests?status=${status}` 
      : `${this.BASE_PATH}/requests`;
    
    const response = await api.get<ServiceRequest[]>(url);
    if (response.success && Array.isArray(response.data)) {
      response.data = response.data.map(normalizeServiceRequest);
    }
    return response;
  }

  async getRequestDetails(id: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.get<ServiceRequest>(`${this.BASE_PATH}/requests/${id}`);
    if (response.success && response.data) {
      response.data = normalizeServiceRequest(response.data);
    }
    return response;
  }

  async acceptRequest(id: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/bookings/${id}/accept`);
    if (response.success && response.data) {
      response.data = normalizeServiceRequest(response.data);
    }
    return response;
  }

  async rejectRequest(id: string, reason: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/bookings/${id}/reject`, { reason });
    if (response.success && response.data) {
      response.data = normalizeServiceRequest(response.data);
    }
    return response;
  }

  async rescheduleRequest(id: string, data: {
    scheduledDate: string;
    scheduledTime: string;
    reason?: string;
  }): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/requests/${id}/reschedule`, data);
    if (response.success && response.data) {
      response.data = normalizeServiceRequest(response.data);
    }
    return response;
  }

  async startService(id: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/bookings/${id}/start`);
    if (response.success && response.data) {
      response.data = normalizeServiceRequest(response.data);
    }
    return response;
  }

  async arriveService(id: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/bookings/${id}/arrive`);
    if (response.success && response.data) {
      response.data = normalizeServiceRequest(response.data);
    }
    return response;
  }

  async completeService(id: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/bookings/${id}/complete`);
    if (response.success && response.data) {
      response.data = normalizeServiceRequest(response.data);
    }
    return response;
  }

  async getDirectionsToCustomer(id: string): Promise<ApiResponse<{
    distance: number;
    duration: number;
    polyline: string;
    steps: any[];
  }>> {
    return api.get<{
      distance: number;
      duration: number;
      polyline: string;
      steps: any[];
    }>(`${this.BASE_PATH}/requests/${id}/directions`);
  }

  // ==================== Earnings & Wallet ====================

  async getEarningsSummary(): Promise<ApiResponse<EarningsSummary>> {
    return api.get<EarningsSummary>(`${this.BASE_PATH}/earnings/summary`);
  }

  async getTransactions(page: number = 1): Promise<ApiResponse<{
    transactions: Transaction[];
    total: number;
    hasMore: boolean;
    page?: number;
  }>> {
    return api.get<{
      transactions: Transaction[];
      total: number;
      hasMore: boolean;
      page?: number;
    }>(`${this.BASE_PATH}/transactions?page=${page}`);
  }

  async getWithdrawalHistory(): Promise<ApiResponse<WithdrawalRequest[]>> {
    return api.get<WithdrawalRequest[]>(`${this.BASE_PATH}/withdrawals`);
  }

  async getWalletTransactions(params?: { transaction_type?: string; transaction_status?: string; page?: number }): Promise<ApiResponse<any>> {
    const query = new URLSearchParams();
    if (params?.transaction_type) query.append('transaction_type', params.transaction_type);
    if (params?.transaction_status) query.append('transaction_status', params.transaction_status);
    if (params?.page) query.append('page', String(params.page));
    return api.get<any>(`${this.BASE_PATH}/wallet/transactions?${query.toString()}`);
  }

  async getWalletDashboard(): Promise<ApiResponse<any>> {
    return api.get<any>(`${this.BASE_PATH}/wallet`);
  }

  async requestWithdrawal(data: {
    amount: number;
    payment_method: 'bank' | 'telebir';
    bank_name?: string;
    account_number?: string;
    account_holder_name?: string;
    telebir_number?: string;
    telebir_holder_name?: string;
  }): Promise<ApiResponse<WithdrawalRequest>> {
    const response = await api.post<WithdrawalRequest>(`${this.BASE_PATH}/wallet/withdraw`, data);
    return response;
  }

  async getBankDetails(): Promise<ApiResponse<BankDetails>> {
    return api.get<BankDetails>(`${this.BASE_PATH}/bank-details`);
  }

  async updateBankDetails(data: Partial<BankDetails>): Promise<ApiResponse<BankDetails>> {
    const response = await api.put<BankDetails>(`${this.BASE_PATH}/bank-details`, data);
    return response;
  }

  // ==================== Bank Accounts ====================

  async getBankAccounts(): Promise<ApiResponse<BankDetails[]>> {
    return api.get<BankDetails[]>(`${this.BASE_PATH}/bank-accounts`);
  }

  async saveBankAccount(data: Partial<BankDetails>): Promise<ApiResponse<BankDetails>> {
    const response = await api.post<BankDetails>(`${this.BASE_PATH}/bank-accounts`, data);
    return response;
  }

  async updateBankAccount(id: string, data: Partial<BankDetails>): Promise<ApiResponse<BankDetails>> {
    const response = await api.put<BankDetails>(`${this.BASE_PATH}/bank-accounts/${id}`, data);
    return response;
  }

  async deleteBankAccount(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<void>(`${this.BASE_PATH}/bank-accounts/${id}`);
    return response;
  }

  // ==================== Reviews ====================

  async getReviews(page: number = 1): Promise<ApiResponse<{
    reviews: CustomerReview[];
    averageRating: number;
    total: number;
    ratingDistribution: Record<number, number>;
  }>> {
    return api.get<{
      reviews: CustomerReview[];
      averageRating: number;
      total: number;
      ratingDistribution: Record<number, number>;
    }>(`${this.BASE_PATH}/reviews?page=${page}`);
  }

  async respondToReview(reviewId: string, message: string): Promise<ApiResponse<CustomerReview>> {
    const response = await api.post<CustomerReview>(`${this.BASE_PATH}/reviews/${reviewId}/respond`, { message });
    return response;
  }

  // ==================== Disputes ====================

  async getDisputes(status?: string): Promise<ApiResponse<Dispute[]>> {
    const url = status && status !== 'all' 
      ? `${this.BASE_PATH}/disputes?status=${status}` 
      : `${this.BASE_PATH}/disputes`;
      
    const response = await api.get<any>(url);
    if (response.success && response.data) {
      // Extract the array from either a paginated response or a flat data response
      const items = Array.isArray(response.data.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []);
      
      // Normalize disputes: map disputeID → id
      response.data = items.map((dispute: any) => ({
        ...dispute,
        id: dispute.id || dispute.disputeID?.toString(),
        disputeNumber: dispute.disputeNumber || dispute.disputeID?.toString(),
      }));
    }
    return response as ApiResponse<Dispute[]>;
  }

  async getDisputeDetails(id: string): Promise<ApiResponse<Dispute>> {
    const response = await api.get<any>(`${this.BASE_PATH}/disputes/${id}`);
    if (response.success && response.data) {
      // Normalize dispute: map disputeID → id
      response.data = {
        ...response.data,
        id: response.data.id || response.data.disputeID?.toString(),
        disputeNumber: response.data.disputeNumber || response.data.disputeID?.toString(),
      };
    }
    return response as ApiResponse<Dispute>;
  }

  async createDispute(data: {
    bookingId: string;
    reason: string;
    description: string;
    evidence?: string[];
  }): Promise<ApiResponse<Dispute>> {
    const response = await api.post<Dispute>(`${this.BASE_PATH}/disputes`, data);
    return response;
  }

  async addDisputeEvidence(id: string, evidence: string[]): Promise<ApiResponse<Dispute>> {
    const response = await api.post<Dispute>(`${this.BASE_PATH}/disputes/${id}/evidence`, { evidence });
    return response;
  }

  async addDisputeMessage(id: string, message: string): Promise<ApiResponse<any>> {
    const response = await api.post<any>(`${this.BASE_PATH}/disputes/${id}/messages`, { message });
    return response;
  }

  async getDisputeMessages(id: string): Promise<ApiResponse<any[]>> {
    const response = await api.get<any[]>(`${this.BASE_PATH}/disputes/${id}/messages`);
    return response;
  }

  async clearDisputeHistory(id: string): Promise<ApiResponse<any>> {
    const response = await api.delete<any>(`${this.BASE_PATH}/disputes/${id}/clear-history`);
    return response;
  }

  async deleteDisputeMessage(disputeId: string, messageId: string): Promise<ApiResponse<any>> {
    const response = await api.delete<any>(`${this.BASE_PATH}/disputes/${disputeId}/messages/${messageId}`);
    return response;
  }

  // ==================== Services Management ====================

  async getMyServices(): Promise<ApiResponse<any[]>> {
    return api.get<any[]>(`${this.BASE_PATH}/services`);
  }

  async addService(data: Omit<any, 'id'>): Promise<ApiResponse<any>> {
    const response = await api.post<any>(`${this.BASE_PATH}/services`, data);
    return response;
  }

  async updateService(id: string, data: Partial<any>): Promise<ApiResponse<any>> {
    const response = await api.put<any>(`${this.BASE_PATH}/services/${id}`, data);
    return response;
  }

  async toggleServiceStatus(id: string, isActive: boolean): Promise<ApiResponse<any>> {
    const response = await api.patch<any>(`${this.BASE_PATH}/services/${id}/toggle`, { isActive });
    return response;
  }

  async deleteService(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<void>(`${this.BASE_PATH}/services/${id}`);
    return response;
  }

  // ==================== Tracking ====================

  async updateLocation(data: {
    bookingID: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
  }): Promise<ApiResponse<any>> {
    return api.post<any>(`${this.BASE_PATH}/tracking/update`, data);
  }

  // ==================== Dashboard Stats ====================

  async getDashboardStats(): Promise<ApiResponse<{
    pendingRequests: number;
    todayJobs: number;
    weeklyEarnings: number;
    rating: number;
    completionRate: number;
    responseRate: number;
  }>> {
    // Get the authenticated provider ID from storage
    const providerId = await this.getProviderId();
    
    if (!providerId) {
      // If no provider ID found, try to get profile first
      try {
        const profileResponse = await this.getProfile();
        if (profileResponse.success && profileResponse.data) {
          const id = (profileResponse.data as any).providerID || (profileResponse.data as any).id;
          if (id) {
            return api.get<{
              pendingRequests: number;
              todayJobs: number;
              weeklyEarnings: number;
              rating: number;
              completionRate: number;
              responseRate: number;
            }>(`${this.BASE_PATH}/dashboard/stats?providerID=${id}`);
          }
        }
      } catch (error) {
        console.error('Error fetching profile for provider ID:', error);
      }
      
      // If still no ID, return error
      return {
        success: false,
        message: 'Provider ID not found. Please log in again.',
        data: {
          pendingRequests: 0,
          todayJobs: 0,
          weeklyEarnings: 0,
          rating: 0,
          completionRate: 0,
          responseRate: 0,
        }
      };
    }
    
    return api.get<{
      pendingRequests: number;
      todayJobs: number;
      weeklyEarnings: number;
      rating: number;
      completionRate: number;
      responseRate: number;
    }>(`${this.BASE_PATH}/dashboard/stats?providerID=${providerId}`);
  }

  async getTodaySchedule(): Promise<ApiResponse<ServiceRequest[]>> {
    const response = await api.get<ServiceRequest[]>(`${this.BASE_PATH}/schedule/today`);
    if (response.success && Array.isArray(response.data)) {
      response.data = response.data.map(normalizeServiceRequest);
    }
    return response;
  }

  async getNotifications(page: number = 1): Promise<ApiResponse<{
    notifications: {
      current_page: number;
      data: ProviderNotificationPayload[];
      per_page: number;
      total: number;
      last_page: number;
    };
    unread_count: number;
  }>> {
    return api.get(`${this.BASE_PATH}/notifications?page=${page}`);
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return api.post(`${this.BASE_PATH}/notifications/${notificationId}/read`);
  }

  async markAllAsRead(): Promise<ApiResponse<void>> {
    return api.post(`${this.BASE_PATH}/notifications/read-all`);
  }
}

export const providerService = new ProviderService();
