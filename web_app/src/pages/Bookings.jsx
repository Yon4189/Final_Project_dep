import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar, User, Wrench, MapPin,
  CheckCircle, XCircle, Eye, Search,
  Clock, DollarSign, Database,
  AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import api from '../api/axios';

const Bookings = () => {
  const location = useLocation();

  // Determine status from URL (now includes Pending)
  const getStatusFromPath = () => {
    if (location.pathname.includes('/bookings/pending')) return 'Pending';
    if (location.pathname.includes('/bookings/accepted')) return 'Accepted';
    if (location.pathname.includes('/bookings/completed')) return 'Completed';
    if (location.pathname.includes('/bookings/cancelled')) return 'Cancelled';
    return 'Pending'; // default
  };

  // 1. Data State
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');
  const [status, setStatus] = useState(getStatusFromPath());

  // 2. UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Update status when route changes
  useEffect(() => {
    setStatus(getStatusFromPath());
  }, [location.pathname]);

  // 3. Mock Data (add a Pending booking)
  const mockBookings = [
    {
      id: "BK-2001",
      customer: "Yonas Abate",
      provider: "Kassahun T.",
      service: "Plumbing",
      status: "Accepted",
      date: "Feb 1, 2026",
      time: "10:30 AM",
      location: "Bole, Addis Ababa",
      amount: "450 ETB"
    },
    {
      id: "BK-2002",
      customer: "Abebe Balcha",
      provider: "Hanna Alemu",
      service: "Cleaning",
      status: "Completed",
      date: "Jan 31, 2026",
      time: "09:00 AM",
      location: "Megenagna, Addis Ababa",
      amount: "600 ETB"
    },
    {
      id: "BK-2003",
      customer: "Sara K.",
      provider: "Yared T.",
      service: "Car Wash",
      status: "Cancelled",
      date: "Jan 31, 2026",
      time: "02:00 PM",
      location: "Sarbet, Addis Ababa",
      amount: "250 ETB"
    },
    {
      id: "BK-2004",
      customer: "Nathenael Y.",
      provider: "Selam T.",
      service: "Electrical",
      status: "Accepted",
      date: "Feb 2, 2026",
      time: "08:45 AM",
      location: "Piassa, Addis Ababa",
      amount: "350 ETB"
    },
    // New pending booking
    {
      id: "BK-2005",
      customer: "Meron A.",
      provider: "Tigist W.",
      service: "Plumbing",
      status: "Pending",
      date: "Feb 3, 2026",
      time: "11:00 AM",
      location: "Kazanchis, Addis Ababa",
      amount: "300 ETB"
    }
  ];

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setBookings(mockBookings);
      setDbStatus('connected');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch bookings');
      setDbStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Filter by status and search
  const filteredBookings = bookings.filter(b => {
    const matchesStatus = b.status === status;
    const matchesSearch = b.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'Accepted': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Completed': return 'bg-green-50 text-green-600 border-green-200';
      case 'Cancelled': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header with Database Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">Service Bookings</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-tighter">
            {status} bookings
          </p>
        </div>

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
            {dbStatus === 'disconnected' && <AlertCircle size={14} className="text-red-500" />}
          </div>

          <button
            onClick={fetchBookings}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by customer, provider, service..."
          className="pl-10 pr-4 py-3 border border-slate-200 rounded-2xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-20">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading bookings...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-20">
            <AlertCircle className="text-red-500" size={40} />
            <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-2 text-xs bg-slate-100 px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              Retry
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No {status.toLowerCase()} bookings found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">Booking ID</th>
                  <th className="px-8 py-5">Client & Specialist</th>
                  <th className="px-8 py-5">Service Type</th>
                  <th className="px-8 py-5">Current Status</th>
                  <th className="px-8 py-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        {b.id}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-slate-900">{b.customer}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Provider: {b.provider}</div>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-medium">{b.service}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="p-2 bg-admin-accent hover:bg-blue-600 text-white rounded-xl transition-all shadow-md shadow-blue-100 active:scale-90"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            {/* Modal Header */}
            <div className={`p-8 text-white flex justify-between items-center ${
              selectedBooking.status === 'Cancelled' ? 'bg-red-600' :
              selectedBooking.status === 'Completed' ? 'bg-green-600' :
              selectedBooking.status === 'Accepted' ? 'bg-blue-600' :
              'bg-yellow-600' // Pending
            }`}>
              <div>
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Case File</p>
                <h2 className="text-xl font-black italic">{selectedBooking.id}</h2>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="hover:rotate-90 transition-transform duration-300"
              >
                <XCircle size={28} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Status Banner */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${getStatusStyle(selectedBooking.status)}`}>
                {selectedBooking.status === 'Completed' ? <CheckCircle size={24} /> :
                 selectedBooking.status === 'Cancelled' ? <XCircle size={24} /> :
                 <Clock size={24} />}
                <div>
                  <p className="text-xs font-black uppercase">Current Booking State</p>
                  <p className="text-lg font-black">{selectedBooking.status}</p>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><User size={12} /> Customer</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBooking.customer}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Wrench size={12} /> Service Specialist</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBooking.provider}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Calendar size={12} /> Scheduled Date</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBooking.date}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{selectedBooking.time}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><DollarSign size={12} /> Total Fee</p>
                  <p className="text-sm font-black text-slate-900">{selectedBooking.amount}</p>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><MapPin size={12} /> Service Location</p>
                <p className="text-sm font-bold text-slate-700">{selectedBooking.location}</p>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95"
              >
                Cancel View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;