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
} from '@/app/types/provider.types';
import type { ApiResponse } from '../types/customer.types';

class ProviderService {
  private readonly BASE_PATH = '/provider';

  // Helper method to get provider ID from storage
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
  console.log('🔍 Fetching provider profile...'); // Add debug log
  
  const response = await api.get<ProviderProfile>(`${this.BASE_PATH}/profile`);
  
  console.log('🔍 Profile API response:', response); // Add debug log
  
  if (response.success && response.data) {
    console.log('🔍 Profile data received:', response.data); // Add debug log
    
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
    
    console.log('🔍 Storing user_data:', userData); // Add debug log
    await storage.setItem('user_data', JSON.stringify(userData));
  }
  
  return response;
}
  async updateProfile(data: Partial<ProviderProfile>): Promise<ApiResponse<ProviderProfile>> {
    const response = await api.put<ProviderProfile>(`${this.BASE_PATH}/profile`, data);
    
    if (response.success && response.data) {
      await storage.setItem('provider_profile', response.data);
    }
    
    return response;
  }

  async updateAvailability(isAvailable: boolean): Promise<ApiResponse<ProviderProfile>> {
    const response = await api.patch<ProviderProfile>(`${this.BASE_PATH}/availability`, { isAvailable });
    return response;
  }

  async updateWorkingHours(workingHours: any): Promise<ApiResponse<ProviderProfile>> {
    const response = await api.put<ProviderProfile>(`${this.BASE_PATH}/working-hours`, workingHours);
    return response;
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
    
    return api.get<ServiceRequest[]>(url);
  }

  async getRequestDetails(id: string): Promise<ApiResponse<ServiceRequest>> {
    return api.get<ServiceRequest>(`${this.BASE_PATH}/requests/${id}`);
  }

  async acceptRequest(id: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/requests/${id}/accept`);
    return response;
  }

  async rejectRequest(id: string, reason: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/requests/${id}/reject`, { reason });
    return response;
  }

  async rescheduleRequest(id: string, data: {
    scheduledDate: string;
    scheduledTime: string;
    reason?: string;
  }): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/requests/${id}/reschedule`, data);
    return response;
  }

  async startService(id: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/requests/${id}/start`);
    return response;
  }

  async completeService(id: string): Promise<ApiResponse<ServiceRequest>> {
    const response = await api.post<ServiceRequest>(`${this.BASE_PATH}/requests/${id}/complete`);
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

  async requestWithdrawal(data: {
    amount: number;
    bankDetailsId?: string;
  }): Promise<ApiResponse<WithdrawalRequest>> {
    const response = await api.post<WithdrawalRequest>(`${this.BASE_PATH}/withdrawals`, data);
    return response;
  }

  async getBankDetails(): Promise<ApiResponse<BankDetails>> {
    return api.get<BankDetails>(`${this.BASE_PATH}/bank-details`);
  }

  async updateBankDetails(data: Partial<BankDetails>): Promise<ApiResponse<BankDetails>> {
    const response = await api.put<BankDetails>(`${this.BASE_PATH}/bank-details`, data);
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

  async getDisputes(): Promise<ApiResponse<Dispute[]>> {
    return api.get<Dispute[]>(`${this.BASE_PATH}/disputes`);
  }

  async getDisputeDetails(id: string): Promise<ApiResponse<Dispute>> {
    return api.get<Dispute>(`${this.BASE_PATH}/disputes/${id}`);
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

  // ==================== Services Management ====================

  async getMyServices(): Promise<ApiResponse<ProviderService[]>> {
    return api.get<ProviderService[]>(`${this.BASE_PATH}/services`);
  }

  async addService(data: Omit<ProviderService, 'id'>): Promise<ApiResponse<ProviderService>> {
    const response = await api.post<ProviderService>(`${this.BASE_PATH}/services`, data);
    return response;
  }

  async updateService(id: string, data: Partial<ProviderService>): Promise<ApiResponse<ProviderService>> {
    const response = await api.put<ProviderService>(`${this.BASE_PATH}/services/${id}`, data);
    return response;
  }

  async toggleServiceStatus(id: string, isActive: boolean): Promise<ApiResponse<ProviderService>> {
    const response = await api.patch<ProviderService>(`${this.BASE_PATH}/services/${id}/toggle`, { isActive });
    return response;
  }

  async deleteService(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<void>(`${this.BASE_PATH}/services/${id}`);
    return response;
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
    return api.get<ServiceRequest[]>(`${this.BASE_PATH}/schedule/today`);
  }
}

export const providerService = new ProviderService();