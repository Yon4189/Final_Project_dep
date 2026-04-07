import api from './axios';

export const disputeAPI = {
  // Get all disputes (admin view)
  getAllDisputes: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/admin/disputes?${params}`);
    return response.data;
  },

  // Get dispute details (admin view)
  getDisputeDetails: async (disputeID) => {
    const response = await api.get(`/admin/disputes/${disputeID}`);
    return response.data;
  },

  // Update dispute status (admin)
  updateDisputeStatus: async (disputeID, data) => {
    const response = await api.put(`/admin/disputes/${disputeID}/status`, data);
    return response.data;
  },

  // Add private admin note
  addPrivateNote: async (disputeID, note) => {
    const response = await api.post(`/admin/disputes/${disputeID}/notes`, { note });
    return response.data;
  },

  // Get dispute statistics
  getDisputeStats: async () => {
    const response = await api.get('/admin/disputes/stats');
    return response.data;
  },
  
  // Delete dispute message
  deleteDisputeMessage: async (messageID) => {
    const response = await api.delete(`/admin/disputes/messages/${messageID}`);
    return response.data;
  },

  // Add public message/chat
  addDisputeMessage: async (disputeID, message, recipientType = 'customer', isAdminOnly = false) => {
    const response = await api.post(`/admin/disputes/${disputeID}/messages`, { 
      message, 
      recipient_type: recipientType,
      is_admin_only: isAdminOnly 
    });
    return response.data;
  }
};
