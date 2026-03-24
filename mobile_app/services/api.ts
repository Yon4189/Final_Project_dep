// mobile_app/services/api.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL, refreshApiBaseUrl, getNetworkState } from '../config/api';
import * as Network from 'expo-network';

console.log('Initial API_BASE_URL:', API_BASE_URL);

// Token key
const TOKEN_KEY = 'user_token';

// Platform-specific storage
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') return localStorage.getItem(key);
        return SecureStore.getItemAsync(key);
    },
    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') return localStorage.setItem(key, value);
        return SecureStore.setItemAsync(key, value);
    },
    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') return localStorage.removeItem(key);
        return SecureStore.deleteItemAsync(key);
    },
};

// Custom error class for validation errors
export class ValidationError extends Error {
    public validationErrors: Record<string, string[]>;
    public status: number;
    public data: any;

    constructor(message: string, validationErrors: Record<string, string[]>, status: number, data: any) {
        super(message);
        this.name = 'ValidationError';
        this.validationErrors = validationErrors;
        this.status = status;
        this.data = data;
    }
}

class ApiService {
    private api: AxiosInstance;
    private token: string | null = null;
    private currentBaseURL: string = API_BASE_URL;
    private refreshInProgress: boolean = false;
    private userData: any = null;

    constructor() {
        this.api = axios.create({
            baseURL: this.currentBaseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Platform': Platform.OS,
                'X-App-Version': Constants.expoConfig?.version || '1.0.0',
            },
        });

        // Attach token automatically to requests
        this.api.interceptors.request.use(async (config) => {
            const token = this.token || (await storage.getItem(TOKEN_KEY));
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // Attach user type header
            if (this.userData?.user_type && config.headers) {
                config.headers['X-User-Type'] = this.userData.user_type;
            }

            // Log request data for debugging (optional, remove in production)
            if (config.data) {
                console.log(`📤 ${config.method?.toUpperCase()} ${config.url}:`,
                    typeof config.data === 'string' ? JSON.parse(config.data) : config.data);
            }

            return config;
        });

