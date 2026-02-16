import React, { useState, useEffect } from 'react';
import {
  Search, Filter, CheckCircle, XCircle,
  FileText, ExternalLink, MoreVertical
} from 'lucide-react';

const Verification = () => {
  // 1. Data State
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. UI State
  const [filter, setFilter] = useState('Pending'); // 'Pending', 'Approved', 'Rejected', 'All'
  const [searchQuery, setSearchQuery] = useState('');

  // 3. Modal State	
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 4. Fetch Data based on Filter	
  useEffect(() => {
    fetchProviders();
  }, [filter]);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = 'http://127.0.0.1:8000/api/providers/pending'; // Default	

      if (filter === 'Approved') endpoint = 'http://127.0.0.1:8000/api/providers/approved';
      if (filter === 'Rejected') endpoint = 'http://127.0.0.1:8000/api/providers/rejected';
      if (filter === 'All') endpoint = 'http://127.0.0.1:8000/api/providers';

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success) {
        setProviders(data.data);
      } else {
        setError(data.message || 'Failed to fetch providers');
      }
    } catch (err) {
      console.error(err);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  // 5. Handlers	
  const handleApprove = async (id) => {
    if (!window.confirm("Approve this provider? They will receive an email.")) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/providers/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: true })
      });
      const data = await response.json();

      if (data.success) {
        // Refresh list to remove the approved provider from "Pending" view, or update status	
        fetchProviders();
      } else {
        alert(data.message || 'Failed to approve');
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
      const response = await fetch(`http://127.0.0.1:8000/api/providers/${selectedProvider.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isVerified: false,
          verification_reason: rejectionReason
        })
      });
      const data = await response.json();

      if (data.success) {
        setIsRejectModalOpen(false);
        fetchProviders(); // Refresh list	
      } else {
        alert(data.message || 'Failed to reject');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };


  // 6. Filtering (Client-side search)	
  const filteredProviders = providers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.service_type && p.service_type.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Provider Verification</h1>
          <p className="text-slate-500 text-sm">Review and manage service provider credentials.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or service..."
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl w-full md:w-80 focus:outline-none focus:border-admin-accent bg-white shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-slate-200/50 w-fit rounded-xl">
        {['All', 'Approved', 'Rejected', 'Pending'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filter === tab
              ? 'bg-white text-admin-accent shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-400">Loading providers...</div>
        ) : error ? (
          <div className="p-20 text-center text-red-500">{error}</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Provider ID</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Document</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProviders.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-slate-400">#{item.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.service_type || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <button
                      // onClick={() => alert(`Opening ${item.credentials} for ${item.name}`)}
                      // In real app, open image in new tab or modal
                      className="flex items-center gap-2 text-admin-accent hover:underline text-xs font-bold"
                    >
                      <FileText size={14} />
                      {item.credentials || 'View Doc'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{item.submission_date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 1 ? 'bg-green-100 text-green-600' :
                      item.status === 0 ? 'bg-red-100 text-red-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                      {item.status === 1 ? 'Approved' : item.status === 0 ? 'Rejected' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {/* Show actions for all items, regardless of filter */}
                    <div className="flex justify-end gap-2">
                      {/* Show actions for all items, regardless of filter */}
                      {/* Approve Button: Show for Pending (null) or Rejected (0) */}
                      {(item.status === null || item.status === 0) && (
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-all"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}

                      {/* Reject Button: Show for Pending (null) or Approved (1) */}
                      {(item.status === null || item.status === 1) && (
                        <button
                          onClick={() => openRejectModal(item)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      )}

                      <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filteredProviders.length === 0 && (
          <div className="p-20 text-center text-slate-400 italic">No providers found in this category.</div>
        )}
      </div>

      {/* --- REJECTION MODAL --- */}
      {
        isRejectModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-black text-slate-900">Reject Provider</h2>
                <button onClick={() => setIsRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleRejectSubmit} className="p-6 space-y-6">
                <p className="text-slate-600 text-sm">
                  Please provide a reason for rejecting <strong>{selectedProvider?.name}</strong>. This will be sent to them via email.
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rejection Reason</label>
                  <textarea
                    required rows="4"
                    className="w-full border-2 border-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 transition-all text-slate-700 font-medium"
                    placeholder="e.g. ID document is blurry or expired..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Confirm Reject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Verification;