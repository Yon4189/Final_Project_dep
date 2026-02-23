// services/storage.service.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import CryptoJS from "react-native-crypto-js";

// Encryption key - in production, this should be stored in environment variables
const ENCRYPTION_KEY =
  process.env.EXPO_PUBLIC_STORAGE_ENCRYPTION_KEY ||
  "your-secret-key-min-32-chars-long!!";

interface StorageItem<T> {
  value: T;
  expiry?: number;
  createdAt: number;
}

type StorageType = "secure" | "async";

class StorageService {
  private readonly PREFIX = "@HomeLink:";
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  // ==================== Core Storage Methods ====================

  private getKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }

  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  }

  private decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  private async setSecureItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = this.encrypt(value);
      await SecureStore.setItemAsync(key, encrypted);
    } catch (error) {
      console.error(`Failed to set secure item ${key}:`, error);
      throw error;
    }
  }

  private async getSecureItem(key: string): Promise<string | null> {
    try {
      const encrypted = await SecureStore.getItemAsync(key);
      if (!encrypted) return null;

      return this.decrypt(encrypted);
    } catch (error) {
      console.error(`Failed to get secure item ${key}:`, error);
      return null;
    }
  }

  private async setAsyncItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to set async item ${key}:`, error);
      throw error;
    }
  }

  private async getAsyncItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get async item ${key}:`, error);
      return null;
    }
  }

  // ==================== Public Methods ====================

  async setItem<T>(
    key: string,
    value: T,
    ttl?: number,
    type: StorageType = "async",
  ): Promise<void> {
    const storageKey = this.getKey(key);

    const item: StorageItem<T> = {
      value,
      createdAt: Date.now(),
      expiry: ttl ? Date.now() + ttl : undefined,
    };

    const serialized = JSON.stringify(item);

    if (type === "secure") {
      await this.setSecureItem(storageKey, serialized);
    } else {
      await this.setAsyncItem(storageKey, serialized);
    }
  }

  async getItem<T>(
    key: string,
    type: StorageType = "async",
  ): Promise<T | null> {
    const storageKey = this.getKey(key);

    const serialized =
      type === "secure"
        ? await this.getSecureItem(storageKey)
        : await this.getAsyncItem(storageKey);

    if (!serialized) return null;

    try {
      const item: StorageItem<T> = JSON.parse(serialized);

      // Check expiry
      if (item.expiry && Date.now() > item.expiry) {
        await this.removeItem(key, type);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error(`Failed to parse item ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string, type: StorageType = "async"): Promise<void> {
    const storageKey = this.getKey(key);

    if (type === "secure") {
      await SecureStore.deleteItemAsync(storageKey);
    } else {
      await AsyncStorage.removeItem(storageKey);
    }
  }

  async clear(type?: StorageType): Promise<void> {
    if (type === "secure") {
      // SecureStore doesn't have a clear all method
      // You would need to keep track of keys manually
    } else if (type === "async") {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter((key) => key.startsWith(this.PREFIX));
      await AsyncStorage.multiRemove(appKeys);
    } else {
      // Clear both
      if (Platform.OS !== "web") {
        // SecureStore doesn't have clear all
      }
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter((key) => key.startsWith(this.PREFIX));
      await AsyncStorage.multiRemove(appKeys);
    }
  }

  async hasKey(key: string, type: StorageType = "async"): Promise<boolean> {
    const value = await this.getItem(key, type);
    return value !== null;
  }

  // ==================== Specific Data Types ====================

  async setUserPreferences(preferences: Record<string, any>): Promise<void> {
    await this.setItem("user_preferences", preferences, undefined, "async");
  }

  async getUserPreferences(): Promise<Record<string, any> | null> {
    return this.getItem("user_preferences", "async");
  }

  async setAuthToken(token: string, refreshToken?: string): Promise<void> {
    await this.setItem("auth_token", token, 7 * 24 * 60 * 60 * 1000, "secure");
    if (refreshToken) {
      await this.setItem(
        "refresh_token",
        refreshToken,
        30 * 24 * 60 * 60 * 1000,
        "secure",
      );
    }
  }

  async getAuthToken(): Promise<string | null> {
    return this.getItem("auth_token", "secure");
  }

  async getRefreshToken(): Promise<string | null> {
    return this.getItem("refresh_token", "secure");
  }

  async removeAuthToken(): Promise<void> {
    await this.removeItem("auth_token", "secure");
    await this.removeItem("refresh_token", "secure");
  }

  async setUser(user: any): Promise<void> {
    await this.setItem("user", user, 7 * 24 * 60 * 60 * 1000, "secure");
  }

  async getUser(): Promise<any | null> {
    return this.getItem("user", "secure");
  }

  async removeUser(): Promise<void> {
    await this.removeItem("user", "secure");
  }

  async setLastLocation(location: {
    latitude: number;
    longitude: number;
    address?: string;
  }): Promise<void> {
    await this.setItem("last_location", location, 24 * 60 * 60 * 1000, "async");
  }

  async getLastLocation(): Promise<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null> {
    return this.getItem("last_location", "async");
  }

  async setSearchHistory(searches: string[]): Promise<void> {
    await this.setItem(
      "search_history",
      searches,
      30 * 24 * 60 * 60 * 1000,
      "async",
    );
  }

  async getSearchHistory(): Promise<string[] | null> {
    return this.getItem("search_history", "async");
  }

  async addToSearchHistory(query: string): Promise<void> {
    const history = (await this.getSearchHistory()) || [];

    // Remove if exists, add to front, limit to 20
    const updated = [query, ...history.filter((item) => item !== query)].slice(
      0,
      20,
    );

    await this.setSearchHistory(updated);
  }

  async clearSearchHistory(): Promise<void> {
    await this.removeItem("search_history", "async");
  }

  async setRecentSearches(searches: string[]): Promise<void> {
    await this.setItem(
      "recent_searches",
      searches,
      7 * 24 * 60 * 60 * 1000,
      "async",
    );
  }

  async getRecentSearches(): Promise<string[] | null> {
    return this.getItem("recent_searches", "async");
  }

  async setFavorites(favorites: string[]): Promise<void> {
    await this.setItem(
      "favorites",
      favorites,
      7 * 24 * 60 * 60 * 1000,
      "async",
    );
  }

  async getFavorites(): Promise<string[] | null> {
    return this.getItem("favorites", "async");
  }

  async addFavorite(providerId: string): Promise<void> {
    const favorites = (await this.getFavorites()) || [];
    if (!favorites.includes(providerId)) {
      await this.setFavorites([...favorites, providerId]);
    }
  }

  async removeFavorite(providerId: string): Promise<void> {
    const favorites = (await this.getFavorites()) || [];
    await this.setFavorites(favorites.filter((id) => id !== providerId));
  }

  async isFavorite(providerId: string): Promise<boolean> {
    const favorites = (await this.getFavorites()) || [];
    return favorites.includes(providerId);
  }

  async setAppSettings(settings: Record<string, any>): Promise<void> {
    await this.setItem("app_settings", settings, undefined, "async");
  }

  async getAppSettings(): Promise<Record<string, any> | null> {
    return this.getItem("app_settings", "async");
  }

  async setOnboardingCompleted(completed: boolean): Promise<void> {
    await this.setItem("onboarding_completed", completed, undefined, "async");
  }

  async getOnboardingCompleted(): Promise<boolean> {
    const value = await this.getItem("onboarding_completed", "async");
    return value === true;
  }

  // ==================== Cache Management ====================

  async setCache<T>(
    key: string,
    data: T,
    ttl: number = 5 * 60 * 1000,
  ): Promise<void> {
    await this.setItem(`cache_${key}`, data, ttl, "async");
  }

  async getCache<T>(key: string): Promise<T | null> {
    return this.getItem(`cache_${key}`, "async");
  }

  async clearCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) =>
      key.startsWith(`${this.PREFIX}cache_`),
    );
    await AsyncStorage.multiRemove(cacheKeys);
  }

  async clearExpiredCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) =>
      key.startsWith(`${this.PREFIX}cache_`),
    );

    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        try {
          const item: StorageItem<any> = JSON.parse(value);
          if (item.expiry && Date.now() > item.expiry) {
            await AsyncStorage.removeItem(key);
          }
        } catch (error) {
          // Invalid cache, remove it
          await AsyncStorage.removeItem(key);
        }
      }
    }
  }

  // ==================== Storage Info ====================

  async getStorageSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const values = await AsyncStorage.multiGet(keys);

      const totalSize = values.reduce((size, [_, value]) => {
        return size + (value?.length || 0);
      }, 0);

      return totalSize;
    } catch (error) {
      console.error("Failed to calculate storage size:", error);
      return 0;
    }
  }

  async getStorageInfo(): Promise<{
    totalItems: number;
    totalSize: number;
    itemsByPrefix: Record<string, number>;
  }> {
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter((key) => key.startsWith(this.PREFIX));

    const itemsByPrefix: Record<string, number> = {};
    let totalSize = 0;

    for (const key of appKeys) {
      const value = await AsyncStorage.getItem(key);
      totalSize += value?.length || 0;

      const prefix = key.split(":")[1] || "other";
      itemsByPrefix[prefix] = (itemsByPrefix[prefix] || 0) + 1;
    }

    return {
      totalItems: appKeys.length,
      totalSize,
      itemsByPrefix,
    };
  }
}

export const storage = new StorageService();