        // Add response interceptor for handling errors
        this.api.interceptors.response.use(
            (response) => {
                // Log success response for debugging
                console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}:`,
                    response.status);
                return response;
            },
            async (error) => {
                // Log the full error for debugging
                console.error('❌ API Error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    url: error.config?.url,
                    method: error.config?.method,
                    data: error.response?.data,
                    requestData: error.config?.data ?
                        (typeof error.config.data === 'string' ?
                            JSON.parse(error.config.data) : error.config.data) : null
                });

                // Handle validation errors (422)
                if (error.response?.status === 422) {
                    const responseData = error.response.data;

                    // Log validation errors in a readable format
                    if (responseData.errors) {
                        console.error('📋 VALIDATION ERRORS:');
                        Object.keys(responseData.errors).forEach(field => {
                            console.error(`   ${field}: ${responseData.errors[field].join(', ')}`);
                        });
                    }

                    // Create a custom validation error
                    const validationError = new ValidationError(
                        responseData.message || 'Validation failed',
                        responseData.errors || {},
                        error.response.status,
                        responseData
                    );

                    return Promise.reject(validationError);
                }

                // Check if it's a network error
                if (this.isNetworkError(error)) {
                    console.log('🌐 Network error detected, attempting to refresh base URL...');

                    // Prevent multiple simultaneous refresh attempts
                    if (!this.refreshInProgress) {
                        this.refreshInProgress = true;
                        try {
                            const newBaseUrl = await refreshApiBaseUrl();
                            if (newBaseUrl !== this.currentBaseURL) {
                                console.log(`🔄 Updating API base URL to ${newBaseUrl}`);
                                this.currentBaseURL = newBaseUrl;
                                this.api.defaults.baseURL = newBaseUrl;
                            }

                            // Retry the original request with new baseURL
                            if (error.config) {
                                error.config.baseURL = this.currentBaseURL;
                                console.log('🔄 Retrying request with new base URL...');
                                return this.api.request(error.config);
                            }
                        } catch (refreshError) {
                            console.warn('⚠️ Failed to refresh base URL:', refreshError);
                        } finally {
                            this.refreshInProgress = false;
                        }
                    }
                }

                return Promise.reject(error);
            }
        );

        this.loadToken();
        // Try to get the correct IP on startup
        this.initializeConnection();
    }

    // Initialize connection and check network status
    private async initializeConnection() {
        try {
            const networkState = await getNetworkState();
            console.log('📡 Network state:', networkState);

            if (!networkState.isConnected) {
                console.warn('⚠️ Device is not connected to any network');
            } else {
                await this.refreshBaseUrl();
            }
        } catch (error) {
            console.warn('⚠️ Failed to initialize connection:', error);
        }
    }

    // New method to refresh the base URL
    private async refreshBaseUrl() {
        try {
            const newBaseUrl = await refreshApiBaseUrl();
            if (newBaseUrl !== this.currentBaseURL) {
                console.log(`🔄 Updating API base URL from ${this.currentBaseURL} to ${newBaseUrl}`);
                this.currentBaseURL = newBaseUrl;
                this.api.defaults.baseURL = newBaseUrl;
            }
        } catch (error) {
            console.warn('⚠️ Failed to refresh base URL:', error);
        }
    }

    private async loadToken() {
        this.token = await storage.getItem(TOKEN_KEY);
        const storedUserData = await storage.getItem('user_data');
        if (storedUserData) {
            try {
                this.userData = typeof storedUserData === 'string' ? JSON.parse(storedUserData) : storedUserData;
            } catch (e) {
                this.userData = storedUserData;
            }
        }
        if (this.token) {
            console.log('🔑 Token loaded');
        }
    }

    public async setUserData(data: any) {
        this.userData = data;
        await storage.setItem('user_data', JSON.stringify(data));
        console.log('👤 User data updated in ApiService');
    }

    public async getUserData() {
        if (!this.userData) {
            const stored = await storage.getItem('user_data');
            if (stored) {
                try {
                    this.userData = typeof stored === 'string' ? JSON.parse(stored) : stored;
                } catch (e) {
                    this.userData = stored;
                }
            }
        }
        return this.userData;
    }

    public async setToken(token: string) {
        this.token = token;
        await storage.setItem(TOKEN_KEY, token);
        console.log('🔑 Token set');
    }

    public async removeToken() {
        this.token = null;
        await storage.removeItem(TOKEN_KEY);
        console.log('🔑 Token removed');
    }

    // Method to manually refresh the connection
    public async refreshConnection() {
        await this.refreshBaseUrl();
    }

    // Helper method to check if it's a network error
    private isNetworkError(error: any): boolean {
        return !error.response &&
            (error.code === 'ECONNABORTED' ||
                error.message?.includes('Network Error') ||
                error.code === 'ERR_NETWORK' ||
                error.message?.includes('timeout') ||
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('Network request failed') ||
                error.message?.includes('Could not connect'));
    }

    // Generic request method with retry logic
    private async requestWithRetry<T>(
        method: 'get' | 'post' | 'put' | 'delete',
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const maxRetries = 2;
        let lastError: any;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                let response: AxiosResponse<T>;

                switch (method) {
                    case 'get':
                        response = await this.api.get(url, config);
                        break;
                    case 'post':
                        response = await this.api.post(url, data, config);
                        break;
                    case 'put':
                        response = await this.api.put(url, data, config);
                        break;
                    case 'delete':
                        response = await this.api.delete(url, config);
                        break;
                }

                return response.data;
            } catch (error) {
                lastError = error;

                // Don't retry validation errors (422)
                if ((error as any)?.response?.status === 422) {
                    console.log('⛔ Validation error, not retrying');
                    throw error;
                }

                // If it's a network error and we haven't exceeded retries
                if (this.isNetworkError(error) && attempt < maxRetries) {
                    console.log(`🔄 Request failed (attempt ${attempt + 1}/${maxRetries + 1}), refreshing base URL and retrying...`);

                    // Refresh base URL before retry
                    if (!this.refreshInProgress) {
                        this.refreshInProgress = true;
                        try {
                            await this.refreshBaseUrl();
                        } finally {
                            this.refreshInProgress = false;
                        }
                    }

                    // Wait a bit before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                } else {
                    // Don't retry for other types of errors
                    break;
                }
            }
        }

        throw lastError;
    }

    // GET with automatic IP refresh on failure
    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return this.requestWithRetry<T>('get', url, undefined, config);
    }

    // POST with automatic IP refresh on failure
    public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.requestWithRetry<T>('post', url, data, config);
    }

    // PUT with automatic IP refresh on failure
    public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.requestWithRetry<T>('put', url, data, config);
    }

    // DELETE with automatic IP refresh on failure
    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return this.requestWithRetry<T>('delete', url, undefined, config);
    }

    // Test connection to current base URL
    public async testConnection(): Promise<boolean> {
        try {
            await this.api.get('/health', { timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }

    // Get current network status using the correct method
    public async getNetworkStatus(): Promise<{ isConnected: boolean; ipAddress?: string; networkType?: string }> {
        try {
            const [ipAddress, networkState] = await Promise.all([
                Network.getIpAddressAsync(),
                Network.getNetworkStateAsync()
            ]);

            return {
                isConnected: networkState.isConnected || false,
                ipAddress: ipAddress !== '0.0.0.0' ? ipAddress : undefined,
                networkType: networkState.type
            };
        } catch (error) {
            console.warn('⚠️ Failed to get network status:', error);
            return { isConnected: false };
        }
    }
}

// Export a single instance
export const api = new ApiService();
export default api;