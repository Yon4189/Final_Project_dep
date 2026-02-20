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

  const fetchData = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerifyAction = async (id, name, isApproved) => {
    let reason = null;
    if (!isApproved) {
      reason = window.prompt(`Enter rejection reason for ${name}:`, "Provided service details or documents are invalid.");
      if (reason === null) return;
    } else {
      if (!window.confirm(`Approve ${name} and publish their service to the marketplace?`)) return;
    }

    setProcessingId(id);
    try {
      const response = await api.post(`/providers/${id}/verify`, {
        isVerified: isApproved,
        verification_reason: reason
      });

      if (response.data.success) {
        setVerificationQueue(prev => prev.filter(item => item.id !== id));
        alert(isApproved ? "Account & Service Approved!" : "Provider Rejected.");
        fetchData();
      }
    } catch (err) {
      alert("Action failed. Ensure backend mail server is active.");
    } finally {
      setProcessingId(null);
    }
  };

  const viewFile = (filePath) => {
    if (!filePath) return alert("No file found for this record.");
    const backendBase = api.defaults.baseURL.replace('/api', '');
    window.open(`${backendBase}/storage/${filePath}`, '_blank');
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
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase border">
                          {item.name ? item.name.charAt(0) : 'P'}
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{item.name}</span>
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

                    {/* 👇 New: Clickable link "see full description" with eye icon */}
                    <td className="px-6 py-5">
                      <button
                        onClick={() => openDescriptionModal(item.service_description, item.name)}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-xs bg-transparent border-none cursor-pointer transition-colors"
                      >
                        <Eye size={16} />
                        <span className="underline underline-offset-2">description...</span>
                      </button>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1 text-emerald-600 font-black font-mono">
                        <span className="text-xs italic">{item.estimated_cost || '0'}</span>
                        <span className="text-[9px]">ETB</span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2 items-center">
                        <button
                          onClick={() => viewFile(item.idPhoto)}
                          className="w-full flex items-center justify-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-black transition-all"
                        >
                          <ImageIcon size={12} /> ID DOC
                        </button>
                        <button
                          onClick={() => viewFile(item.credentialPhoto)}
                          className="w-full flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-blue-700 transition-all"
                        >
                          <FileCheck size={12} /> LICENSE
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