// services/api.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class ApiService {
  private api: AxiosInstance;
  private baseURL = 'https://10.161.161.8/api'; // Replace with your actual backend URL

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle token expiration
          await this.refreshToken();
        }
        return Promise.reject(error);
      }
    );
  }

  private async getToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem('access_token');
    } else {
      return await SecureStore.getItemAsync('access_token');
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const refreshToken = Platform.OS === 'web' 
        ? localStorage.getItem('refresh_token')
        : await SecureStore.getItemAsync('refresh_token');

      const response = await this.api.post('/auth/refresh', {
        refresh_token: refreshToken
      });

      const { access_token, refresh_token } = response.data;
      
      if (Platform.OS === 'web') {
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
      } else {
        await SecureStore.setItemAsync('access_token', access_token);
        await SecureStore.setItemAsync('refresh_token', refresh_token);
      }
    } catch (error) {
      // Redirect to login
      // You can implement a navigation event here
    }
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<any> {
    return this.api.get('/provider/dashboard/stats');
  }

  async getServiceRequests(params?: any): Promise<any> {
    return this.api.get('/provider/service-requests', { params });
  }

  async getAppointments(params?: any): Promise<any> {
    return this.api.get('/provider/appointments', { params });
  }

  async getEarnings(params?: any): Promise<any> {
    return this.api.get('/provider/earnings', { params });
  }

  // Request management
  async acceptRequest(requestId: string): Promise<any> {
    return this.api.post(`/provider/service-requests/${requestId}/accept`);
  }

  async rejectRequest(requestId: string, reason: string): Promise<any> {
    return this.api.post(`/provider/service-requests/${requestId}/reject`, { reason });
  }

  async startService(appointmentId: string): Promise<any> {
    return this.api.post(`/provider/appointments/${appointmentId}/start`);
  }

  async completeService(appointmentId: string): Promise<any> {
    return this.api.post(`/provider/appointments/${appointmentId}/complete`);
  }

  async updateLocation(location: { latitude: number; longitude: number }): Promise<any> {
    return this.api.post('/provider/location', location);
  }

  async getNotifications(): Promise<any> {
    return this.api.get('/provider/notifications');
  }

  async markNotificationRead(notificationId: string): Promise<any> {
    return this.api.post(`/provider/notifications/${notificationId}/read`);
  }
}

export default new ApiService();