import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, Eye, Calendar, MapPin, DollarSign, Clock, Wrench,
  CheckCircle, XCircle, Loader2, AlertCircle, Filter, XCircle as XCircleIcon,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'bg-amber-50 text-amber-600 border-amber-200';
    case 'accepted': return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'completed': return 'bg-green-50 text-green-600 border-green-200';
    case 'cancelled': return 'bg-red-50 text-red-600 border-red-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const TimelineStep = ({ label, date, icon: Icon, isComplete, isCurrent }) => {
  const stepStatus = isComplete ? 'complete' : (isCurrent ? 'current' : 'pending');
  
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
        <p className={`text-sm font-medium ${date !== 'Pending' ? 'text-slate-800' : 'text-slate-300'}`}>
          {date !== 'Pending' ? date : '—'}
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
      result = result.filter(b => b.status?.toLowerCase() === statusFilter.toLowerCase());
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
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[450px] flex items-center justify-center">
        <div className="text-center p-12">
          <Loader2 className="animate-spin text-blue-500 w-10 h-10 mx-auto mb-4" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (dbStatus === 'disconnected') {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[450px] flex items-center justify-center">
        <div className="text-center p-12">
          <AlertCircle className="text-red-500 w-10 h-10 mx-auto mb-4" />
          <p className="text-sm font-medium text-red-600 mb-2">Database connection failed</p>
          <p className="text-xs text-slate-500 mb-4">{error?.message || 'Unable to connect to server'}</p>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        {/* Search and Filters Bar */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by ID, customer, or provider..."
                className="pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
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
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Date
                {sortBy === 'date' && (sortOrder === 'asc' ? <span className="text-xs">↑</span> : <span className="text-xs">↓</span>)}
              </button>

              <button
                onClick={() => toggleSort('price')}
                className={`px-3 py-2.5 border rounded-xl text-sm flex items-center gap-1 transition-colors ${
                  sortBy === 'price'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Price
                {sortBy === 'price' && (sortOrder === 'asc' ? <span className="text-xs">↑</span> : <span className="text-xs">↓</span>)}
              </button>

              <button
                onClick={() => toggleSort('status')}
                className={`px-3 py-2.5 border rounded-xl text-sm flex items-center gap-1 transition-colors ${
                  sortBy === 'status'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
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
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-100">
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
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
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
                    <td className="px-6 py-4 font-semibold text-slate-800">{booking.customer_name}</td>
                    <td className="px-6 py-4 text-slate-600">{booking.provider_name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                        {booking.service_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{booking.scheduled_at}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-400 text-xs">
                        <MapPin size={12} /> {booking.location?.split(',')[0] || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-600">
                      {booking.price} ETB
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        booking.payment_status?.toLowerCase() === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {booking.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition"
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
              <div key={booking.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs text-slate-400">#{booking.id}</p>
                    <p className="font-semibold text-slate-800 text-base">{booking.customer_name}</p>
                    <p className="text-xs text-slate-500">Provider: {booking.provider_name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1"><Calendar size={14} className="text-slate-400" /> {booking.scheduled_at}</div>
                  <div className="flex items-center gap-1"><MapPin size={14} className="text-slate-400" /> {booking.location?.split(',')[0] || 'N/A'}</div>
                  <div className="flex items-center gap-1"><span className="font-semibold">Service:</span> {booking.service_type}</div>
                  <div className="flex items-center gap-1"><span className="font-semibold">Price:</span> <span className="text-emerald-600 font-bold">{booking.price} ETB</span></div>
                  <div className="flex items-center gap-1"><span className="font-semibold">Payment:</span> {booking.payment_status}</div>
                </div>

                <button
                  onClick={() => setSelectedBooking(booking)}
                  className="w-full mt-2 bg-white border border-slate-200 text-slate-700 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50"
                >
                  <Eye size={14} /> View Details
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-medium text-slate-500">
              Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, processedData.length)} of {processedData.length}
            </span>
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
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
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
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
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
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
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><DollarSign size={20} /></div>
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
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-semibold">Type:</span> {selectedBooking.service_type}</div>
                  <div><span className="font-semibold">Location:</span> {selectedBooking.location || 'N/A'}</div>
                  <div><span className="font-semibold">Scheduled:</span> {selectedBooking.scheduled_at}</div>
                  <div><span className="font-semibold">Payment:</span> {selectedBooking.payment_status}</div>
                </div>
              </div>

              {/* Timeline / Progress */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={14} /> Operational Timeline
                </p>
                <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                  <TimelineStep
                    label="Request Accepted"
                    date={selectedBooking.accepted_at !== 'Pending' ? selectedBooking.accepted_at : 'Pending'}
                    icon={CheckCircle}
                    isComplete={selectedBooking.accepted_at !== 'Pending'}
                    isCurrent={selectedBooking.accepted_at === 'Pending' && selectedBooking.status === 'accepted'}
                  />
                  <TimelineStep
                    label="Job Initiated"
                    date={selectedBooking.provider_started_at !== 'Pending' ? selectedBooking.provider_started_at : 'Pending'}
                    icon={Wrench}
                    isComplete={selectedBooking.provider_started_at !== 'Pending'}
                    isCurrent={selectedBooking.provider_started_at === 'Pending' && selectedBooking.status === 'accepted'}
                  />
                  <TimelineStep
                    label="Arrived On-Site"
                    date={selectedBooking.provider_arrived_at !== 'Pending' ? selectedBooking.provider_arrived_at : 'Pending'}
                    icon={MapPin}
                    isComplete={selectedBooking.provider_arrived_at !== 'Pending'}
                    isCurrent={selectedBooking.provider_arrived_at === 'Pending' && selectedBooking.status === 'accepted'}
                  />
                  <TimelineStep
                    label="Task Finalized"
                    date={selectedBooking.completed_at !== 'Pending' ? selectedBooking.completed_at : 'Pending'}
                    icon={CheckCircle}
                    isComplete={selectedBooking.completed_at !== 'Pending'}
                    isCurrent={selectedBooking.completed_at === 'Pending' && selectedBooking.status === 'completed'}
                  />
                  <TimelineStep
                    label="Payment Settled"
                    date={selectedBooking.paid_at !== 'Unpaid' ? selectedBooking.paid_at : 'Unpaid'}
                    icon={DollarSign}
                    isComplete={selectedBooking.paid_at !== 'Unpaid'}
                    isCurrent={selectedBooking.paid_at === 'Unpaid' && selectedBooking.payment_status === 'pending'}
                  />
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