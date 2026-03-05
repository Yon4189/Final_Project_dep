import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Wallet, CreditCard, History,
  ArrowUpRight, ArrowDownRight, Filter, Download,
  Database, CheckCircle, AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import StatCard from '../components/StatCard';
import api from '../api/axios';

const Payments = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState('checking');

  const fetchData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [txRes, statsRes] = await Promise.all([
        api.get('/admin/payments'),
        api.get('/admin/payments/stats')
      ]);

      if (txRes.data.success) {
        setTransactions(txRes.data.data.data || txRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      setDbStatus('connected');
    } catch (err) {
      console.error(err);
      setDbStatus('disconnected');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const financialStats = [
    {
      title: 'Total Volume',
      value: stats ? `${stats.total_revenue} ETB` : '0 ETB',
      icon: CreditCard,
      color: 'bg-blue-500'
    },
    {
      title: 'Monthly Revenue',
      value: stats ? `${stats.monthly_revenue} ETB` : '0 ETB',
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      title: 'Pending Payments',
      value: stats ? stats.pending_payments : '0',
      icon: Wallet,
      color: 'bg-amber-500'
    },
    {
      title: 'Success Rate',
      value: stats && stats.total_payments > 0
        ? `${Math.round((stats.successful_payments / stats.total_payments) * 100)}%`
        : '0%',
      icon: History,
      color: 'bg-slate-500'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Payment Analytics</h1>
          <p className="text-slate-500 text-sm">Monitor platform revenue and transaction history.</p>
        </div>

        <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <Download size={18} />
          Export Report
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {financialStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 text-lg">Transaction History</h2>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filter by Date</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading && transactions.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              No transactions recorded yet.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Parties</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Commission</th>
                  <th className="px-6 py-4">Provider Net</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((txn) => (
                  <tr key={txn.paymentID} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">
                      {txn.tx_ref || `#${txn.paymentID}`}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">
                        {txn.customer?.fullname || txn.customer_first_name} → {txn.provider?.fullname || 'Admin'}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">
                        {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{txn.amount} {txn.currency}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-bold flex items-center gap-1">
                      <ArrowUpRight size={14} /> {txn.platform_commission || '0.00'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{txn.provider_amount || '0.00'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${txn.status === 'success' || txn.status === 'paid' || txn.status === 'released' ? 'bg-green-100 text-green-600' :
                          txn.status === 'failed' || txn.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;