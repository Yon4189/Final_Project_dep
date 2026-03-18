// app/types/booking.types.ts
export interface Booking {
  bookingID: number;
  customerID: number;
  providerID: number;
  serviceID: number;
  scheduledDate: string;
  agreed_price: number;
  service_address?: string;
  service_latitude?: number;
  service_longitude?: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'expired' | 'disputed';
  created_at: string;
  expires_at: string;
  accepted_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  refund_amount?: number;
  
  // Relationships
  customer?: {
    customerID: number;
    fullname: string;
    phone?: string;
    profilePicture?: string;
  };
  provider?: {
    providerID: number;
    fullname: string;
    businessName?: string;
    phone?: string;
    profilePicture?: string;
    rating?: number;
  };
  service?: {
    serviceID: number;
    title: string;
    description?: string;
    basePrice?: number;
  };
  payment?: {
    status: string;
    amount: number;
  };
}

export interface CreateBookingDTO {
  providerID: number;
  serviceID: number;
  scheduledDate: string;
  agreed_price: number;
  service_address?: string;
  service_latitude?: number;
  service_longitude?: number;
  full_address?: string;
  saved_address_id?: number;
  location_source?: 'gps' | 'saved' | 'new';
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  data?: {
    bookingID: number;
    status: string;
    expires_at: string;
    provider?: {
      id: number;
      name: string;
    };
    service?: {
      id: number;
      title: string;
      price: number;
    };
    scheduledDate: string;
    location?: string | { latitude: number; longitude: number };
  };
}

export interface BookingsListResponse {
  success: boolean;
  data: {
    data: Booking[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}