// types/index.ts
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  profile_image?: string;
  role: 'customer' | 'provider' | 'admin';
  created_at: string;
}

export interface Provider {
  id: number;
  user_id: number;
  business_name: string;
  description?: string;
  category?: {
    id: number;
    name: string;
  };
  hourly_rate: number;
  verified: boolean;
  online_status: boolean;
  rating_avg?: number;
  review_count?: number;
  completed_jobs_count?: number;
  profile_image?: string;
  distance?: number;
  response_time?: string;
  services?: Array<{
    id: number;
    name: string;
    price?: number;
  }>;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Booking {
  id: number;
  booking_number: string;
  customer_id: number;
  provider_id: number;
  category_id: number;
  service_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_hours?: number;
  address: string;
  description?: string;
  status: 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';
  total_amount: number;
  platform_fee: number;
  provider_earning: number;
  customer?: User;
  provider?: Provider;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequest {
  serviceName: string;
  providerId: number;
  scheduledDate: Date;
  scheduledTime: string;
  address: string;
  specialInstructions?: string;
  totalPrice: number;
}

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
}

export interface PriceCalculation {
  min: number;
  max: number;
  platformFee: number;
  total: number;
}