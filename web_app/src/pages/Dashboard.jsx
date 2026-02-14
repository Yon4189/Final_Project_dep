import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Clock, Banknote, Layers, Wrench,
  CheckCircle, XCircle, Loader2, Image as ImageIcon, RefreshCw, FileCheck, Calendar, Database 
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
  const [dbStatus, setDbStatus] = useState('checking'); // 'checking', 'connected', 'disconnected'

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
      console.error("Database connection issue. Check if Laravel server is running.");
      setDbStatus('disconnected');
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
      reason = window.prompt(`Enter rejection reason for ${name}:`, "Documents provided are not clear.");
      if (reason === null) return; 
    } else {
      if (!window.confirm(`Approve ${name} and send system verification email?`)) return;
    }

    setProcessingId(id);
    try {
      const response = await api.post(`/providers/${id}/verify`, {
        isVerified: isApproved,
        verification_reason: reason
      });

      if (response.data.success) {
        setVerificationQueue(prev => prev.filter(item => item.id !== id));
        alert(isApproved ? "Approved! Notification sent." : "Rejected! Reason sent.");
        fetchData();
      }
    } catch (err) {
      alert("Action failed: Ensure your backend MAIL settings are correct.");
    } finally {
      setProcessingId(null);
    }
  };

  const viewFile = (filePath) => {
    if (!filePath) return alert("No file found for this record.");
    const backendBase = api.defaults.baseURL.replace('/api', ''); 
    const fullUrl = `${backendBase}/storage/${filePath}`;
    window.open(fullUrl, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Platform Oversight & Real-time Metrics</p>
        </div>

        {/* Database status indicator */}
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
            {dbStatus === 'disconnected' && <XCircle size={14} className="text-red-500" />}
          </div>

          <button 
            onClick={fetchData} 
            className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl text-xs font-black text-slate-600 hover:text-blue-600 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Sync Database
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
        <StatCard title="Revenue (ETB)" value={counts.revenue?.toLocaleString() || '0'} icon={Banknote} color="bg-green-600" />
      </div>

      {/* Verification Queue Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            Verification Queue 
            <span className="bg-admin-accent text-white px-2 py-0.5 rounded-full text-[9px] font-black">
              {verificationQueue.length} Waiting
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing MySQL...</span>
            </div>
          ) : dbStatus === 'disconnected' ? (
            /* 👇 Show connection error message when DB is offline */
            <div className="p-20 text-center flex flex-col items-center gap-3">
              <XCircle className="text-red-500" size={32} />
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                Database connection failed – cannot load verification queue.
              </span>
              <button
                onClick={fetchData}
                className="mt-2 text-xs bg-slate-100 px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                Retry
              </button>
            </div>
          ) : verificationQueue.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5">Provider Name</th>
                  <th className="px-6 py-5">Category</th>
                  <th className="px-6 py-5">Service</th>
                  <th className="px-6 py-5 text-center">ID Document</th>
                  <th className="px-6 py-5 text-center">Credential</th>
                  <th className="px-6 py-5 text-center">Submission Date</th>
                  <th className="px-6 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {verificationQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase border border-slate-200 shadow-sm">
                          {item.name ? item.name.charAt(0) : 'P'}
                        </div>
                        <span className="font-bold text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 font-medium">
                      {item.service_type || 'General'}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-400 italic">
                      {item.specific_service || 'Primary Specialist'}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => viewFile(item.idPhoto)}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all shadow-md active:scale-90"
                      >
                        <ImageIcon size={14} /> View
                      </button>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => viewFile(item.credentialPhoto)}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-md active:scale-90"
                      >
                        <FileCheck size={14} /> View
                      </button>
                      <p className="text-[8px] text-slate-400 mt-1 font-black uppercase">{item.credentials || 'CERTIFICATE'}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar size={12} className="text-slate-300" />
                          <span className="text-[11px] font-bold font-mono tracking-tighter">
                            {item.submission_date}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-3">
                        {processingId === item.id ? (
                          <div className="flex items-center gap-2 text-slate-300 font-bold text-[10px] pr-4 italic">
                            <Loader2 className="animate-spin" size={14} /> Processing...
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleVerifyAction(item.id, item.name, true)}
                              className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-green-100 transition-all active:scale-90"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleVerifyAction(item.id, item.name, false)}
                              className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-red-100 transition-all active:scale-90"
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
            <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest italic border-dashed border-2 border-slate-50 m-4 rounded-3xl">
              Queue is Clear: All Providers Processed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;