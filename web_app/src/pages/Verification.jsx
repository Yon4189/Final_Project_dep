import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Search, CheckCircle, XCircle, Loader2, Database,
  Eye, FileCheck, X, Image as ImageIcon, AlertCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../api/axios';

const getFilterFromPath = (pathname) => {
  if (pathname.includes('/verification/pending')) return 'Pending';
  if (pathname.includes('/verification/approved')) return 'Approved';
  if (pathname.includes('/verification/rejected')) return 'Rejected';
  if (pathname.includes('/verification/suspended')) return 'Suspended';
  return 'Pending';
};

const Verification = () => {
  const queryClient = useQueryClient();
  const location = useLocation();

  const filter = getFilterFromPath(location.pathname);
  const [processingId, setProcessingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 1. Data Fetching with TanStack Query
  const { 
    data: providers = [], 
    isLoading: loading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['providers', filter],
    queryFn: async () => {
      let endpoint = '/admin/providers/pending';
      if (filter === 'Approved') endpoint = '/admin/providers/approved';
      if (filter === 'Rejected') endpoint = '/admin/providers/rejected';
      if (filter === 'Suspended') endpoint = '/admin/providers/suspended';
      if (filter === 'All') endpoint = '/admin/providers';

      const response = await api.get(endpoint);
      return response.data.success ? (response.data.data || []) : [];
    },
    staleTime: 30000, 
    refetchInterval: 10000,
  });

  const dbStatus = error ? 'disconnected' : (loading ? 'checking' : 'connected');

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [descriptionModal, setDescriptionModal] = useState({
    show: false,
    description: '',
    providerName: ''
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const handleApprove = async (id, name) => {
    if (!window.confirm(`Approve ${name} and notify them via email?`)) return;
    setProcessingId(id);
    try {
      const response = await api.post(`/admin/providers/${id}/verify`, { status: 'approved' });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['providers'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        alert("Account Approved & Email Sent!");
      }
    } catch {
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
      const response = await api.post(`/admin/providers/${selectedProvider.id}/verify`, {
        status: 'rejected',
        verification_reason: rejectionReason
      });
      if (response.data.success) {
        setIsRejectModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['providers'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        alert("Provider Rejected & Notified.");
      }
    } catch {
      alert('Network Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (id, name) => {
    if (!window.confirm(`Are you sure you want to suspend ${name}? They will be notified and hidden from search.`)) return;
    setProcessingId(id);
    try {
      const response = await api.post(`/admin/providers/${id}/verify`, {
        status: 'suspended',
        verification_reason: 'Account suspended by administration.'
      });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['providers'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        alert("Provider Suspended Successfully.");
      }
    } catch {
      alert('Action failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const getBackendUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace('/api', '').replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
  };

  const viewFile = (filePath) => {
    if (!filePath) return alert("No file found for this record.");
    window.open(getBackendUrl(filePath), '_blank');
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
    const providerId = p.id ? String(p.id) : '';
    const searchLower = searchQuery.toLowerCase();
    return name.toLowerCase().includes(searchLower) ||
      service.toLowerCase().includes(searchLower) ||
      title.toLowerCase().includes(searchLower) ||
      providerId.includes(searchLower);
  });

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProviders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProviders.length / itemsPerPage) || 1;

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">
              {filter} Providers
            </h1>
            {providers.length > 0 && (
              <span className="bg-blue-600 text-white text-[12px] px-3 py-1 rounded-full font-black shadow-lg shadow-blue-200 animate-in zoom-in duration-300">
                {providers.length}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest italic mt-1">
            Verification Management System
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm font-black text-[10px] uppercase">
            <Database size={14} className={dbStatus === 'connected' ? 'text-green-500' : 'text-red-500'} />
            <span className="text-slate-500">{dbStatus}</span>
          </div>
          <button onClick={() => refetch()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm">
            Refresh
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
          <div className="flex-1 overflow-auto">
            <div className="hidden lg:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5">Provider Full Name</th>
                    <th className="px-8 py-5">Category</th>
                    <th className="px-8 py-5">Service</th>
                    <th className="px-8 py-5">Service Description</th>
                    <th className="px-8 py-5">Est. Cost</th>
                    <th className="px-8 py-5">Verification Files</th>
                    <th className="px-8 py-5">Submission</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">

                      {/* Full Name – profile picture + name */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          {item.profilePicture ? (
                            <img
                              src={getBackendUrl(item.profilePicture)}
                              alt={item.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 shrink-0"
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0"
                            style={{ display: item.profilePicture ? 'none' : 'flex' }}
                          >
                            {item.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight whitespace-nowrap">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{item.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-5">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.service_type || 'N/A'}</p>
                      </td>

                      {/* Service Title */}
                      <td className="px-6 py-5">
                        <p className="text-[10px] text-blue-600 font-bold">{item.service_title || '—'}</p>
                      </td>

                      {/* Service Description – truncated + modal */}
                      <td className="px-6 py-5 max-w-[180px]">
                        {item.service_description ? (
                          <div>
                            <p className="text-[11px] text-slate-600 font-medium leading-snug line-clamp-2">
                              {item.service_description}
                            </p>
                            <button
                              onClick={() => openDescriptionModal(item.service_description, item.name)}
                              className="mt-1 flex items-center gap-1 text-blue-500 hover:text-blue-700 font-black text-[9px] uppercase"
                            >
                              <Eye size={10} /> Read more
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">No description</span>
                        )}
                      </td>

                      {/* Est. Cost */}
                      <td className="px-6 py-5 text-center">
                        <span className="font-black font-mono text-sm text-emerald-600">
                          {item.estimated_cost != null ? (
                            <>{item.estimated_cost} <span className="text-[10px]">ETB</span></>
                          ) : (
                            <span className="text-slate-300 text-[10px] italic">—</span>
                          )}
                        </span>
                      </td>

                      {/* Verification Files – ID doc + Licence */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5 items-center">
                          <button
                            onClick={() => viewFile(item.idPhoto)}
                            className="w-28 bg-slate-900 text-white py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 hover:bg-black transition-colors"
                          >
                            <ImageIcon size={10} />
                            {item.idPhotoType ? item.idPhotoType.split(' ')[0].toUpperCase() : 'ID DOC'}
                          </button>
                          <button
                            onClick={() => viewFile(item.credentialPhoto)}
                            className="w-28 bg-blue-600 text-white py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 hover:bg-blue-700 transition-colors"
                          >
                            <FileCheck size={10} /> LICENCE
                          </button>
                        </div>
                      </td>

                      {/* Submission date */}
                      <td className="px-6 py-5 text-center">
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{item.submission_date}</span>
                      </td>

                      {/* Status badge */}
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${item.status?.toLowerCase() === 'active' ? 'bg-green-50 text-green-600 border-green-100' :
                          item.status?.toLowerCase() === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                            item.status?.toLowerCase() === 'suspended' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                          {item.status ?? 'Pending'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          {processingId === item.id ? (
                            <div className="flex items-center gap-2 text-slate-300 font-bold text-[10px] pr-4 italic">
                              <Loader2 className="animate-spin" size={14} /> PROCESSING...
                            </div>
                          ) : (
                            <>
                              {(item.status?.toLowerCase() === 'pending' || item.status === null || item.status?.toLowerCase() === 'rejected') && (
                                <button
                                  onClick={() => handleApprove(item.id, item.name)}
                                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 transition-all active:scale-90"
                                >
                                  <CheckCircle size={14} /> Approve
                                </button>
                              )}
                              {(item.status?.toLowerCase() === 'pending' || item.status === null || item.status?.toLowerCase() === 'active') && (
                                <button
                                  onClick={() => openRejectModal(item)}
                                  className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-100 transition-all active:scale-90"
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                              )}
                              {item.status?.toLowerCase() === 'active' && (
                                <button
                                  onClick={() => handleSuspend(item.id, item.name)}
                                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-amber-100 transition-all active:scale-90"
                                >
                                  <AlertCircle size={14} /> Suspend
                                </button>
                              )}
                              {item.status?.toLowerCase() === 'suspended' && (
                                <button
                                  onClick={() => handleApprove(item.id, item.name)}
                                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 transition-all active:scale-90"
                                >
                                  <CheckCircle size={14} /> Reactivate
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

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 space-y-4">
              {currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <div key={item.id} className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-4">
                    <div className="flex items-center gap-3">
                      {item.profilePicture ? (
                        <img
                          src={getBackendUrl(item.profilePicture)}
                          alt={item.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0" style={{ display: item.profilePicture ? 'none' : 'flex' }}>
                         {item.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{item.email}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-2 border-y border-slate-100 border-dashed">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Category</p>
                        <p className="text-[11px] font-bold text-slate-800">{item.service_type || 'N/A'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${item.status?.toLowerCase() === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                        {item.status ?? 'Pending'}
                      </span>
                    </div>

                    <div className="space-y-3">
                         <div className="flex gap-2">
                           <button onClick={() => viewFile(item.idPhoto)} className="flex-1 bg-slate-100 py-2.5 rounded-xl text-[9px] font-black uppercase text-slate-600 flex items-center justify-center gap-2">
                             <ImageIcon size={14} /> ID DOC
                           </button>
                           <button onClick={() => viewFile(item.credentialPhoto)} className="flex-1 bg-blue-50 py-2.5 rounded-xl text-[9px] font-black uppercase text-blue-600 flex items-center justify-center gap-2 border border-blue-100">
                             <FileCheck size={14} /> Licence
                           </button>
                         </div>

                         {processingId === item.id ? (
                           <div className="py-3 text-center text-[10px] font-black text-slate-400 uppercase italic">Processing...</div>
                         ) : (
                           <div className="grid grid-cols-2 gap-2">
                             {(item.status?.toLowerCase() === 'pending' || item.status === null || item.status?.toLowerCase() === 'suspended') && (
                               <button onClick={() => handleApprove(item.id, item.name)} className="bg-green-500 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100">
                                  {item.status?.toLowerCase() === 'suspended' ? 'Reactivate' : 'Approve'}
                               </button>
                             )}
                             {(item.status?.toLowerCase() === 'pending' || item.status === null || item.status?.toLowerCase() === 'active') && (
                               <button onClick={() => openRejectModal(item)} className="bg-red-500 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-100">
                                 Reject
                               </button>
                             )}
                           </div>
                         )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-[10px] font-black text-slate-300 uppercase italic">No records found.</div>
              )}
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && dbStatus === 'connected' && filteredProviders.length > itemsPerPage && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              Entries {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredProviders.length)} of {filteredProviders.length}
            </span>
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => paginate(currentPage - 1)}
                className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-20 transition-all text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => paginate(currentPage + 1)}
                className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-20 transition-all text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
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