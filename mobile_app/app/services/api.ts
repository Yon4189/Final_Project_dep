// services/api.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Network from 'expo-network';
import Constants from 'expo-constants';
import type { ApiResponse } from '../types/customer.types';
import { API_BASE_URL as CONFIG_BASE_URL } from '../config/api';

// API Configuration
const API_BASE_URL = CONFIG_BASE_URL;
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Token storage keys - Separate for different user types
const PROVIDER_TOKEN_KEY = 'provider_token';
const CUSTOMER_TOKEN_KEY = 'customer_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_TYPE_KEY = 'user_type';
const USER_KEY = 'user_data';

// Event types for API events
type ApiEventType = 'token_refreshed' | 'unauthorized' | 'network_error' | 'server_error';
type ApiEventListener = (event: ApiEventType, data?: any) => void;

class ApiService {
  private api: AxiosInstance;
  private providerToken: string | null = null;
  private customerToken: string | null = null;
  private refreshToken: string | null = null;
  private userType: 'provider' | 'customer' | null = null;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
    config: AxiosRequestConfig;
  }> = [];
  private listeners: ApiEventListener[] = [];

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Platform': Platform.OS,
        'X-App-Version': Constants.expoConfig?.version || '1.0.0',
        'X-App-Build': Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
      },
    });

    this.setupInterceptors();
    this.loadStoredToken();
  }

  // Event handling
  public addEventListener(listener: ApiEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emitEvent(event: ApiEventType, data?: any): void {
    this.listeners.forEach(listener => listener(event, data));
  }

  // Token management
  private async loadStoredToken(): Promise<void> {
    try {
      // Try to load provider token first
      this.providerToken = await SecureStore.getItemAsync(PROVIDER_TOKEN_KEY);

      // If no provider token, try customer token
      if (!this.providerToken) {
        this.customerToken = await SecureStore.getItemAsync(CUSTOMER_TOKEN_KEY);
      }

      this.refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      this.userType = await SecureStore.getItemAsync(USER_TYPE_KEY) as 'provider' | 'customer' | null;
    } catch (error) {
      console.warn('Failed to load stored token:', error);
    }
  }

  public async setProviderToken(token: string, refreshToken?: string): Promise<void> {
    this.providerToken = token;
    this.customerToken = null; // Clear customer token
    this.userType = 'provider';

    if (refreshToken) {
      this.refreshToken = refreshToken;
    }

    try {
      await SecureStore.setItemAsync(PROVIDER_TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_TYPE_KEY, 'provider');

      // Clear customer token if exists
      await SecureStore.deleteItemAsync(CUSTOMER_TOKEN_KEY);

      if (refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch (error) {
      console.warn('Failed to store provider token:', error);
    }
  }

  public async setCustomerToken(token: string, refreshToken?: string): Promise<void> {
    this.customerToken = token;
    this.providerToken = null; // Clear provider token
    this.userType = 'customer';

    if (refreshToken) {
      this.refreshToken = refreshToken;
    }

    try {
      await SecureStore.setItemAsync(CUSTOMER_TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_TYPE_KEY, 'customer');

      // Clear provider token if exists
      await SecureStore.deleteItemAsync(PROVIDER_TOKEN_KEY);

      if (refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch (error) {
      console.warn('Failed to store customer token:', error);
    }
  }

  public async removeToken(): Promise<void> {
    this.providerToken = null;
    this.customerToken = null;
    this.refreshToken = null;
    this.userType = null;

    try {
      await SecureStore.deleteItemAsync(PROVIDER_TOKEN_KEY);
      await SecureStore.deleteItemAsync(CUSTOMER_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_TYPE_KEY);
    } catch (error) {
      console.warn('Failed to remove token:', error);
    }
  }

  public getToken(): string | null {
    // Return the appropriate token based on user type
    if (this.userType === 'provider') {
      return this.providerToken;
    }
    return this.customerToken;
  }

  public getUserType(): string | null {
    return this.userType;
  }

  // User data management
  public async setUserData(userData: any): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.warn('Failed to store user data:', error);
    }
  }

  public async getUserData(): Promise<any | null> {
    try {
      const data = await SecureStore.getItemAsync(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to load user data:', error);
      return null;
    }
  }

  public async removeUserData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.warn('Failed to remove user data:', error);
    }
  }

  // Network check
  private async checkNetwork(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.isConnected ?? false;
    } catch {
      return false;
    }
  }

  // Token refresh - Updated to use correct endpoint
  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) return null;

    try {
      const endpoint = this.userType === 'provider' 
        ? '/provider/refresh-token' 
        : '/customer/refresh-token';
      
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        refresh_token: this.refreshToken,
      });

      if (response.data.success && response.data.data?.token) {
        const { token, refresh_token } = response.data.data;

        // Set the appropriate token based on user type
        if (this.userType === 'provider') {
          await this.setProviderToken(token, refresh_token);
        } else {
          await this.setCustomerToken(token, refresh_token);
        }

        return token;
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  // Request queue processing
  private processQueue(error: Error | null, token: string | null = null): void {
    this.failedQueue.forEach(({ resolve, reject, config }) => {
      if (error) {
        reject(error);
      } else if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        resolve(this.api(config));
      }
    });

    this.failedQueue = [];
    this.isRefreshing = false;
  }

  // Interceptors setup
  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        // Add token to headers
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Log request in development
        if (__DEV__) {
          console.log('🚀 API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            params: config.params,
            userType: this.userType,
          });
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        // Log response in development
        if (__DEV__) {
          console.log('✅ API Response:', {
            url: response.config.url,
            status: response.status,
            success: response.data?.success,
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalConfig = error.config;

        // Log error in development
        if (__DEV__) {
          console.error('❌ API Error:', {
            url: originalConfig?.url,
            status: error.response?.status,
            message: error.message,
          });
        }

        // Handle network errors
        if (!error.response) {
          const isConnected = await this.checkNetwork();
          if (!isConnected) {
            this.emitEvent('network_error');
            return Promise.reject(new Error('No internet connection'));
          }
          this.emitEvent('server_error');
          return Promise.reject(new Error('Network error. Please try again.'));
        }

        const { status, data } = error.response;

        // Handle 400 Bad Request & 422 Unprocessable Entity
        if (status === 400 || status === 422) {
          // Return the error response data so it can be handled by the caller
          return Promise.reject({
            response: error.response,
            message: (data as any)?.message || (status === 400 ? 'Bad request.' : 'Validation failed.'),
            errors: (data as any)?.errors
          });
        }

        // Handle 401 Unauthorized
        if (status === 401 && originalConfig) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.emitEvent('unauthorized');

            try {
              const newToken = await this.refreshAccessToken();

              if (newToken) {
                this.processQueue(null, newToken);
                this.emitEvent('token_refreshed');

                // Retry original request with new token
                if (originalConfig.headers) {
                  originalConfig.headers.Authorization = `Bearer ${newToken}`;
                }
                return this.api(originalConfig);
              } else {
                this.processQueue(new Error('Refresh failed'));
                await this.removeToken();
                return Promise.reject(new Error('Session expired. Please login again.'));
              }
            } catch (refreshError) {
              this.processQueue(refreshError as Error);
              await this.removeToken();
              return Promise.reject(new Error('Session expired. Please login again.'));
            }
          } else {
            // Add to queue while token is being refreshed
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject, config: originalConfig });
            });
          }
        }

        // Handle 403 Forbidden
        if (status === 403) {
          return Promise.reject(new Error('You do not have permission to access this resource.'));
        }

        // Handle 404 Not Found
        if (status === 404) {
          return Promise.reject(new Error('The requested resource was not found.'));
        }

        // Handle other status codes
        const errorMessage = this.getErrorMessage(error);
        const richError: any = new Error(errorMessage);
        richError.responseData = error.response?.data;
        richError.statusCode = error.response?.status;
        return Promise.reject(richError);
      }
    );
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get user-friendly error message
  private getErrorMessage(error: AxiosError): string {
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      if (data.message) return data.message;
      if (data.error) return data.error;
    }

    switch (error.response?.status) {
      case 400:
        return 'Bad request. Please check your input.';
      case 401:
        return 'Unauthorized. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 422:
        return 'Validation error. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  // Request methods with retry logic
  private async requestWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<ApiResponse<T>>>,
    retries = MAX_RETRIES
  ): Promise<ApiResponse<T>> {
    try {
      const response = await requestFn();
      return response.data;
    } catch (error: any) {
      // Don't retry 400 errors - they are client errors
      if (error.response?.status === 400 || error.response?.status === 422) {
        throw error;
      }

      if (retries > 0 && this.shouldRetry(error)) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.requestWithRetry(requestFn, retries - 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors or 5xx server errors
    return !error.response || (error.response?.status >= 500 && error.response?.status <= 599);
  }

  // Public API methods
  public async get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.requestWithRetry(() => this.api.get<ApiResponse<T>>(url, config));
  }

  public async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.requestWithRetry(() => this.api.post<ApiResponse<T>>(url, data, config));
  }

  public async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.requestWithRetry(() => this.api.put<ApiResponse<T>>(url, data, config));
  }

  public async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.requestWithRetry(() => this.api.patch<ApiResponse<T>>(url, data, config));
  }

  public async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.requestWithRetry(() => this.api.delete<ApiResponse<T>>(url, config));
  }

  // File upload with progress
  public async upload<T>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = (progressEvent.loaded * 100) / progressEvent.total;
          onProgress(Math.round(progress));
        }
      },
    };

    return this.post<T>(url, formData, config);
  }

  // Clear all stored data (logout)
  public async clearAll(): Promise<void> {
    await this.removeToken();
    await this.removeUserData();
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return !!(this.providerToken || this.customerToken);
  }

  // Get auth headers
  public getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

// Export singleton instance
export const api = new ApiService();

// Export utility functions
export const setupApi = () => {
  // Add any additional setup here
};

export default api;