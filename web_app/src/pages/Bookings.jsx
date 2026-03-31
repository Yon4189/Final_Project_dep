import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Calendar, User, Wrench, MapPin,
  CheckCircle, XCircle, Eye, Search,
  Clock, DollarSign, Database,
  AlertCircle, RefreshCw, Loader2, Info, X
} from 'lucide-react';
import api from '../api/axios';

const Bookings = () => {
  const queryClient = useQueryClient();
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

  const statusFilter = getStatusFromPath();

  // 2. Data Fetching with TanStack Query
  const { 
    data: bookings = [], 
    isLoading: loading, 
    error: apiError,
    refetch 
  } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await api.get('/admin/bookings');
      return response.data.success ? (response.data.data || []) : [];
    },
    staleTime: 60000,
    refetchInterval: 30000,
  });

  const dbStatus = apiError ? 'disconnected' : (loading ? 'checking' : 'connected');
  const error = apiError ? 'Failed to sync bookings table.' : null;

  // --- UI STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

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

          <button onClick={() => refetch()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm active:scale-90">
            <RefreshCw size={20} className={loading && bookings.length === 0 ? 'animate-spin' : ''} />
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
                    <th className="px-6 py-5">Booking_ID</th>
                    <th className="px-6 py-5">Customer</th>
                    <th className="px-6 py-5">Provider</th>
                    <th className="px-6 py-5">Service_Type</th>
                    <th className="px-6 py-5">Scheduled_For</th>
                    <th className="px-6 py-2 text-center">Service_Location</th>
                    <th className="px-6 py-5 text-right">Provider_Payout</th>
                    <th className="px-6 py-5 text-center">Payment_Status</th>
                    <th className="px-6 py-5 text-center">Booking_Status</th>
                    <th className="px-6 py-5 text-right">View More</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0">
                      <td className="px-6 py-5">
                        <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded border">#{b.id}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-slate-900">{b.customer_name}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-slate-600">{b.provider_name}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-1 rounded">{b.service_type}</span>
                      </td>
                      <td className="px-6 py-5 text-xs font-semibold text-slate-500">{b.scheduled_at}</td>
                      <td className="px-6 py-5 text-center">
                         <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                           <MapPin size={12}/> {b.location?.split(',')[0] || 'Addis Ababa'}
                         </div>
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-green-600 font-mono text-xs">{b.payout} <span className="text-[9px]">ETB</span></td>
                      <td className="px-6 py-5 text-center">
                         <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${
                           b.payment_status?.toLowerCase() === 'paid' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                         }`}>
                           {b.payment_status}
                         </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button onClick={() => setSelectedBooking(b)} className="p-2 bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all active:scale-90">
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
                  <div key={b.id} className="bg-white rounded-3xl p-5 border border-slate-200 space-y-4 shadow-sm hover:border-blue-200 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[9px] font-black text-slate-300">#{b.id}</span>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">{b.customer_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase italic mt-1">To: {b.provider_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusStyle(b.status)}`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-y border-slate-100 border-dashed">
                       <p className="text-[9px] font-black text-slate-400 uppercase">Provider Payout</p>
                       <p className="text-xs font-bold text-green-600">{b.payout} ETB</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-xs font-black text-blue-500 uppercase tracking-tighter">{b.service_type}</p>
                        <span className={`mt-1 inline-block w-fit px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                           b.payment_status?.toLowerCase() === 'paid' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                         }`}>
                           {b.payment_status}
                         </span>
                      </div>
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="flex items-center gap-1 text-[10px] font-black text-slate-900 uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200"
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
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300 border border-slate-100">
            
            {/* Fixed Header */}
            <div className={`p-6 text-white flex justify-between items-center shrink-0 ${
              selectedBooking.status.toLowerCase() === 'cancelled' ? 'bg-red-600' :
              selectedBooking.status.toLowerCase() === 'completed' ? 'bg-green-600' : 'bg-slate-900'
            }`}>
              <div>
                <h2 className="text-xl font-black italic">Booking #{selectedBooking.id}</h2>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="hover:rotate-90 transition-transform p-2">
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
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



              {/* Execution Timeline Section - Vertical Professional Audit Log */}
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] border-b border-slate-200 pb-4 flex items-center gap-2 italic">
                  <Clock size={14} className="text-blue-500" /> Operational Lifecycle
                </p>
                
                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 before:border-dashed">
                  
                  {/* Accepted */}
                  <div className="flex gap-4 relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm ${selectedBooking.accepted_at !== 'Pending' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <CheckCircle size={10} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Request Accepted</p>
                      <p className={`text-xs font-bold ${selectedBooking.accepted_at !== 'Pending' ? 'text-slate-900' : 'text-slate-300 italic'}`}>
                        {selectedBooking.accepted_at}
                      </p>
                    </div>
                  </div>

                  {/* Started */}
                  <div className="flex gap-4 relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm ${selectedBooking.provider_started_at !== 'Pending' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <Wrench size={10} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Job Initiated</p>
                      <p className={`text-xs font-bold ${selectedBooking.provider_started_at !== 'Pending' ? 'text-slate-900' : 'text-slate-300 italic'}`}>
                        {selectedBooking.provider_started_at}
                      </p>
                    </div>
                  </div>

                  {/* Arrived */}
                  <div className="flex gap-4 relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm ${selectedBooking.provider_arrived_at !== 'Pending' ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <MapPin size={10} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Service On-Site</p>
                      <p className={`text-xs font-bold ${selectedBooking.provider_arrived_at !== 'Pending' ? 'text-slate-900' : 'text-slate-300 italic'}`}>
                        {selectedBooking.provider_arrived_at}
                      </p>
                    </div>
                  </div>

                  {/* Completed */}
                  <div className="flex gap-4 relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm ${selectedBooking.completed_at !== 'Pending' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <CheckCircle size={10} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Task Finalized</p>
                      <p className={`text-xs font-bold ${selectedBooking.completed_at !== 'Pending' ? 'text-slate-900' : 'text-slate-300 italic'}`}>
                        {selectedBooking.completed_at}
                      </p>
                    </div>
                  </div>

                  {/* Paid */}
                  <div className="flex gap-4 relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm ${selectedBooking.paid_at !== 'Unpaid' ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                      <DollarSign size={10} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Financial Settlement</p>
                      <p className={`text-sm font-black ${selectedBooking.paid_at !== 'Unpaid' ? 'text-slate-900' : 'text-slate-300'}`}>
                        {selectedBooking.paid_at}
                      </p>
                    </div>
                  </div>

                </div>
              </div>


              <button onClick={() => setSelectedBooking(null)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 uppercase text-xs tracking-widest shrink-0">
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