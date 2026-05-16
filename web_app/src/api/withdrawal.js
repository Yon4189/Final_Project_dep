import api from './axios';

/**
 * Get withdrawals list with filtering and pagination
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (pending, approved, rejected, all)
 * @param {string} params.search - Search by provider name, ID, or withdrawal reference
 * @param {number} params.page - Page number
 * @param {number} params.per_page - Items per page
 * @returns {Promise} API response
 */
export const getWithdrawals = async (params = {}) => {
  const response = await api.get('/admin/withdrawals', { params });
  return response.data;
};

/**
 * Get detailed withdrawal information
 * @param {string|number} id - Withdrawal ID
 * @returns {Promise} API response
 */
export const getWithdrawalDetails = async (id) => {
  const response = await api.get(`/admin/withdrawals/${id}`);
  return response.data;
};

/**
 * Approve a withdrawal request
 * @param {string|number} id - Withdrawal ID
 * @returns {Promise} API response
 */
export const approveWithdrawal = async (id) => {
  const response = await api.post(`/admin/withdrawals/${id}/approve`);
  return response.data;
};

/**
 * Reject a withdrawal request
 * @param {string|number} id - Withdrawal ID
 * @param {string} reason - Rejection reason
 * @returns {Promise} API response
 */
export const rejectWithdrawal = async (id, reason) => {
  const response = await api.post(`/admin/withdrawals/${id}/reject`, { reason });
  return response.data;
};

/**
 * Get withdrawal statistics
 * @returns {Promise} API response
 */
export const getWithdrawalStats = async () => {
  const response = await api.get('/admin/withdrawals/stats');
  return response.data;
};
