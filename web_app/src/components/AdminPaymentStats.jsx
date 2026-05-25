import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, TrendingDown, Users, Calendar } from 'lucide-react';
import { paymentAPI } from '../api/payment';

const AdminPaymentStats = () => {
  const [paymentStats, setPaymentStats] = useState(null);
  const [withdrawalStats, setWithdrawalStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [paymentRes, withdrawalRes] = await Promise.all([
        paymentAPI.getPaymentStats(),
        paymentAPI.getWithdrawalStats()
      ]);

      setPaymentStats(paymentRes.data);
      setWithdrawalStats(withdrawalRes.data);
    } catch (err) {
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-admin-card rounded-lg shadow-md p-6 animate-pulse border border-admin-border">
            <div className="h-4 bg-gray-200 dark:bg-admin-sidebar rounded mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-admin-sidebar rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400 font-bold">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 text-admin-text mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Payment Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-admin-card rounded-lg shadow-md p-6 border border-admin-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 text-admin-text-muted">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {paymentStats?.total_payments?.toLocaleString() || 0}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-admin-card rounded-lg shadow-md p-6 border border-admin-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 text-admin-text-muted">Successful</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {paymentStats?.successful_payments?.toLocaleString() || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-admin-card rounded-lg shadow-md p-6 border border-admin-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 text-admin-text-muted">Failed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {paymentStats?.failed_payments?.toLocaleString() || 0}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-admin-card rounded-lg shadow-md p-6 border border-admin-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 text-admin-text-muted">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {paymentStats?.pending_payments?.toLocaleString() || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Revenue Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90">Total Revenue</p>
            <p className="text-3xl font-bold">
              ETB {paymentStats?.total_revenue?.toLocaleString() || 0}
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90">Today's Revenue</p>
            <p className="text-3xl font-bold">
              ETB {paymentStats?.today_revenue?.toLocaleString() || 0}
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90">Monthly Revenue</p>
            <p className="text-3xl font-bold">
              ETB {paymentStats?.monthly_revenue?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Withdrawal Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 text-admin-text mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Withdrawal Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-admin-card rounded-lg shadow-md p-6 border border-admin-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 text-admin-text-muted">Total Withdrawals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {withdrawalStats?.total_withdrawals?.toLocaleString() || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-admin-card rounded-lg shadow-md p-6 border border-admin-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 text-admin-text-muted">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {withdrawalStats?.pending_withdrawals?.toLocaleString() || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-admin-card rounded-lg shadow-md p-6 border border-admin-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 text-admin-text-muted">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {withdrawalStats?.completed_withdrawals?.toLocaleString() || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-admin-card rounded-lg shadow-md p-6 border border-admin-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 text-admin-text-muted">Platform Fees</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ETB {withdrawalStats?.total_platform_fees?.toLocaleString() || 0}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Withdrawal Amount Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90">Total Amount Withdrawn</p>
            <p className="text-3xl font-bold">
              ETB {withdrawalStats?.total_withdrawn_amount?.toLocaleString() || 0}
            </p>
          </div>

          <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90">Monthly Withdrawals</p>
            <p className="text-3xl font-bold">
              {withdrawalStats?.monthly_withdrawals?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentStats;
