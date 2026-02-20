import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, CheckCircle, XCircle, FileText, Loader2,
  AlertCircle, RefreshCw, Calendar, Database, MoreVertical,
  Eye, Info, FileCheck, DollarSign, X, 
  Image as ImageIcon 
} from 'lucide-react';
import api from '../api/axios';

const Verification = () => {
  const location = useLocation();

  const getFilterFromPath = () => {
    if (location.pathname.includes('/verification/pending')) return 'Pending';
    if (location.pathname.includes('/verification/approved')) return 'Approved';
    if (location.pathname.includes('/verification/rejected')) return 'Rejected';
    return 'Pending';
  };

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');
  const [filter, setFilter] = useState(getFilterFromPath());
  const [processingId, setProcessingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [descriptionModal, setDescriptionModal] = useState({
    show: false,
    description: '',
    providerName: ''
  });

  useEffect(() => {
    setFilter(getFilterFromPath());
  }, [location.pathname]);

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
      }
    } catch (err) {
      setError('Error connecting to MySQL server');
      setDbStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [filter]);

  const handleApprove = async (id, name) => {
    if (!window.confirm(`Approve ${name} and notify them via email?`)) return;
    setProcessingId(id);
    try {
      const response = await api.post(`/providers/${id}/verify`, { isVerified: true });
      if (response.data.success) {
        fetchProviders();
        alert("Account Approved & Email Sent!");
      }
    } catch (err) {
      alert('Mail Error: Check backend SMTP settings.');
    } finally {
      setProcessingId(null);
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
    setProcessingId(selectedProvider.id);
    try {
      const response = await api.post(`/providers/${selectedProvider.id}/verify`, {
        isVerified: false,
        verification_reason: rejectionReason
      });
      if (response.data.success) {
        setIsRejectModalOpen(false);
        fetchProviders();
        alert("Provider Rejected & Notified.");
      }
    } catch (err) {
      alert('Network Error');
    } finally {
      setProcessingId(null);
    }
  };

  const viewFile = (filePath) => {
    if (!filePath) return alert("No file found for this record.");
    const backendBase = api.defaults.baseURL.replace('/api', '');
    window.open(`${backendBase}/storage/${filePath}`, '_blank');
  };

  const openDescriptionModal = (description, providerName) => {
    setDescriptionModal({
      show: true,
      description: description || 'No description provided.',
      providerName
    });
  };

  const filteredProviders = providers.filter(p => {
    const name = p.name || '';
    const service = p.service_type || '';
    const title = p.service_title || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           service.toLowerCase().includes(searchQuery.toLowerCase()) ||
           title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Description Modal */}
      {descriptionModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">
                Service Profile – {descriptionModal.providerName}
              </h2>
              <button onClick={() => setDescriptionModal({ show: false, description: '', providerName: '' })}>
                <XCircle size={28} />
              </button>
            </div>
            <div className="p-8">
              <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap font-medium italic">
                "{descriptionModal.description}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Provider Verification</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest italic">
            Current Filter: <span className="text-blue-600 font-bold">{filter}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm font-black text-[10px] uppercase">
            <Database size={14} className={dbStatus === 'connected' ? 'text-green-500' : 'text-red-500'} />
            <span className="text-slate-500">{dbStatus}</span>
          </div>
          <button onClick={fetchProviders} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text" placeholder="Quick search..."
          className="pl-12 pr-4 py-4 border border-slate-200 rounded-2xl w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="p-40 text-center flex flex-col items-center gap-4 italic font-bold text-slate-400 uppercase tracking-widest">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            Loading Data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black border-b border-slate-100 tracking-tighter">
                <tr>
                  <th className="px-8 py-5">Full Name</th>
                  <th className="px-8 py-5">Category</th>
                  <th className="px-8 py-5">Service Title</th>
                  <th className="px-8 py-5 text-center">Description</th>
                  <th className="px-8 py-5">Price</th>
                  <th className="px-8 py-5 text-center">Files</th>
                  <th className="px-8 py-5 text-center">Submitted</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProviders.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-900">{item.name}</td>
                    
                    <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase">{item.service_type || 'N/A'}</td>
                    
                    <td className="px-8 py-5">
                       <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter leading-tight max-w-[120px]">
                         {item.service_title || 'General'}
                       </p>
                    </td>
                    
                    <td className="px-8 py-5 text-center">
                      <button
                        onClick={() => openDescriptionModal(item.service_description, item.name)}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-blue-500 font-black text-[10px] uppercase mx-auto"
                      >
                        <Eye size={14} /> See Info
                      </button>
                    </td>

                    <td className="px-8 py-5 font-black font-mono text-sm text-emerald-600">
                       {item.estimated_cost} <span className="text-[10px]">ETB</span>
                    </td>

                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5 items-center">
                        <button onClick={() => viewFile(item.idPhoto)} className="w-24 bg-slate-900 text-white py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 hover:bg-black">
                          <ImageIcon size={10} /> ID DOC
                        </button>
                        <button onClick={() => viewFile(item.credentialPhoto)} className="w-24 bg-blue-600 text-white py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 hover:bg-blue-700">
                          <FileCheck size={10} /> LICENSE
                        </button>
                      </div>
                    </td>

                    <td className="px-8 py-5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{item.submission_date}</span>
                    </td>

                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                        item.status === 1 ? 'bg-green-50 text-green-600 border-green-100' :
                        item.status === 0 ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {item.status === 1 ? 'Approved' : item.status === 0 ? 'Rejected' : 'Pending'}
                      </span>
                    </td>

                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-3">
                        {processingId === item.id ? (
                          <div className="flex items-center gap-2 text-slate-300 font-bold text-[10px] pr-4 italic">
                            <Loader2 className="animate-spin" size={14} /> PROCESSING...
                          </div>
                        ) : (
                          <>
                            {(item.status === null || item.status === 0) && (
                              <button
                                onClick={() => handleApprove(item.id, item.name)}
                                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 transition-all active:scale-90"
                              >
                                <CheckCircle size={14} /> Approve
                              </button>
                            )}
                            {(item.status === null || item.status === 1) && (
                              <button
                                onClick={() => openRejectModal(item)}
                                className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-100 transition-all active:scale-90"
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-black italic uppercase">Decline Account</h2>
              <button onClick={() => setIsRejectModalOpen(false)}><X size={28} /></button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-8 space-y-6 text-left">
              <p className="text-slate-500 text-sm font-medium italic">Reason for rejecting {selectedProvider?.name}:</p>
              <textarea
                required rows="4"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-red-500 outline-none font-medium transition-all"
                placeholder="Documents are blurry..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsRejectModalOpen(false)} className="flex-1 bg-slate-100 py-4 rounded-2xl font-bold text-slate-400">Cancel</button>
                <button type="submit" className="flex-1 bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-red-700 transition-all uppercase text-[10px] tracking-widest">Confirm Reject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Verification;