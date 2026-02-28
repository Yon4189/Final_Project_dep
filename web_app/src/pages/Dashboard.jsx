import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, Clock, Banknote, Layers, Wrench,
  CheckCircle, XCircle, Loader2, Image as ImageIcon, RefreshCw,
  FileCheck, Calendar, Database, AlertCircle, Info, DollarSign,
  Eye, X  // 👈 added Eye icon
} from 'lucide-react';
import api from '../api/axios';
import StatCard from '../components/StatCard';

const Dashboard = () => {
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [counts, setCounts] = useState({
    providers: 0,
    customers: 0,
    pending: 0,
    categories: 0,
    services: 0,
    revenue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');

  // State for description modal
  const [descriptionModal, setDescriptionModal] = useState({
    show: false,
    description: '',
    providerName: ''
  });

  // State for rejection reason modal
  const [rejectModal, setRejectModal] = useState({
    show: false,
    providerId: null,
    providerName: '',
    defaultReason: 'Provided service details or documents are invalid.',
    inputReason: ''
  });

  const fetchData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        api.get('/providers/pending'),
        api.get('/admin/stats')
      ]);

      if (queueRes.data.success) setVerificationQueue(queueRes.data.data);
      if (statsRes.data.success) setCounts(statsRes.data.data);

      setDbStatus('connected');
    } catch (err) {
      setDbStatus('disconnected');
      console.error("Fetch Error:", err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Modal-based verify action
  const handleVerifyAction = (id, name, approve) => {
    if (!approve) {
      setRejectModal({
        show: true,
        providerId: id,
        providerName: name,
        defaultReason: 'Provided service details or documents are invalid.',
        inputReason: ''
      });
      return;
    }
    if (!window.confirm(`Approve ${name} and publish their service to the marketplace?`)) return;
    processVerifyAction(id, 'approved');
  };

  // Actually send verify/reject request
  const processVerifyAction = async (id, status, reason = null) => {
    setProcessingId(id);
    try {
      const response = await api.post(`/providers/${id}/verify`, {
        status,
        verification_reason: reason
      });
      if (response.data.success) {
        setVerificationQueue(prev => prev.filter(item => item.id !== id));
        alert(status === 'approved' ? "Account & Service Approved!" : "Provider Rejected.");
        fetchData();
      }
    } catch {
      alert("Action failed. Ensure backend mail server is active.");
    } finally {
      setProcessingId(null);
    }
  };
  // Handle rejection modal submit
  const handleRejectSubmit = () => {
    if (!rejectModal.inputReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    setRejectModal({ ...rejectModal, show: false });
    processVerifyAction(rejectModal.providerId, 'rejected', rejectModal.inputReason);
  };

  // Handle rejection modal cancel
  const handleRejectCancel = () => {
    setRejectModal({ show: false, providerId: null, providerName: '', defaultReason: '', inputReason: '' });
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

  // Open modal with full description
  const openDescriptionModal = (description, providerName) => {
    setDescriptionModal({
      show: true,
      description: description || 'No description provided.',
      providerName
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Rejection Reason Modal */}
      {rejectModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-red-500 text-white flex justify-between items-center">
              <h2 className="text-lg font-black italic tracking-tighter uppercase">
                Reject Provider – {rejectModal.providerName}
              </h2>
              <button onClick={handleRejectCancel}>
                <XCircle size={28} />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-slate-700 font-bold mb-2 text-xs uppercase">Rejection Reason</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                rows={3}
                placeholder={rejectModal.defaultReason}
                value={rejectModal.inputReason}
                onChange={e => setRejectModal({ ...rejectModal, inputReason: e.target.value })}
              />
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={handleRejectCancel}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className="bg-red-500 hover:bg-red-600 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-all"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Description Modal */}
      {descriptionModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">
                Service Description – {descriptionModal.providerName}
              </h2>
              <button onClick={() => setDescriptionModal({ show: false, description: '', providerName: '' })}>
                <XCircle size={28} />
              </button>
            </div>
            <div className="p-8">
              <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">
                {descriptionModal.description}
              </p>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDescriptionModal({ show: false, description: '', providerName: '' })}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest italic">Service connected Oversight</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Database size={14} className={dbStatus === 'connected' ? 'text-green-500' : 'text-red-500'} />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              {dbStatus === 'connected' ? 'Database connected' : 'Database dis connected'}
            </span>
          </div>
          <button
            onClick={fetchData}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Providers" value={counts.providers} icon={Users} color="bg-blue-500" />
        <StatCard title="Customers" value={counts.customers} icon={UserCheck} color="bg-emerald-500" />
        <StatCard title="Pending" value={verificationQueue.length} icon={Clock} color="bg-orange-500" />
        <StatCard title="Categories" value={counts.categories} icon={Layers} color="bg-purple-500" />
        <StatCard title="Services" value={counts.services} icon={Wrench} color="bg-indigo-500" />
        <StatCard title="Revenue" value={counts.revenue?.toLocaleString() || '0'} icon={Banknote} color="bg-green-600" />
      </div>

      {/* Verification Queue Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-white/50 flex justify-between items-center">
          <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            Verification Queue
            <span className="bg-admin-accent text-white px-2 py-0.5 rounded-full text-[9px] font-black">
              {verificationQueue.length}
            </span>
          </h2>
          <span className="text-[10px] font-bold text-slate-400 italic underline underline-offset-4">Review service details before approval</span>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-3 italic">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying MySQL Data...</span>
            </div>
          ) : verificationQueue.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black border-b border-slate-100 tracking-tighter">
                <tr>
                  <th className="px-6 py-5">Provider Full Name</th>
                  <th className="px-6 py-5">Category</th>
                  <th className="px-6 py-5">Service</th>
                  <th className="px-6 py-5">Service Description</th>
                  <th className="px-6 py-5">Est. Cost</th>
                  <th className="px-6 py-5 text-center">Verification Files</th>
                  <th className="px-6 py-5 text-center">Submission</th>
                  <th className="px-8 py-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {verificationQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Full Name – profile picture + name */}
                    <td className="px-6 py-5">
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

                    <td className="px-6 py-5">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-black uppercase border border-slate-200">
                        {item.service_type || 'Root'}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <p className="text-xs font-black text-blue-600 uppercase tracking-tighter">
                        {item.service_title || '—'}
                      </p>
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

                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <Calendar size={12} className="text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">
                          {item.submission_date || 'Unknown'}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-5">
                      <div className="flex justify-end gap-3">
                        {processingId === item.id ? (
                          <div className="flex items-center gap-2 text-slate-300 font-bold text-[9px] italic pr-2">
                            <Loader2 className="animate-spin" size={14} /> MAILING...
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleVerifyAction(item.id, item.name, true)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 transition-all active:scale-90"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleVerifyAction(item.id, item.name, false)}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-90"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-24 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                <CheckCircle className="text-slate-300" size={32} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verification Queue is Empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;