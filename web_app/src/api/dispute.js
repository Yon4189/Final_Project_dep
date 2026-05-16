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
  },

  // Download attachment from dispute message
  downloadAttachment: async (disputeID, messageID, filename) => {
    const response = await api.get(`/admin/disputes/${disputeID}/messages/${messageID}/attachment/${filename}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Search messages in a dispute
  searchMessages: async (disputeID, query, limit = 50) => {
    const response = await api.get(`/admin/disputes/${disputeID}/messages/search`, {
      params: { query, limit }
    });
    return response.data;
  },

  // Edit a message
  editMessage: async (messageID, message) => {
    const response = await api.put(`/admin/disputes/messages/${messageID}`, { message });
    return response.data;
  },

  // Delete a message
  deleteMessage: async (messageID) => {
    const response = await api.delete(`/admin/disputes/messages/${messageID}`);
    return response.data;
  },

  // Set typing status
  setTypingStatus: async (disputeID, isTyping) => {
    const response = await api.post(`/admin/disputes/${disputeID}/typing`, { is_typing: isTyping });
    return response.data;
  },

  // Get typing status
  getTypingStatus: async (disputeID) => {
    const response = await api.get(`/admin/disputes/${disputeID}/typing`);
    return response.data;
  },

  // Reply to a message (threading)
  replyToMessage: async (disputeID, parentMessageID, message, recipientType = 'customer') => {
    const response = await api.post(`/admin/disputes/${disputeID}/messages/reply`, {
      parent_message_id: parentMessageID,
      message,
      recipient_type: recipientType
    });
    return response.data;
  },

  // Get message thread
  getMessageThread: async (disputeID, messageID) => {
    const response = await api.get(`/admin/disputes/${disputeID}/messages/${messageID}/thread`);
    return response.data;
  },

  // Clear chat history
  clearHistory: async (disputeID) => {
    const response = await api.delete(`/admin/disputes/${disputeID}/clear-history`);
    return response.data;
  }
};
