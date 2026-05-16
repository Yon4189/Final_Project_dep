import api from './axios';

export const paymentAPI = {
  // Customer Payment Methods (for reference - used by mobile app)
  initializePayment: async (paymentData) => {
    const response = await api.post('/customer/payment/initialize', paymentData);
    return response.data;
  },

  verifyPayment: async (txRef) => {
    const response = await api.get(`/customer/payment/verify/${txRef}`);
    return response.data;
  },

  getPaymentDetails: async (txRef) => {
    const response = await api.get(`/customer/payment/${txRef}`);
    return response.data;
  },

  cancelPayment: async (txRef) => {
    const response = await api.post(`/customer/payment/cancel/${txRef}`);
    return response.data;
  },

  getCustomerPaymentHistory: async (customerId, page = 1) => {
    const response = await api.get(`/customer/payment/history/${customerId}?page=${page}`);
    return response.data;
  },

  // Provider Withdrawal Methods (for reference - used by mobile app)
  createWithdrawal: async (withdrawalData) => {
    const response = await api.post('/provider/withdrawal/create', withdrawalData);
    return response.data;
  },

  processWithdrawal: async (withdrawalId) => {
    const response = await api.post(`/admin/withdrawal/process/${withdrawalId}`);
    return response.data;
  },

  getWithdrawalStatus: async (withdrawalRef) => {
    const response = await api.get(`/provider/withdrawal/status/${withdrawalRef}`);
    return response.data;
  },

  getProviderWithdrawalHistory: async (providerId, page = 1) => {
    const response = await api.get(`/provider/withdrawal/history/${providerId}?page=${page}`);
    return response.data;
  },

  // Admin Payment Management Methods (Web App)
  getAllPayments: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/admin/payments?${params}`);
    return response.data;
  },

  getPaymentStats: async () => {
    const response = await api.get('/admin/payments/stats');
    return response.data;
  },

  getAllWithdrawals: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/admin/withdrawals?${params}`);
    return response.data;
  },

  getWithdrawalStats: async () => {
    const response = await api.get('/admin/withdrawals/stats');
    return response.data;
  },

  cancelWithdrawal: async (withdrawalId) => {
    const response = await api.post(`/admin/withdrawal/cancel/${withdrawalId}`);
    return response.data;
  }
};
