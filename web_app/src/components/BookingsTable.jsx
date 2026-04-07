import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, Eye, Calendar, MapPin, DollarSign, Clock, Wrench,
  CheckCircle, XCircle, Loader2, AlertCircle, Filter, XCircle as XCircleIcon,
  ChevronLeft, ChevronRight, UserCheck
} from 'lucide-react';

const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    case 'accepted': 
    case 'arrived':
    case 'in_progress':
    case 'started':
    case 'confirmed':
    case 'waiting_customer_confirmation':
      return 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'completed': return 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
    case 'cancelled': return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
    case 'rejected': return 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
    case 'expired': return 'bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800';
    default: return 'bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800';
  }
};

const TimelineStep = ({ label, date, icon: Icon, isComplete, isCurrent, bookingStatus }) => {
  const stepStatus = isComplete ? 'complete' : (isCurrent ? 'current' : 'pending');
  const isTerminal = ['cancelled', 'rejected', 'expired'].includes(bookingStatus?.toLowerCase());
  
  return (
    <div className="flex gap-4 relative">
      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
        stepStatus === 'complete'
          ? 'bg-green-500 text-white border-green-500'
          : stepStatus === 'current'
          ? 'bg-blue-500 text-white border-blue-500 animate-pulse'
          : 'bg-slate-100 text-slate-400 border-slate-200'
      }`}>
        {stepStatus === 'complete' ? <CheckCircle size={14} /> : <Icon size={14} />}
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-medium ${date !== 'Pending' ? 'text-slate-800' : 'text-slate-300 italic'}`}>
          {date !== 'Pending' ? date : (isTerminal ? bookingStatus : '—')}
        </p>
      </div>
    </div>
  );
};

