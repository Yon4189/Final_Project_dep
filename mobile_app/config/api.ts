import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Network from 'expo-network';

// Default IP (fallback)
const DEFAULT_IP = '10.161.161.0';
const DEFAULT_PORT = '8000';

// Function to get local IP address automatically
export const getLocalIpAddress = async (): Promise<string> => {
  try {
    // For physical devices, get the network IP
    if (Platform.OS !== 'web') {
      // Get the device's IP address
      const ipAddress = await Network.getIpAddressAsync();
      
      if (ipAddress && ipAddress !== '0.0.0.0') {
        // If we're on a device, we need to use the computer's IP
        // The device IP is usually in the same subnet as your computer
        // For example, if device IP is 192.168.1.5, your computer might be 192.168.1.x
        const ipParts = ipAddress.split('.');
        if (ipParts.length === 4) {
          // Try common gateway IPs (usually .1 or .254)
          // You might need to adjust this based on your network
          const baseIp = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
          
          // Most common gateway IPs are .1 or .254
          // You can modify this logic based on your network setup
          return `${baseIp}.1`; // Assuming your computer is at .1
        }
      }
    }
    
    // For web or fallback, try to get from environment or use default
    return process.env.EXPO_PUBLIC_API_IP || DEFAULT_IP;
  } catch (error) {
    console.warn('Failed to get local IP address:', error);
    return process.env.EXPO_PUBLIC_API_IP || DEFAULT_IP;
  }
};

// Get network state using the correct method
export const getNetworkState = async (): Promise<{
  isConnected?: boolean;
  type?: Network.NetworkStateType;
  isInternetReachable?: boolean;
}> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return {
      isConnected: networkState.isConnected,
      type: networkState.type,
      isInternetReachable: networkState.isInternetReachable
    };
  } catch (error) {
    console.warn('Failed to get network state:', error);
    return {};
  }
};

// Alternative method using Network.getNetworkStateAsync
export const getNetworkInfo = async (): Promise<{ ipAddress?: string, isConnected?: boolean }> => {
  try {
    const ipAddress = await Network.getIpAddressAsync();
    const networkState = await Network.getNetworkStateAsync();
    
    return {
      ipAddress,
      isConnected: networkState.isConnected
    };
  } catch (error) {
    console.warn('Failed to get network info:', error);
    return {};
  }
};

// Get port from environment or use default
export const getApiPort = (): string => {
  return process.env.EXPO_PUBLIC_API_PORT || DEFAULT_PORT;
};

// Build the complete API URL
export const getApiBaseUrl = async (): Promise<string> => {
  const ip = await getLocalIpAddress();
  const port = getApiPort();
  const protocol = process.env.EXPO_PUBLIC_API_PROTOCOL || 'http';
  return `${protocol}://${ip}:${port}/api`;
};

// Export a function that returns the base URL (for async usage)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_IP}:${DEFAULT_PORT}/api`;

// Export a function to refresh the API base URL
export const refreshApiBaseUrl = async (): Promise<string> => {
  const url = await getApiBaseUrl();
  return url;
};

// Helper function to scan common IP addresses (optional advanced feature)
export const scanCommonIpAddresses = async (): Promise<string | null> => {
  try {
    const deviceIp = await Network.getIpAddressAsync();
    if (!deviceIp || deviceIp === '0.0.0.0') return null;
    
    const ipParts = deviceIp.split('.');
    if (ipParts.length !== 4) return null;
    
    const baseIp = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
    
    // Common gateway IPs to try
    const commonGateways = ['.1', '.254', '.100', '.101'];
    
    // You could implement a ping test here, but that's complex in React Native
    // For now, we'll return the most common one
    return `${baseIp}${commonGateways[0]}`;
  } catch (error) {
    console.warn('Failed to scan IP addresses:', error);
    return null;
  }
};