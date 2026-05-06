import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wallet, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { getWithdrawals } from '../api/withdrawal';

const Withdrawals = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 20
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch withdrawals
  const fetchWithdrawals = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: statusFilter,
        search: searchDebounce,
        page,
        per_page: 20
      };
      const response = await getWithdrawals(params);
      setWithdrawals(response.data || []);
      setPagination(response.pagination || {});
    } catch (err) {
      console.error('Failed to fetch withdrawals:', err);
      setError('Failed to load withdrawals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals(1);
  }, [statusFilter, searchDebounce]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Completed' },
      failed: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Failed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Wallet size={28} className="text-blue-500" />
            <h1 className="text-2xl font-black text-admin-text tracking-tight italic">
              Withdrawal Requests
            </h1>
            {pendingCount > 0 && (
              <span className="bg-yellow-500 text-white text-[10px] px-3 py-1 rounded-full font-black shadow-sm animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-admin-text-muted text-xs font-black uppercase tracking-widest italic mt-1">
            Manage provider withdrawal requests
          </p>
        </div>

        <button
          onClick={() => fetchWithdrawals(pagination.current_page)}
          className="p-2.5 bg-admin-card border border-admin-border rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Refresh data"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-admin-card border border-admin-border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === status
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-admin-bg text-admin-text-muted hover:bg-admin-border'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-text-muted" />
            <input
              type="text"
              placeholder="Search by provider name, ID, or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-admin-bg border border-admin-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Withdrawals Table */}
      <div className="bg-admin-card border border-admin-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw size={32} className="animate-spin mx-auto text-blue-500 mb-2" />
            <p className="text-admin-text-muted">Loading withdrawals...</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet size={48} className="mx-auto text-admin-text-muted mb-2" />
            <p className="text-admin-text-muted">No withdrawal requests found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-admin-bg border-b border-admin-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-admin-text-muted uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-admin-text-muted uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-admin-text-muted uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-admin-text-muted uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-admin-text-muted uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-admin-text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-admin-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {withdrawals.map((withdrawal) => (
                    <tr 
                      key={withdrawal.withdrawalID} 
                      onClick={() => navigate(`/admin/withdrawals/${withdrawal.withdrawalID}`)}
                      className="hover:bg-admin-bg transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-admin-text">
                        {withdrawal.withdrawal_ref}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-admin-text">
                          {withdrawal.provider?.fullname || 'N/A'}
                        </div>
                        <div className="text-xs text-admin-text-muted">
                          ID: {withdrawal.providerID}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-admin-text">
                        {withdrawal.amount} {withdrawal.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-admin-text capitalize">
                        {withdrawal.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-admin-text-muted">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(withdrawal.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/withdrawals/${withdrawal.withdrawalID}`);
                          }}
                          className="text-blue-500 hover:text-blue-700 font-semibold"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="px-6 py-4 bg-admin-bg border-t border-admin-border flex items-center justify-between">
                <div className="text-sm text-admin-text-muted">
                  Showing {pagination.from} to {pagination.to} of {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchWithdrawals(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className="px-4 py-2 bg-admin-card border border-admin-border rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-admin-bg transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm font-semibold text-admin-text">
                    Page {pagination.current_page} of {pagination.last_page}
                  </span>
                  <button
                    onClick={() => fetchWithdrawals(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                    className="px-4 py-2 bg-admin-card border border-admin-border rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-admin-bg transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Withdrawals;
