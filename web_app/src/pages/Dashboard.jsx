import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Clock, Banknote, Layers, Wrench,
  CheckCircle, XCircle, Loader2, Image as ImageIcon, ExternalLink 
} from 'lucide-react';
import api from '../api/axios'; // Ensure your axios instance is imported
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [counts, setCounts] = useState({
    providers: 0,
    customers: 0,
    categories: 0,
    services: 0,
    revenue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // 🚀 1. FETCH DATA (Queue + Platform Stats)
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Pending Providers
      const queueRes = await api.get('/providers/pending');
      
      // Fetch Detailed Stats
      const statsRes = await api.get('/admin/stats'); 
      
      if (queueRes.data.success) setVerificationQueue(queueRes.data.data);
      if (statsRes.data.success) setCounts(statsRes.data.data);

    } catch (err) {
      console.error("Database connection issue. Check Laravel backend.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🚀 2. VERIFICATION LOGIC (Approve/Reject)
  const handleVerify = async (id, name, isApproved) => {
    let reason = null;
    if (!isApproved) {
      reason = window.prompt(`Rejection reason for ${name}:`, "Incomplete documents");
      if (reason === null) return;
    } else {
      if (!window.confirm(`Approve ${name} and notify via email?`)) return;
    }

    setProcessingId(id);
    try {
      const response = await api.post(`/providers/${id}/verify`, {
        isVerified: isApproved,
        verification_reason: reason
      });

      if (response.data.success) {
        setVerificationQueue(prev => prev.filter(item => item.id !== id));
        alert(isApproved ? "Approved! Welcome email sent." : "Rejected! Notification email sent.");
      }
    } catch (err) {
      alert("Error: Email service offline or network failure.");
    } finally {
      setProcessingId(null);
    }
  };

  // 🚀 3. HELPER: VIEW ID PHOTO
  const viewPhoto = (photoPath) => {
    if (!photoPath) return alert("No photo file path found.");
    const fullUrl = `http://127.0.0.1:8000/storage/${photoPath}`;
    window.open(fullUrl, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Platform performance & management</p>
      </header>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Providers" value={counts.providers} icon={Users} color="bg-emerald-500" />
        <StatCard title="Customers" value={counts.customers} icon={UserCheck} color="bg-emerald-300" />
        <StatCard title="Pending" value={verificationQueue.length} icon={Clock} color="bg-orange-500" />
        <StatCard title="Categories" value={counts.categories} icon={Layers} color="bg-indigo-400" />
        <StatCard title="Services" value={counts.services} icon={Wrench} color="bg-indigo-500" />
        <StatCard title="Revenue (ETB)" value={counts.revenue.toLocaleString()} icon={Banknote} color="bg-purple-500" />
      </div>

      {/* --- VERIFICATION QUEUE TABLE --- */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            Verification Queue 
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
              {verificationQueue.length}
            </span>
          </h2>
          <button onClick={fetchData} className="text-[10px] font-black text-blue-600 uppercase hover:underline">
            Refresh List
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying MySQL...</span>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Provider Name</th>
                  <th className="px-8 py-5">Service Category</th>
                  <th className="px-8 py-5 text-center">ID Document</th>
                  <th className="px-8 py-5">Credential Type</th>
                  <th className="px-8 py-5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {verificationQueue.length > 0 ? (
                  verificationQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase border border-slate-200 shadow-sm">
                             {item.name.charAt(0)}
                           </div>
                           <span className="font-bold text-slate-800">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                        {item.service_type || 'Unspecified'}
                      </td>
                      
                      <td className="px-8 py-5 text-center">
                         <button 
                           onClick={() => viewPhoto(item.idPhoto)}
                           className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-black active:scale-90 shadow-lg shadow-slate-200"
                         >
                           <ImageIcon size={14} />
                           View ID
                           <ExternalLink size={10} />
                         </button>
                      </td>

                      <td className="px-8 py-5">
                         <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100 uppercase italic">
                            {item.credentials || 'ID_CARD'}
                         </span>
                      </td>

                      <td className="px-8 py-5">
                        <div className="flex justify-end gap-3">
                          {processingId === item.id ? (
                            <div className="flex items-center gap-2 text-slate-300 font-bold text-[10px] pr-4">
                              <Loader2 className="animate-spin" size={14} /> SENDING MAIL...
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleVerify(item.id, item.name, true)}
                                className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-green-100 transition-all active:scale-90"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleVerify(item.id, item.name, false)}
                                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-red-100 transition-all active:scale-90"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest italic">
                      Verification Queue is Clear.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;