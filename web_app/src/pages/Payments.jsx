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
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Payment Analytics</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest italic mt-1">Monitor revenue and transaction history.</p>
        </div>

        <button className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all active:scale-95">
          <Download size={18} />
          Export Report
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {financialStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-black text-slate-900 text-sm uppercase italic tracking-tight">Recent Transactions</h2>
          <div className="flex items-center gap-2 text-slate-400">
            <Filter size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Filter</span>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto hidden lg:block">
          {isLoading && transactions.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing with server...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              No transactions recorded yet.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5">Transaction ID</th>
                  <th className="px-8 py-5">Parties</th>
                  <th className="px-8 py-5">Total Amount</th>
                  <th className="px-8 py-5">Commission</th>
                  <th className="px-8 py-5">Provider Net</th>
                  <th className="px-8 py-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.map((txn) => (
                  <tr key={txn.paymentID} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-slate-400">
                      {txn.tx_ref || `#${txn.paymentID}`}
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-slate-900 leading-tight">
                        {txn.customer?.fullname || txn.customer_first_name} → {txn.provider?.fullname || 'Admin'}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-black italic mt-1">
                        {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-8 py-5 font-black text-slate-900 font-mono text-sm">{txn.amount} {txn.currency}</td>
                    <td className="px-8 py-5 text-sm text-emerald-600 font-black flex items-center gap-1 font-mono">
                      <ArrowUpRight size={14} /> {txn.platform_commission || '0.00'}
                    </td>
                    <td className="px-8 py-5 text-xs text-slate-500 font-bold font-mono">{txn.provider_amount || '0.00'}</td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest italic ${txn.status === 'success' || txn.status === 'paid' || txn.status === 'released' ? 'bg-green-50 text-green-600 border-green-200' :
                          txn.status === 'failed' || txn.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                            'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
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

        {/* Mobile Card View */}
        <div className="lg:hidden p-4 space-y-4">
          {isLoading && transactions.length === 0 ? (
             <div className="p-10 text-center flex flex-col items-center gap-3">
               <Loader2 className="animate-spin text-blue-600" size={32} />
               <p className="font-black text-slate-400 uppercase text-[10px]">Syncing...</p>
             </div>
          ) : transactions.length > 0 ? (
            transactions.map((txn) => (
              <div key={txn.paymentID} className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[9px] font-black text-slate-300 capitalize">{txn.tx_ref || `#${txn.paymentID}`}</span>
                    <p className="text-[10px] text-slate-400 uppercase font-black mt-0.5 italic">
                      {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${txn.status === 'success' || txn.status === 'paid' || txn.status === 'released' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                    {txn.status}
                  </span>
                </div>

                <div className="pb-3 border-b border-slate-200 border-dashed">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Parties</p>
                  <p className="text-xs font-bold text-slate-900">
                    {txn.customer?.fullname || txn.customer_first_name} → {txn.provider?.fullname || 'Admin'}
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Total</p>
                    <p className="text-sm font-black text-slate-900 font-mono">{txn.amount} {txn.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5">Commission</p>
                    <p className="text-xs font-black text-emerald-600 font-mono">{txn.platform_commission || '0.00'}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-[10px] font-black text-slate-400 uppercase">No history found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;