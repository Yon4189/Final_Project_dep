import React from 'react';
import { useLocation } from 'react-router-dom';
import { Database, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useBookingsData } from '../hooks/useBookingsData';
import BookingsTable from '../components/BookingsTable';

const Bookings = () => {
  const location = useLocation();
  const { bookings, isLoading, isError, error, refetch } = useBookingsData();

  // Determine status filter from URL
  const getStatusFromPath = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/bookings/pending')) return 'Pending';
    if (path.includes('/bookings/accepted')) return 'Accepted';
    if (path.includes('/bookings/completed')) return 'Completed';
    if (path.includes('/bookings/cancelled')) return 'Cancelled';
    if (path.includes('/bookings/rejected')) return 'Rejected';
    if (path.includes('/bookings/expired')) return 'Expired';
    return 'All';
  };
  const statusFilter = getStatusFromPath();

  const dbStatus = isError ? 'disconnected' : (isLoading ? 'checking' : 'connected');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Booking Oversight</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">
            Booking Management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Database size={14} className={
              dbStatus === 'connected' ? 'text-green-500' :
                dbStatus === 'disconnected' ? 'text-red-500' : 'text-yellow-500 animate-pulse'
            } />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {dbStatus === 'connected' && 'Database Connected'}
              {dbStatus === 'disconnected' && 'Database Disconnected'}
              {dbStatus === 'checking' && 'Checking Database...'}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Refresh data"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <BookingsTable
        bookings={bookings}
        statusFilter={statusFilter}
        isLoading={isLoading}
        dbStatus={dbStatus}
        error={error}
        onRefresh={refetch}
      />
    </div>
  );
};

export default Bookings;