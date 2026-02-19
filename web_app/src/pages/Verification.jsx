import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // 👈 added
import {
  Search, CheckCircle, XCircle, FileText, Loader2,
  AlertCircle, RefreshCw, Calendar, Database, MoreVertical
} from 'lucide-react';
import api from '../api/axios';

const Verification = () => {
  const location = useLocation();

  // Determine filter from URL path
  const getFilterFromPath = () => {
    if (location.pathname.includes('/verification/pending')) return 'Pending';
    if (location.pathname.includes('/verification/approved')) return 'Approved';
    if (location.pathname.includes('/verification/rejected')) return 'Rejected';
    return 'Pending'; // default
  };

  // 1. Data State
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');
  const [filter, setFilter] = useState(getFilterFromPath()); // from path

  // 2. UI State
  const [searchQuery, setSearchQuery] = useState('');

  // 3. Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Update filter when route changes
  useEffect(() => {
    setFilter(getFilterFromPath());
  }, [location.pathname]);

  // 4. Fetch Data based on Filter
  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/providers/pending';
      if (filter === 'Approved') endpoint = '/providers/approved';
      if (filter === 'Rejected') endpoint = '/providers/rejected';
      if (filter === 'All') endpoint = '/providers';

      const response = await api.get(endpoint);
      if (response.data.success) {
        setProviders(response.data.data);
        setDbStatus('connected');
      } else {
        setError(response.data.message || 'Failed to fetch providers');
        setDbStatus('disconnected');
      }
    } catch (err) {
      console.error(err);
      setError('Error connecting to server');
      setDbStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [filter]); // refetch when filter changes

  // 5. Handlers
  const handleApprove = async (id) => {
    if (!window.confirm("Approve this provider? They will receive an email.")) return;
    try {
      const response = await api.post(`/providers/${id}/verify`, { isVerified: true });
      if (response.data.success) {
        fetchProviders();
      } else {
        alert(response.data.message || 'Failed to approve');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const openRejectModal = (provider) => {
    setSelectedProvider(provider);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProvider) return;
    try {
      const response = await api.post(`/providers/${selectedProvider.id}/verify`, {
        isVerified: false,
        verification_reason: rejectionReason
      });
      if (response.data.success) {
        setIsRejectModalOpen(false);
        fetchProviders();
      } else {
        alert(response.data.message || 'Failed to reject');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  // 6. Client‑side search
  const filteredProviders = providers.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.service_type && p.service_type.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header with Database Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Provider Verification</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-tighter">
            {filter} providers
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Database size={16} className={
              dbStatus === 'connected' ? 'text-green-500' :
              dbStatus === 'disconnected' ? 'text-red-500' :
              'text-yellow-500 animate-pulse'
            } />
            <span className="text-xs font-black uppercase tracking-wider">
              {dbStatus === 'connected' && 'Database Connected'}
              {dbStatus === 'disconnected' && 'Database Disconnected'}
              {dbStatus === 'checking' && 'Checking Database...'}
            </span>
            {dbStatus === 'connected' && <CheckCircle size={14} className="text-green-500" />}
            {dbStatus === 'disconnected' && <AlertCircle size={14} className="text-red-500" />}
          </div>

          <button
            onClick={fetchProviders}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search Bar (filters are now in sidebar) */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by name or service..."
          className="pl-10 pr-4 py-3 border border-slate-200 rounded-2xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-20">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading providers...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-20">
            <AlertCircle className="text-red-500" size={40} />
            <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">{error}</p>
            <button
              onClick={fetchProviders}
              className="mt-2 text-xs bg-slate-100 px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              Retry
            </button>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No providers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Provider ID</th>
                  <th className="px-8 py-5">Full Name</th>
                  <th className="px-8 py-5">Service</th>
                  <th className="px-8 py-5">Document</th>
                  <th className="px-8 py-5">Submitted</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProviders.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-slate-300">#{item.id}</td>
                    <td className="px-8 py-5 font-bold text-slate-800">{item.name}</td>
                    <td className="px-8 py-5 text-sm text-slate-600">{item.service_type || 'N/A'}</td>
                    <td className="px-8 py-5">
                      <button
                        onClick={() => window.open(`${api.defaults.baseURL.replace('/api', '')}/storage/${item.idPhoto}`, '_blank')}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-xs font-bold"
                      >
                        <FileText size={14} />
                        {item.credentials || 'View Doc'}
                      </button>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Calendar size={12} />
                        <span className="text-[11px] font-black font-mono tracking-tighter">{item.submission_date}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        item.status === 1 ? 'bg-green-50 text-green-600' :
                        item.status === 0 ? 'bg-red-50 text-red-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {item.status === 1 ? 'Approved' : item.status === 0 ? 'Rejected' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-end gap-2">
                        {(item.status === null || item.status === 0) && (
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg shadow-green-100 transition-all active:scale-90"
                            title="Approve"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {(item.status === null || item.status === 1) && (
                          <button
                            onClick={() => openRejectModal(item)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-100 transition-all active:scale-90"
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Modal (unchanged) */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">Reject Provider</h2>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-white hover:text-red-400 transition-colors">
                <XCircle size={28} />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-8 space-y-6">
              <p className="text-slate-600 text-sm">
                Please provide a reason for rejecting <strong>{selectedProvider?.name}</strong>. This will be sent via email.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rejection Reason</label>
                <textarea
                  required rows="4"
                  className="w-full bg-slate-100 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-red-500 transition-all text-slate-700 font-medium"
                  placeholder="e.g. ID document is blurry or expired..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black py-4 rounded-2xl transition-all text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-100 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                >
                  <XCircle size={18} />
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Verification;