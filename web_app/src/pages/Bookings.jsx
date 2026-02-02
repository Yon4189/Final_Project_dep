import React, { useState } from 'react';
import { 
  Calendar, User, Wrench, MapPin, 
  CheckCircle, XCircle, Eye, Search, 
  Clock, DollarSign 
} from 'lucide-react';

const Bookings = () => {
  // 1. Mock Data with only the three required statuses
  const [bookings] = useState([
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
    }
  ]);

  const [filter, setFilter] = useState('All');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const filteredBookings = bookings.filter(b => filter === 'All' || b.status === filter);

  // Status Style Mapper
  const getStatusStyle = (status) => {
    switch(status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Accepted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Service Bookings</h1>
          <p className="text-slate-500 text-sm">Track and monitor all service requests on the platform.</p>
        </div>
      </div>

      {/* Filter Tabs - Limited to Cancelled, Completed, Accepted */}
      <div className="flex gap-2 p-1 bg-slate-100 w-fit rounded-xl border border-slate-200">
        {['All', 'Accepted', 'Completed', 'Cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              filter === s 
              ? 'bg-white text-admin-accent shadow-sm border border-slate-200' 
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Booking ID</th>
              <th className="px-6 py-4">Client & Specialist</th>
              <th className="px-6 py-4">Service Type</th>
              <th className="px-6 py-4">Current Status</th>
              <th className="px-6 py-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    {b.id}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-slate-900">{b.customer}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Provider: {b.provider}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{b.service}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(b.status)}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedBooking(b)}
                    className="p-2 bg-admin-accent hover:bg-blue-600 text-white rounded-lg transition-all shadow-md shadow-blue-100 active:scale-90"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBookings.length === 0 && (
          <div className="p-20 text-center text-slate-400 italic font-medium">No bookings found for this category.</div>
        )}
      </div>

      {/* --- BOOKING DETAIL MODAL --- */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            {/* Modal Header */}
            <div className={`p-6 text-white flex justify-between items-center ${
              selectedBooking.status === 'Cancelled' ? 'bg-red-600' : 
              selectedBooking.status === 'Completed' ? 'bg-green-600' : 'bg-slate-900'
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
                {selectedBooking.status === 'Completed' ? <CheckCircle size={24}/> : 
                 selectedBooking.status === 'Cancelled' ? <XCircle size={24}/> : <Clock size={24}/>}
                <div>
                  <p className="text-xs font-black uppercase">Current Booking State</p>
                  <p className="text-lg font-black">{selectedBooking.status}</p>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><User size={12}/> Customer</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBooking.customer}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Wrench size={12}/> Service Specialist</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBooking.provider}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Calendar size={12}/> Scheduled Date</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBooking.date}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{selectedBooking.time}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><DollarSign size={12}/> Total Fee</p>
                  <p className="text-sm font-black text-slate-900">{selectedBooking.amount}</p>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><MapPin size={12}/> Service Location</p>
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