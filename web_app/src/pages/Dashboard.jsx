import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, Clock, Banknote, Layers, Wrench,
  CheckCircle, XCircle, Loader2, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import api from '../api/axios'; // Ensure your axios instance is imported
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  // 1. Queue State
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // 2. Stats State
  const [counts, setCounts] = useState({
    providers: 0,
    customers: 0,
    categories: 0,
    services: 0,
    revenue: 0
  });

  // 2. Fetch Pending Providers
  useEffect(() => {
    fetchPendingProviders();
  }, []);

  const fetchPendingProviders = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/providers/pending');
      const data = await response.json();
      if (data.success) {
        setVerificationQueue(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch pending providers:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Action Handlers (Connected to Backend)
  const handleApprove = async (id, name) => {
    if (!window.confirm(`Are you sure you want to APPROVE ${name}?`)) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/providers/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: true })
      });
      const data = await response.json();

      if (data.success) {
        // Remove from list
        setVerificationQueue(prev => prev.filter(item => item.id !== id));
        // alert(`${name} has been approved.`);
      } else {
        alert(data.message || 'Failed to approve');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const handleReject = async (id, name) => {
    const reason = window.prompt(`Enter reason for rejecting ${name}:`);
    if (!reason) return; // Cancelled

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/providers/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isVerified: false,
          verification_reason: reason
        })
      });
      const data = await response.json();

      if (data.success) {
        // Remove from list
        setVerificationQueue(prev => prev.filter(item => item.id !== id));
        // alert(`${name} has been rejected.`);
      } else {
        alert(data.message || 'Failed to reject');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  // 3. HELPER: VIEW ID PHOTO
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

      {/* Verification Queue Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            Verification Queue
            <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">
              {verificationQueue.length} Pending
            </span>
          </h2>
          <Link to="/verification" className="text-admin-accent text-sm font-bold hover:text-blue-700 transition-colors">
            View All Queue
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-200">
              <tr>
                <th className="px-8 py-5">Provider Name</th>
                <th className="px-8 py-5">Service Category</th>
                <th className="px-8 py-5 text-center">ID Document</th>
                <th className="px-8 py-5">Credential Type</th>
                <th className="px-8 py-5 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {verificationQueue.length > 0 ? (
                verificationQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase border border-slate-200 shadow-sm">
                          {item.name?.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                      {item.service_type || item.service || 'Unspecified'}
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
                        {item.credentials || item.doc || 'ID_CARD'}
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
                              onClick={() => handleApprove(item.id, item.name)}
                              className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all active:scale-90"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(item.id, item.name)}
                              className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all active:scale-90"
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;