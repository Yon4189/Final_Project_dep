import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, Wallet, CreditCard, History,
  ArrowUpRight, Filter, Download,
  Loader2, ChevronLeft, ChevronRight, RefreshCcw
} from 'lucide-react';
import StatCard from '../components/StatCard';
import api from '../api/axios';

const Payments = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isExporting, setIsExporting] = React.useState(false);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // 1. Data Fetching with TanStack Query
  const { 
    data: { transactions = [], stats = null, pagination = null } = {}, 
    isLoading: loading, 
    isFetching,
    error: apiError,
    refetch
  } = useQuery({
    queryKey: ['paymentsSystem', statusFilter, currentPage],
    queryFn: async () => {
      const params = { page: currentPage };
      if (statusFilter) params.status = statusFilter;

      const [txRes, statsRes] = await Promise.all([
        api.get('/admin/payments', { params }),
        api.get('/admin/payments/stats')
      ]);

      const txData = txRes.data.data;
      const transactions = txRes.data.success ? (txData.data || txData) : [];
      
      const paginationData = txRes.data.success && txData.current_page ? {
        total: txData.total,
        current_page: txData.current_page,
        last_page: txData.last_page,
        from: txData.from,
        to: txData.to
      } : null;

      const stats = statsRes.data.success ? statsRes.data.data : null;

      return { transactions, stats, pagination: paginationData };
    },
    staleTime: 60000,
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = { per_page: 1000 };
      if (statusFilter) params.status = statusFilter;
      
      const res = await api.get('/admin/payments', { params });
      
      const resData = res.data;
      if (!resData.success) {
        alert('Failed to fetch data for export');
        return;
      }

      // Handle Laravel pagination structure
      const data = resData.data?.data || resData.data || [];
      
      if (!Array.isArray(data) || data.length === 0) {
        alert(t('pay_no_data_export') || 'No data to export for the selected filter');
        return;
      }

      // CSV Content Generation
      const headers = ['Transaction ID', 'Status', 'Phase', 'Amount', 'Currency', 'Commission', 'Customer', 'Provider', 'Date'];
      const csvRows = data.map(txn => [
        txn.tx_ref,
        txn.status?.toUpperCase(),
        txn.payment_type?.toUpperCase() || 'N/A',
        txn.amount,
        txn.currency,
        txn.platform_commission || '0',
        txn.customer?.fullname || 'N/A',
        txn.provider?.fullname || 'Platform',
        new Date(txn.created_at).toLocaleString()
      ]);

      const csvContent = [headers, ...csvRows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      // Download execution
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `payment_report_${statusFilter || 'all'}_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = loading; // Alias for JSX

  const financialStats = [
    {
      title: t('pay_gross_volume'),
      value: stats?.total_volume ? `${Number(stats.total_volume).toLocaleString()} ETB` : '0 ETB',
      icon: CreditCard,
      color: 'bg-blue-500'
    },
    {
      title: t('pay_total_revenue'),
      value: stats?.platform_revenue ? `${Number(stats.platform_revenue).toLocaleString()} ETB` : '0 ETB',
      icon: TrendingUp,
      color: 'bg-emerald-500'
    },
    {
      title: t('pay_provider_earnings'),
      value: stats?.provider_revenue ? `${Number(stats.provider_revenue).toLocaleString()} ETB` : '0 ETB',
      icon: Wallet,
      color: 'bg-indigo-500'
    },
    {
      title: t('pay_success_rate'),
      value: stats?.total_payments > 0
        ? `${Math.round((stats.successful_payments / stats.total_payments) * 100)}%`
        : '0%',
      icon: History,
      color: 'bg-slate-500'
    },
  ];

  const getStatusTranslation = (status) => {
    const s = status?.toLowerCase();
    return t(`status_${s}`) || status;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-admin-text tracking-tight italic">{t('pay_title')}</h1>
          <p className="text-admin-text-muted text-xs font-black uppercase tracking-widest italic mt-1">{t('pay_subtitle')}</p>
        </div>

          <button 
            disabled={isExporting}
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none active:scale-95 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {t('pay_export_report')}
          </button>
          
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-admin-card border border-admin-border text-admin-text rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCcw size={14} className={isFetching ? "animate-spin" : ""} />
            {t('common_refresh') || 'Refresh'}
          </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {financialStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>



      {/* Transaction Table */}
      <div className="bg-admin-card rounded-[2.5rem] shadow-sm border border-admin-border overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-6 border-b border-admin-border bg-admin-card flex justify-between items-center">
          <h2 className="font-black text-admin-text text-sm uppercase italic tracking-tight">{t('pay_recent_transactions')}</h2>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 text-admin-text-muted">
               <Filter size={14} />
               <span className="text-[10px] font-black uppercase tracking-widest">{t('serv_filter_by')}</span>
             </div>
             <select 
               className="px-4 py-2 bg-admin-card border border-admin-border rounded-xl text-[10px] font-black uppercase tracking-widest outline-none text-admin-text-muted hover:text-admin-text transition-all focus:ring-2 focus:ring-blue-500 shadow-sm"
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
             >
               <option value="">{t('common_all') || 'All Statuses'}</option>
               <option value="pending">{t('status_pending') || 'Pending'}</option>
               <option value="held">{t('status_held') || 'Held'}</option>
               <option value="released">{t('status_released') || 'Released'}</option>
               <option value="failed">{t('status_failed') || 'Failed'}</option>
               <option value="refunded">{t('status_refunded') || 'Refunded'}</option>
             </select>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto hidden lg:block">
          {apiError ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <span className="text-red-500 font-bold">API Error: {apiError?.message || 'Failed to fetch data'}</span>
              <pre className="text-xs text-slate-500 mt-2 p-2 bg-slate-100 rounded text-left w-full overflow-x-auto">
                 {JSON.stringify(apiError?.response?.data || apiError, null, 2)}
              </pre>
            </div>
          ) : isLoading && transactions.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">{t('pay_syncing')}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-20 text-center text-[10px] font-black text-admin-text-muted uppercase tracking-widest italic">
              {t('pay_no_transactions')}
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-admin-card dark:bg-black/20 text-admin-text-muted text-[10px] uppercase font-black tracking-widest border-b border-admin-border">
                <tr>
                  <th className="px-8 py-5">{t('pay_transaction_id')}</th>
                  <th className="px-8 py-5">{t('pay_customer')}</th>
                  <th className="px-8 py-5">{t('pay_provider')}</th>
                  <th className="px-8 py-5">{t('pay_date')}</th>
                  <th className="px-8 py-5">{t('pay_phase')}</th>
                  <th className="px-8 py-5">{t('pay_total_amount')}</th>
                  <th className="px-8 py-5">{t('pay_commission')}</th>
                  <th className="px-8 py-5">{t('pay_provider_net')}</th>
                  <th className="px-8 py-5">{t('pay_status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {transactions.map((txn) => (
                  <tr key={txn.paymentID} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-admin-text-muted">
                      {txn.tx_ref || `#${txn.paymentID}`}
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-admin-text leading-tight">
                        {txn.customer?.fullname || `${txn.customer_first_name || ''} ${txn.customer_last_name || ''}`.trim() || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-admin-text leading-tight">
                        {txn.provider?.fullname || 'Platform'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-[10px] text-admin-text-muted uppercase font-black italic">
                        {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-[10px] font-black text-admin-text uppercase tracking-tight">
                        {txn.payment_type === 'deposit' ? t('pay_deposit') : t('pay_final')}
                      </div>
                    </td>
                    <td className="px-8 py-5 font-black text-admin-text font-mono text-sm">{txn.amount} {txn.currency}</td>
                    <td className="px-8 py-5 text-sm text-emerald-600 font-black flex items-center gap-1 font-mono">
                      <ArrowUpRight size={14} /> {txn.platform_commission || '0.00'}
                    </td>
                    <td className="px-8 py-5 text-xs text-admin-text-muted font-bold font-mono">{txn.provider_amount || '0.00'}</td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black uppercase tracking-widest italic whitespace-nowrap ${
                        txn.status === 'success' || txn.status === 'paid' || txn.status === 'released' 
                          ? 'text-emerald-600 dark:text-emerald-400' :
                        txn.status === 'failed' || txn.status === 'cancelled' 
                          ? 'text-red-600 dark:text-red-400' :
                        'text-amber-600 dark:text-amber-400'
                      }`}>
                        {getStatusTranslation(txn.status)}
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
               <p className="font-black text-slate-400 uppercase text-[10px]">{t('pay_syncing')}</p>
             </div>
          ) : transactions.length > 0 ? (
            transactions.map((txn) => (
              <div key={txn.paymentID} className="bg-admin-card/50 rounded-3xl p-5 border border-admin-border space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-black text-slate-300 capitalize">{txn.tx_ref || `#${txn.paymentID}`}</span>
                      <span className="text-[8px] font-black uppercase text-admin-text-muted border-l border-admin-border pl-2">
                        {txn.payment_type === 'deposit' ? t('pay_deposit') : t('pay_final')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase font-black mt-0.5 italic">
                      {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <span className={`text-[9px] font-black uppercase italic ${
                    txn.status === 'success' || txn.status === 'paid' || txn.status === 'released' 
                      ? 'text-emerald-600 dark:text-emerald-400' : 
                    txn.status === 'failed' || txn.status === 'cancelled'
                      ? 'text-red-600 dark:text-red-400' :
                      'text-amber-600 dark:text-amber-400'
                  }`}>
                    {getStatusTranslation(txn.status)}
                  </span>
                </div>

                <div className="pb-3 border-b border-admin-border border-dashed grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('pay_customer')}</p>
                    <p className="text-xs font-bold text-admin-text">
                      {txn.customer?.fullname || `${txn.customer_first_name || ''} ${txn.customer_last_name || ''}`.trim() || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('pay_provider')}</p>
                    <p className="text-xs font-bold text-admin-text">
                      {txn.provider?.fullname || 'Platform'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-0.5">{t('pay_total_amount')}</p>
                    <p className="text-sm font-black text-admin-text font-mono">{txn.amount} {txn.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5">{t('pay_commission')}</p>
                    <p className="text-xs font-black text-emerald-600 font-mono">{txn.platform_commission || '0.00'}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-[10px] font-black text-slate-400 uppercase">{t('pay_no_transactions')}</div>
          )}
        </div>

        {/* Pagination Section */}
        {pagination && pagination.total > 0 && (
          <div className="p-6 bg-admin-card border-t border-admin-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-semibold text-admin-text-muted uppercase tracking-widest italic">
              {t('serv_showing_x_of_y', { 
                start: pagination.from || 0, 
                end: pagination.to || 0, 
                total: pagination.total || 0 
              })}
            </span>
            
            {pagination.last_page > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-2 rounded-xl bg-admin-card border border-admin-border text-admin-text-muted hover:text-admin-text disabled:opacity-30 transition-all shadow-sm active:scale-95"
                  title={t('common_previous')}
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-1.5 px-2">
                  {[...Array(pagination.last_page)].map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 || 
                      pageNum === pagination.last_page || 
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-9 h-9 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white shadow-blue-100 dark:shadow-none'
                              : 'bg-admin-card text-admin-text-muted hover:text-admin-text border border-admin-border'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      (pageNum === 2 && currentPage > 3) || 
                      (pageNum === pagination.last_page - 1 && currentPage < pagination.last_page - 2)
                    ) {
                      return <span key={pageNum} className="text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  disabled={currentPage === pagination.last_page}
                  onClick={() => {
                    setCurrentPage(prev => Math.min(pagination.last_page, prev + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-2 rounded-xl bg-admin-card border border-admin-border text-admin-text-muted hover:text-admin-text disabled:opacity-30 transition-all shadow-sm active:scale-95"
                  title={t('common_next')}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;