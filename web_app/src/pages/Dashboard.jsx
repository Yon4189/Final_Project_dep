import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, Clock, Banknote,
  CheckCircle, XCircle
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  // 1. Queue State
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const stats = [
    { title: 'Total Service Providers', value: '1,240', icon: Users, color: 'bg-blue-500' },
    { title: 'Active Customers', value: '8,560', icon: UserCheck, color: 'bg-green-500' },
    { title: 'Pending Verifications', value: verificationQueue.length, icon: Clock, color: 'bg-orange-500' },
    { title: 'Total Revenue (ETB)', value: '1,250,000', icon: Banknote, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm">Real-time statistics for the Service Finder platform.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
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
                <th className="px-6 py-4">Provider Info</th>
                <th className="px-6 py-4">Service Type</th>
                <th className="px-6 py-4">Submission Date</th>
                <th className="px-6 py-4">Credentials</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {verificationQueue.length > 0 ? (
                verificationQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
                          {item.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.service}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item.date}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[11px] font-black rounded-lg border border-blue-100 uppercase">
                        {item.doc}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleApprove(item.id, item.name)}
                          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>

                        {/* ✅ SOLID RED REJECT BUTTON */}
                        <button
                          onClick={() => handleReject(item.id, item.name)}
                          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-400 italic">
                    All clear! No pending verifications.
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