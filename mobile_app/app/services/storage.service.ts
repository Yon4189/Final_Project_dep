// services/storage.service.ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class StorageService {
  private readonly PREFIX = '@HomeService:';

  /**
   * Set item in storage
   */
  async setItem(key: string, value: any, expiryMs?: number): Promise<void> {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expiry: expiryMs,
      };

      const jsonValue = JSON.stringify(data);
      
      if (Platform.OS === 'web') {
        localStorage.setItem(this.PREFIX + key, jsonValue);
      } else {
        await SecureStore.setItemAsync(this.PREFIX + key, jsonValue);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }

  /**
   * Get item from storage
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      let jsonValue: string | null = null;

      if (Platform.OS === 'web') {
        jsonValue = localStorage.getItem(this.PREFIX + key);
      } else {
        jsonValue = await SecureStore.getItemAsync(this.PREFIX + key);
      }

      if (!jsonValue) return null;

      const data = JSON.parse(jsonValue);
      
      // Check if expired
      if (data.expiry && Date.now() - data.timestamp > data.expiry) {
        await this.removeItem(key);
        return null;
      }

      return data.value as T;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(this.PREFIX + key);
      } else {
        await SecureStore.deleteItemAsync(this.PREFIX + key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  }

  /**
   * Clear all app storage
   */
  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(this.PREFIX)
        );
        keys.forEach(key => localStorage.removeItem(key));
      } else {
        // SecureStore doesn't have a clear method, so we'd need to track keys
        // This is a simplified version - in production you'd want to track all keys
        const keys = [
          'auth_token',
          'user_data',
          'user_profile',
          'last_location',
          'service_categories',
          'user_locations',
          'notification_settings',
          'user_requests',
        ];
        
        for (const key of keys) {
          await this.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      if (Platform.OS === 'web') {
        return Object.keys(localStorage)
          .filter(key => key.startsWith(this.PREFIX))
          .map(key => key.replace(this.PREFIX, ''));
      } else {
        // SecureStore doesn't support listing keys
        // You'd need to maintain a separate key list
        return [];
      }
    } catch (error) {
      console.error('Storage getAllKeys error:', error);
      return [];
    }
  }

  /**
   * Check if key exists
   */
  async hasKey(key: string): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }

  /**
   * Get item with fallback
   */
  async getItemWithFallback<T>(key: string, fallback: T): Promise<T> {
    const value = await this.getItem<T>(key);
    return value !== null ? value : fallback;
  }

  /**
   * Update item partially (for objects)
   */
  async updateItem<T extends object>(key: string, updates: Partial<T>): Promise<void> {
    const current = await this.getItem<T>(key);
    if (current) {
      await this.setItem(key, { ...current, ...updates });
    }
  }
}

export const storage = new StorageService();