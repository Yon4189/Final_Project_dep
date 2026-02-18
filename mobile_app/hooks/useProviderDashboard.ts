// hooks/useProviderDashboard.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
//import ApiService from '../services/api';
import { transformServiceRequest, transformAppointment, transformStats } from '../utils/dataTransformers';
import { ServiceRequest, Appointment, ProviderStats } from '../types';

export const useProviderDashboard = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<ProviderStats>({
    totalRequests: 0,
    pendingRequests: 0,
    completedJobs: 0,
    totalEarnings: 0,
    rating: 0,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all dashboard data in parallel
      const [statsResponse, requestsResponse, appointmentsResponse] = await Promise.all([
        ApiService.getDashboardStats(),
        ApiService.getServiceRequests({ status: 'pending' }),
        ApiService.getAppointments(),
      ]);

      setStats(transformStats(statsResponse.data));
      setRequests(requestsResponse.data.map(transformServiceRequest));
      setAppointments(appointmentsResponse.data.map(transformAppointment));
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptRequest = useCallback(async (requestId: string) => {
    try {
      await ApiService.acceptRequest(requestId);
      await loadDashboardData(); // Reload data
      Alert.alert('Success', 'Service request accepted successfully!');
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to accept request');
      return false;
    }
  }, [loadDashboardData]);

  const rejectRequest = useCallback(async (requestId: string, reason: string) => {
    try {
      await ApiService.rejectRequest(requestId, reason);
      await loadDashboardData();
      Alert.alert('Success', 'Request rejected successfully');
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reject request');
      return false;
    }
  }, [loadDashboardData]);

  const startService = useCallback(async (appointmentId: string) => {
    try {
      await ApiService.startService(appointmentId);
      await loadDashboardData();
      Alert.alert('Success', 'Service started successfully');
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to start service');
      return false;
    }
  }, [loadDashboardData]);

  const completeService = useCallback(async (appointmentId: string) => {
    try {
      await ApiService.completeService(appointmentId);
      await loadDashboardData();
      Alert.alert('Success', 'Service completed successfully!');
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to complete service');
      return false;
    }
  }, [loadDashboardData]);

  return {
    requests,
    appointments,
    stats,
    loading,
    error,
    loadDashboardData,
    acceptRequest,
    rejectRequest,
    startService,
    completeService,
  };
};