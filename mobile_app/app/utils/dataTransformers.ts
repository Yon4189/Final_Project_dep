// utils/dataTransformers.ts
import { ServiceRequest, Appointment, ProviderStats, ApiResponse } from '../types';

export const transformServiceRequest = (apiRequest: any): ServiceRequest => {
  return {
    id: apiRequest.id.toString(),
    customerId: apiRequest.customer.id.toString(),
    customerName: apiRequest.customer.name,
    customerImage: apiRequest.customer.profile_image,
    serviceType: apiRequest.service.name,
    description: apiRequest.description,
    scheduledDate: new Date(apiRequest.scheduled_date),
    scheduledTime: apiRequest.scheduled_time,
    address: apiRequest.location.address,
    location: {
      latitude: parseFloat(apiRequest.location.latitude),
      longitude: parseFloat(apiRequest.location.longitude),
    },
    status: apiRequest.status,
    price: parseFloat(apiRequest.price),
    distance: apiRequest.distance ? parseFloat(apiRequest.distance) : undefined,
    createdAt: new Date(apiRequest.created_at),
    specialInstructions: apiRequest.special_instructions,
  };
};

export const transformAppointment = (apiAppointment: any): Appointment => {
  return {
    id: apiAppointment.id.toString(),
    customerName: apiAppointment.customer.name,
    serviceType: apiAppointment.service.name,
    date: new Date(apiAppointment.scheduled_date),
    time: apiAppointment.scheduled_time,
    address: apiAppointment.location.address,
    status: apiAppointment.status,
  };
};

export const transformStats = (apiStats: any): ProviderStats => {
  return {
    totalRequests: apiStats.total_requests,
    pendingRequests: apiStats.pending_requests,
    completedJobs: apiStats.completed_jobs,
    totalEarnings: parseFloat(apiStats.total_earnings),
    rating: parseFloat(apiStats.average_rating),
    reviewCount: apiStats.review_count,
  };
};