const BookingsTable = ({
  bookings,
  statusFilter,
  isLoading,
  dbStatus,
  error,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const itemsPerPage = 5;

  const processedData = useMemo(() => {
    let result = [...bookings];

    if (statusFilter !== 'All') {
      const filter = statusFilter.toLowerCase();
      if (filter === 'accepted') {
        const operationalStates = ['accepted', 'arrived', 'in_progress', 'started', 'confirmed', 'waiting_customer_confirmation'];
        result = result.filter(b => operationalStates.includes(b.status?.toLowerCase()));
      } else {
        result = result.filter(b => b.status?.toLowerCase() === filter);
      }
    }

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      result = result.filter(b =>
        String(b.id).includes(term) ||
        b.customer_name?.toLowerCase().includes(term) ||
        b.provider_name?.toLowerCase().includes(term)
      );
    }

    if (sortBy === 'date') {
      result.sort((a, b) => {
        const dateA = a.scheduled_at ? new Date(a.scheduled_at) : new Date(0);
        const dateB = b.scheduled_at ? new Date(b.scheduled_at) : new Date(0);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortBy === 'price') {
      result.sort((a, b) => {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      });
    } else if (sortBy === 'status') {
      result.sort((a, b) => {
        const statusA = a.status || '';
        const statusB = b.status || '';
        return sortOrder === 'asc' ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
      });
    }

    return result;
  }, [bookings, statusFilter, searchQuery, sortBy, sortOrder]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder, statusFilter]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSortBy('date');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchQuery || sortBy !== 'date' || sortOrder !== 'desc';

  if (isLoading) {
    return (
      <div className="bg-admin-card rounded-[2rem] shadow-sm border border-admin-border overflow-hidden min-h-[450px] flex items-center justify-center">
        <div className="text-center p-12">
          <Loader2 className="animate-spin text-blue-500 w-10 h-10 mx-auto mb-4" />
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (dbStatus === 'disconnected') {
    return (
      <div className="bg-admin-card rounded-[2rem] shadow-sm border border-admin-border overflow-hidden min-h-[450px] flex items-center justify-center">
        <div className="text-center p-12">
          <AlertCircle className="text-red-500 w-10 h-10 mx-auto mb-4" />
          <p className="text-sm font-medium text-red-600 mb-2">Database connection failed</p>
          <p className="text-xs text-admin-text-muted mb-4">{error?.message || 'Unable to connect to server'}</p>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 bg-admin-card hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-admin-text"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-admin-card rounded-[2rem] shadow-sm border border-admin-border overflow-hidden">
        {/* Search and Filters Bar */}
        <div className="p-6 border-b border-admin-border bg-admin-card">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by ID, customer, or provider..."
                className="pl-10 pr-10 py-2.5 border border-admin-border rounded-xl w-full focus:ring-2 focus:ring-blue-500 outline-none bg-admin-card text-sm text-admin-text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sort By:</span>

              <button
                onClick={() => toggleSort('date')}
                className={`px-3 py-2.5 border rounded-xl text-sm flex items-center gap-1 transition-colors ${
                  sortBy === 'date'
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                    : 'border-admin-border text-admin-text-muted hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Date
                {sortBy === 'date' && (sortOrder === 'asc' ? <span className="text-xs">↑</span> : <span className="text-xs">↓</span>)}
              </button>

              <button
                onClick={() => toggleSort('price')}
                className={`px-3 py-2.5 border rounded-xl text-sm flex items-center gap-1 transition-colors ${
                  sortBy === 'price'
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                    : 'border-admin-border text-admin-text-muted hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Price
                {sortBy === 'price' && (sortOrder === 'asc' ? <span className="text-xs">↑</span> : <span className="text-xs">↓</span>)}
              </button>

              <button
                onClick={() => toggleSort('status')}
                className={`px-3 py-2.5 border rounded-xl text-sm flex items-center gap-1 transition-colors ${
                  sortBy === 'status'
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                    : 'border-admin-border text-admin-text-muted hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Status
                {sortBy === 'status' && (sortOrder === 'asc' ? <span className="text-xs">↑</span> : <span className="text-xs">↓</span>)}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-3 py-2.5 border border-red-200 rounded-xl text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <XCircleIcon size={16} /> Clear
                </button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
              <Filter size={12} />
              <span>Active filters: </span>
              {searchQuery && <span className="bg-slate-100 px-2 py-0.5 rounded">Search: {searchQuery}</span>}
              {sortBy !== 'date' && <span className="bg-slate-100 px-2 py-0.5 rounded">Sort: {sortBy} ({sortOrder === 'asc' ? 'asc' : 'desc'})</span>}
              {sortBy === 'date' && sortOrder !== 'desc' && <span className="bg-slate-100 px-2 py-0.5 rounded">Date: oldest first</span>}
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full text-left">
            <thead className="bg-white text-slate-800 dark:bg-slate-900 border-b border-admin-border text-[10px] uppercase font-black tracking-tighter">
              <tr>
                <th className="px-6 py-4">Booking ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Scheduled</th>
                <th className="px-6 py-4 text-center">Location</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-center">Payment</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-slate-400 text-sm">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                currentItems.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-slate-500">#{booking.id}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-admin-text">{booking.customer_name}</td>
                    <td className="px-6 py-4 text-admin-text-muted">{booking.provider_name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block bg-blue-50 dark:bg-blue-900/30 text-admin-text px-2 py-1 rounded text-[10px] font-black uppercase border border-blue-100 dark:border-blue-800 tracking-widest">
                        {booking.service_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{booking.scheduled_at}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-400 text-xs">
                        <MapPin size={12} /> {booking.location?.split(',')[0] || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-admin-text">
                      {booking.price} ETB
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                        booking.payment_status?.toLowerCase() === 'paid'
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                          : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}>
                        <span className="text-admin-text">{booking.payment_status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(booking.status)}`}>
                        <span className="text-admin-text">{booking.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="p-2 bg-slate-100 dark:bg-slate-700 text-admin-text-muted rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                        aria-label="View details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden p-4 space-y-4">
          {currentItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No bookings found.</div>
          ) : (
            currentItems.map((booking) => (
              <div key={booking.id} className="bg-white rounded-2xl p-5 border border-admin-border space-y-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs text-slate-400">#{booking.id}</p>
                    <p className="font-semibold text-admin-text text-base">{booking.customer_name}</p>
                    <p className="text-xs text-admin-text-muted">Provider: {booking.provider_name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1"><Calendar size={14} className="text-slate-400" /> {booking.scheduled_at}</div>
                  <div className="flex items-center gap-1"><MapPin size={14} className="text-slate-400" /> {booking.location?.split(',')[0] || 'N/A'}</div>
                  <div className="flex items-center gap-1"><span className="font-semibold">Service:</span> {booking.service_type}</div>
                  <div className="flex items-center gap-1"><span className="font-semibold">Price:</span> <span className="text-admin-text font-bold">{booking.price} ETB</span></div>
                  <div className="flex items-center gap-1"><span className="font-semibold">Payment:</span> {booking.payment_status}</div>
                </div>

                <button
                  onClick={() => setSelectedBooking(booking)}
                  className="w-full mt-2 bg-admin-card border border-admin-border text-admin-text py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Eye size={14} /> View Details
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 bg-admin-card border-t border-admin-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-medium text-admin-text-muted">
              Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, processedData.length)} of {processedData.length}
            </span>
            <div className="flex items-center gap-1 bg-admin-card p-1.5 rounded-xl border border-admin-border shadow-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition text-admin-text-muted"
              >
                <ChevronLeft size={18} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                    currentPage === i + 1
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition text-admin-text-muted"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-admin-card rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300 border border-admin-border">
            <div className={`p-6 text-white flex justify-between items-center shrink-0 ${
              selectedBooking.status?.toLowerCase() === 'cancelled' ? 'bg-red-600' :
              selectedBooking.status?.toLowerCase() === 'completed' ? 'bg-green-600' : 'bg-slate-900'
            }`}>
              <div>
                <h2 className="text-xl font-bold">Booking #{selectedBooking.id}</h2>
                <p className="text-xs opacity-80 mt-1">{selectedBooking.customer_name} → {selectedBooking.provider_name}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="hover:rotate-90 transition-transform p-2">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Financial Summary */}
              <div className="flex items-center justify-between p-5 bg-admin-card rounded-2xl border border-admin-border">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-2xl"><DollarSign size={20} /></div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Total Fee</p>
                    <p className="text-xl font-bold text-slate-900">{selectedBooking.price} ETB</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Commission (10%)</p>
                  <p className="text-sm font-bold text-blue-600">{(selectedBooking.price * 0.1).toFixed(2)} ETB</p>
                </div>
              </div>

              {/* Service Info */}
              <div className="bg-admin-card p-5 rounded-2xl border border-admin-border space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="dark:text-slate-300"><span className="font-semibold text-admin-text-muted">Type:</span> {selectedBooking.service_type}</div>
                  <div className="dark:text-slate-300"><span className="font-semibold text-admin-text-muted">Location:</span> {selectedBooking.location || 'N/A'}</div>
                  <div className="dark:text-slate-300"><span className="font-semibold text-admin-text-muted">Scheduled:</span> {selectedBooking.scheduled_at}</div>
                  <div className="dark:text-slate-300"><span className="font-semibold text-admin-text-muted">Payment:</span> {selectedBooking.payment_status}</div>
                </div>
              </div>

              {/* Timeline / Progress */}
              <div className="p-5 bg-admin-card rounded-2xl border border-admin-border space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={14} /> Operational Timeline
                </p>
                <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-700">
                  {(() => {
                    const status = selectedBooking.status?.toLowerCase();
                    const operationalStates = ['accepted', 'arrived', 'in_progress', 'started', 'confirmed', 'waiting_customer_confirmation'];
                    
                    const steps = [];
                    
                    // 9. Created_at (for all states)
                    steps.push({ label: 'Order Created', date: selectedBooking.created_at, icon: Clock, isComplete: true });

                    // 1. Scheduled_for (for all six states)
                    steps.push({ label: 'Scheduled For', date: selectedBooking.scheduled_at, icon: Calendar, isComplete: true });

                    // 10. Paid_at (for all states)
                    steps.push({ label: 'Payment Settled', date: selectedBooking.paid_at, icon: DollarSign, isComplete: selectedBooking.paid_at !== 'Unpaid' });

                    // 2. Accepted_at (for all states except pending and expired)
                    if (status !== 'pending' && status !== 'expired') {
                      steps.push({ 
                        label: 'Request Accepted', 
                        date: selectedBooking.accepted_at, 
                        icon: CheckCircle, 
                        isComplete: selectedBooking.accepted_at !== 'Pending',
                        isCurrent: selectedBooking.accepted_at === 'Pending' && status === 'accepted'
                      });
                    }

                    // 3. Rejected_at (for Rejected state only)
                    if (status === 'rejected') {
                      steps.push({ label: 'Request Rejected', date: selectedBooking.rejected_at, icon: XCircle, isComplete: true });
                    }

                    // 7. Expired_at (for Expired state only)
                    if (status === 'expired') {
                      steps.push({ label: 'Request Expired', date: selectedBooking.expires_at, icon: AlertCircle, isComplete: true });
                    }

                    // 8. Customer Confirm_at (for Accepted state and completed states)
                    if (status === 'completed' || operationalStates.includes(status)) {
                      steps.push({ 
                        label: 'Customer Confirmation', 
                        date: selectedBooking.customer_confirmed_at, 
                        icon: UserCheck, 
                        isComplete: selectedBooking.customer_confirmed_at !== 'Pending',
                        isCurrent: selectedBooking.customer_confirmed_at === 'Pending' && status === 'waiting_customer_confirmation'
                      });
                    }

                    // Completed Only Steps (4, 5, 6, 11)
                    if (status === 'completed') {
                      steps.push({ label: 'Provider Arrived', date: selectedBooking.provider_arrived_at, icon: MapPin, isComplete: selectedBooking.provider_arrived_at !== 'Pending' });
                      steps.push({ label: 'Job Started', date: selectedBooking.provider_started_at, icon: Wrench, isComplete: selectedBooking.provider_started_at !== 'Pending' });
                      steps.push({ label: 'Job Completed', date: selectedBooking.completed_at, icon: CheckCircle, isComplete: selectedBooking.completed_at !== 'Pending' });
                      steps.push({ label: 'Revenue Released', date: selectedBooking.released_at, icon: DollarSign, isComplete: selectedBooking.released_at !== 'Pending' });
                    }

                    return steps.map((step, idx) => (
                      <TimelineStep
                        key={idx}
                        label={step.label}
                        date={step.date}
                        icon={step.icon}
                        isComplete={step.isComplete}
                        isCurrent={step.isCurrent}
                        bookingStatus={selectedBooking.status}
                      />
                    ));
                  })()}
                </div>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition mt-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingsTable;