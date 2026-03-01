// services/payment.service.ts
import { api } from './api';
import { Platform } from 'react-native';

interface InitializePaymentParams {
  amount: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  customerId?: string;
  bookingId: string;
  paymentMethod?: 'chapa' | 'cash';
  description?: string;
}

interface PaymentResponse {
  checkoutUrl: string;
  transactionId: string;
  tx_ref: string;
}

interface PaymentVerification {
  status: 'success' | 'pending' | 'failed';
  amount: number;
  currency: string;
  message?: string;
}

class PaymentService {
  private readonly BASE_PATH = '/customer/payment';

  /**
   * Initialize Chapa payment
   */
  async initializeChapaPayment(params: InitializePaymentParams): Promise<PaymentResponse> {
    try {
      const response = await api.post<PaymentResponse>(`${this.BASE_PATH}/initialize`, {
        amount: params.amount,
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        phone_number: params.phoneNumber,
        customer_id: params.customerId,
        booking_id: params.bookingId,
        payment_method: params.paymentMethod || 'chapa',
        description: params.description || `Payment for booking #${params.bookingId}`,
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to initialize payment');
      }

      return response.data;
    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      throw new Error(error.message || 'Payment initialization failed');
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(tx_ref: string): Promise<PaymentVerification> {
    try {
      const response = await api.get<PaymentVerification>(`${this.BASE_PATH}/verify/${tx_ref}`);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to verify payment');
      }

      return response.data;
    } catch (error: any) {
      console.error('Payment verification failed:', error);
      throw new Error(error.message || 'Payment verification failed');
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(tx_ref: string): Promise<any> {
    try {
      const response = await api.get<any>(`${this.BASE_PATH}/${tx_ref}`);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to get payment details');
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to get payment details:', error);
      throw new Error(error.message || 'Failed to get payment details');
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(tx_ref: string): Promise<void> {
    try {
      const response = await api.post<void>(`${this.BASE_PATH}/cancel/${tx_ref}`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to cancel payment');
      }
    } catch (error: any) {
      console.error('Failed to cancel payment:', error);
      throw new Error(error.message || 'Failed to cancel payment');
    }
  }

  /**
   * Get customer payment history
   */
  async getPaymentHistory(customerId: string): Promise<any[]> {
    try {
      const response = await api.get<any[]>(`${this.BASE_PATH}/history/${customerId}`);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to get payment history');
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to get payment history:', error);
      throw new Error(error.message || 'Failed to get payment history');
    }
  }

  /**
   * Open payment URL (handles both web and mobile)
   */
  openPaymentUrl(url: string): void {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      console.log('Open payment URL on mobile:', url);
    }
  }
}

// Create and export the instance
export const paymentService = new PaymentService();

// Also export as default if needed
export default paymentService;