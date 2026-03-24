import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar, User, Wrench, MapPin,
  CheckCircle, XCircle, Eye, Search,
  Clock, DollarSign, Database,
  AlertCircle, RefreshCw, Loader2, Info, X
} from 'lucide-react';
import api from '../api/axios';

const Bookings = () => {
  const location = useLocation();

  // 1. Determine status from URL path (driven by Sidebar)
  const getStatusFromPath = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/bookings/pending')) return 'Pending';
    if (path.includes('/bookings/accepted')) return 'Accepted';
    if (path.includes('/bookings/completed')) return 'Completed';
    if (path.includes('/bookings/cancelled')) return 'Cancelled';
    return 'All'; // Default fallback
  };

  // --- DATA STATE ---
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');
  const [statusFilter, setStatusFilter] = useState(getStatusFromPath());

  // --- UI STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Update filter when Sidebar link is clicked
  useEffect(() => {
    setStatusFilter(getStatusFromPath());
  }, [location.pathname]);

  // 🚀 2. FETCH REAL DATA FROM LARAVEL
  const fetchBookings = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      // Hits Route::get('/admin/bookings')
      const response = await api.get('/admin/bookings');
      if (response.data.success) {
        setBookings(response.data.data);
        setDbStatus('connected');
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError('Failed to sync bookings table.');
      setDbStatus('disconnected');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial load + Polling every 30 seconds for live updates
  useEffect(() => {
    fetchBookings(true);
    const interval = setInterval(() => fetchBookings(false), 30000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 3. FILTERING LOGIC (Status + Search)
  const filteredBookings = bookings.filter(b => {
    const matchesStatus = statusFilter === 'All' || b.status.toLowerCase() === statusFilter.toLowerCase();
    
    // Safety check for names/IDs
    const customer = b.customer_name?.toLowerCase() || '';
    const provider = b.provider_name?.toLowerCase() || '';
    const id = b.id?.toString() || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch = customer.includes(query) || provider.includes(query) || id.includes(query);
    
    return matchesStatus && matchesSearch;
  });

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'accepted': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'completed': return 'bg-green-50 text-green-600 border-green-200';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header with Connection Intelligence */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Booking Oversight</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-tighter">
            Viewing <span className="text-blue-600 font-bold">{statusFilter}</span> transactions
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Database size={16} className={dbStatus === 'connected' ? 'text-green-500' : 'text-red-500'} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {dbStatus === 'connected' ? 'Live MySQL' : 'Offline'}
            </span>
            {dbStatus === 'connected' ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          </div>

          <button onClick={() => fetchBookings(true)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm active:scale-90">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Global Search bar */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text" placeholder="Search ID or Full Name..."
          className="pl-12 pr-4 py-4 border border-slate-200 rounded-2xl w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm font-medium text-sm transition-all"
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="p-40 text-center flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Syncing Records...</p>
          </div>
        ) : error ? (
          <div className="p-40 text-center flex flex-col items-center gap-4">
            <AlertCircle className="text-red-500" size={40} />
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">{error}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5">ID</th>
                    <th className="px-8 py-5">Client & Specialist</th>
                    <th className="px-8 py-5">Service Type</th>
                    <th className="px-8 py-5">Current Status</th>
                    <th className="px-8 py-5 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <span className="font-mono text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded border">#{b.id}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-bold text-slate-900">{b.customer_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase italic">Provider: {b.provider_name}</div>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-blue-500 uppercase tracking-tighter">{b.service_title}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => setSelectedBooking(b)} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-md active:scale-90">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredBookings.length === 0 && (
                <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest italic">
                  No {statusFilter.toLowerCase()} entries found.
                </div>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 space-y-4">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b) => (
                  <div key={b.id} className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[9px] font-black text-slate-300">#{b.id}</span>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">{b.customer_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase italic mt-1">to: {b.provider_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusStyle(b.status)}`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 border-dashed">
                      <p className="text-xs font-black text-blue-500 uppercase tracking-tighter">{b.service_title}</p>
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="flex items-center gap-1 text-[10px] font-black text-slate-900 uppercase bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-[10px] font-black text-slate-400 uppercase">No bookings found.</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* --- ENHANCED DETAIL MODAL --- */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 border border-slate-100">
            
            <div className={`p-8 text-white flex justify-between items-center ${
              selectedBooking.status.toLowerCase() === 'cancelled' ? 'bg-red-600' :
              selectedBooking.status.toLowerCase() === 'completed' ? 'bg-green-600' : 'bg-slate-900'
            }`}>
              <div>
                <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Platform Transaction</p>
                <h2 className="text-xl font-black italic">Booking #{selectedBooking.id}</h2>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="hover:rotate-90 transition-transform">
                <X size={28} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Financial Breakdown */}
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><DollarSign size={20}/></div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase">Total Fee</p>
                     <p className="text-xl font-black text-slate-900">{selectedBooking.price} <span className="text-xs">ETB</span></p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comm. (10%)</p>
                   <p className="text-sm font-black text-blue-500">{(selectedBooking.price * 0.1).toFixed(2)} ETB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><User size={12}/> Customer</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBooking.customer_name}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center justify-end gap-1"><Wrench size={12}/> Specialist</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBooking.provider_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Calendar size={12}/> Work Date</p>
                  <p className="text-sm font-bold text-slate-700">{selectedBooking.scheduled_at}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center justify-end gap-1"><MapPin size={12}/> Location</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{selectedBooking.location || 'Addis Ababa'}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 border-dashed">
                <p className="text-[10px] font-black text-blue-400 uppercase flex items-center gap-1 mb-2 italic">
                   <Info size={12}/> Customer Instructions
                </p>
                <p className="text-[11px] text-blue-900 leading-relaxed font-medium">
                  "{selectedBooking.notes || 'No specific notes provided for this request.'}"
                </p>
              </div>

              <button onClick={() => setSelectedBooking(null)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 uppercase text-xs tracking-widest">
                Exit Detail View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;