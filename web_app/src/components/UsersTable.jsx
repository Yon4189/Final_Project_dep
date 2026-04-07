import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, Mail, Phone, MapPin, ShieldAlert, ShieldCheck, UserMinus,
  Loader2, AlertCircle, Filter, XCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getBackendUrl } from '../utils/url';

const UserAvatar = ({ user }) => {
  const [imgError, setImgError] = useState(false);
  const baseUrl = `http://${window.location.hostname}:8000`;

  if (user.profilePicture && !imgError) {
    const isFullUrl = user.profilePicture.startsWith('http');
    const hasStoragePrefix = user.profilePicture.startsWith('storage/') ||
                             user.profilePicture.startsWith('profiles/') ||
                             user.profilePicture.startsWith('profilepics/');

    let imageUrl = user.profilePicture;
    if (!isFullUrl) {
      const cleanPath = user.profilePicture.replace(/^\//, '');
      if (hasStoragePrefix) {
        imageUrl = `${baseUrl}/${cleanPath}`;
      } else {
        imageUrl = `${baseUrl}/storage/${cleanPath}`;
      }
    }
    return (
      <img
        src={imageUrl}
        alt={user.name}
        className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 uppercase flex-shrink-0">
      {user.name?.charAt(0)}
    </div>
  );
};

const UsersTable = ({
  users,
  userType,
  isLoading,
  processingId,
  dbStatus,
  error,
  onRefresh,
  onToggleStatus,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const locations = useMemo(() => {
    const locs = new Set();
    users.forEach(u => {
      if (u.location && u.location !== 'Not Provided') locs.add(u.location);
    });
    return Array.from(locs).sort();
  }, [users]);

  const processedData = useMemo(() => {
    let result = [...users];

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        String(u.id).includes(term)
      );
    }

    if (filterLocation) {
      result = result.filter(u => u.location === filterLocation);
    }

    if (sortBy === 'name') {
      result.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';
        if (sortOrder === 'asc') return nameA.localeCompare(nameB);
        return nameB.localeCompare(nameA);
      });
    } else if (sortBy === 'date') {
      result.sort((a, b) => {
        const dateA = a.joined ? new Date(a.joined) : new Date(0);
        const dateB = b.joined ? new Date(b.joined) : new Date(0);
        if (sortOrder === 'asc') return dateA - dateB;
        return dateB - dateA;
      });
    }

    return result;
  }, [users, searchQuery, filterLocation, sortBy, sortOrder]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterLocation, sortBy, sortOrder]);

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
    setFilterLocation('');
    setSortBy('date');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchQuery || filterLocation || sortBy !== 'date' || sortOrder !== 'desc';

  if (isLoading) {
    return (
      <div className="bg-admin-card rounded-[2rem] shadow-sm border border-admin-border overflow-hidden min-h-[450px] flex items-center justify-center">
        <div className="text-center p-12">
          <Loader2 className="animate-spin text-blue-500 w-10 h-10 mx-auto mb-4" />
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Loading users...</p>
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
    <div className="bg-admin-card rounded-[2rem] shadow-sm border border-admin-border overflow-hidden">
      {/* Search and Filters Bar */}
      <div className="p-8 border-b border-admin-border bg-admin-card">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={`Search ${userType.toLowerCase()} by name, email, or ID...`}
              className="pl-10 pr-10 py-2.5 border border-admin-border rounded-xl w-full focus:ring-2 focus:ring-blue-500 outline-none bg-admin-card text-sm text-admin-text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter By:</span>

            {locations.length > 0 && (
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-3 py-2.5 border border-admin-border rounded-xl text-sm bg-admin-card text-admin-text focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => toggleSort('name')}
              className={`px-3 py-2.5 border rounded-xl text-sm flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                sortBy === 'name'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                  : 'border-admin-border text-admin-text-muted hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Name
              {sortBy === 'name' && (sortOrder === 'asc' ? <span className="text-xs">↑</span> : <span className="text-xs">↓</span>)}
            </button>

            <button
              onClick={() => toggleSort('date')}
              className={`px-3 py-2.5 border rounded-xl text-sm flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                sortBy === 'date'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                  : 'border-admin-border text-admin-text-muted hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Joined
              {sortBy === 'date' && (sortOrder === 'asc' ? <span className="text-xs">↑</span> : <span className="text-xs">↓</span>)}
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-2.5 border border-red-200 rounded-xl text-sm text-red-600 hover:bg-red-50 transition"
                aria-label="Clear all filters"
              >
                <XCircle size={16} /> Clear
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
            <Filter size={12} />
            <span>Active filters: </span>
            {searchQuery && <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">Search: {searchQuery}</span>}
            {filterLocation && <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">Location: {filterLocation}</span>}
            {sortBy !== 'date' && <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">Sort: {sortBy} ({sortOrder === 'asc' ? 'asc' : 'desc'})</span>}
            {sortBy === 'date' && sortOrder !== 'desc' && <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">Joined: oldest first</span>}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full text-left" aria-label="Verification queue table">
          <thead className="bg-white text-slate-800 dark:bg-slate-900 border-b border-admin-border text-[9px] uppercase font-black tracking-tighter">
            <tr>
              <th className="px-6 py-4">User Details</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-slate-400 text-sm">
                  No {userType.toLowerCase()}s found.
                </td>
              </tr>
            ) : (
              currentItems.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div>
                        <p className="font-semibold text-admin-text text-sm">{user.name}</p>
                        <p className="text-xs text-admin-text-muted">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Mail size={12} className="shrink-0" />
                        <span className="text-xs truncate max-w-[150px]">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-admin-text-muted">
                        <Phone size={12} className="shrink-0" />
                        <span className="text-xs">{user.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-admin-text-muted" />
                      <span className="text-xs text-admin-text">{user.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-admin-text-muted bg-white border border-slate-100 px-2 py-1 rounded">{user.joined || '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                        ['active', 'approved'].includes(user.status?.toLowerCase())
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                          : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}>
                        <span className="text-admin-text">{user.status}</span>
                      </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {processingId === user.id ? (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Loader2 className="animate-spin" size={14} />
                          <span className="text-xs">Processing...</span>
                        </div>
                      ) : (
                        <>
                          {['suspended'].includes(user.status?.toLowerCase()) ? (
                            <button
                              onClick={() => onToggleStatus(user.id, user.status)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition"
                              title="Reactivate User"
                            >
                              <ShieldCheck size={12} /> Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => onToggleStatus(user.id, user.status)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition"
                              title="Suspend User"
                            >
                              <ShieldAlert size={12} /> Suspend
                            </button>
                          )}
                          <button
                            onClick={() => onDelete(user.id, user.name)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition"
                            title="Permanent Delete"
                          >
                            <UserMinus size={12} /> Delete
                          </button>
                        </>
                      )}
                    </div>
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
          <div className="text-center py-12 text-slate-400 text-sm">No {userType.toLowerCase()}s found.</div>
        ) : (
          currentItems.map((user) => (
            <div key={user.id} className="bg-white rounded-2xl p-5 border border-admin-border space-y-3">
              <div className="flex items-center gap-3">
                <UserAvatar user={user} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-admin-text text-sm">{user.name}</p>
                  <p className="text-xs text-slate-500">ID: {user.id}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  ['active', 'approved'].includes(user.status?.toLowerCase())
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}>
                  {user.status}
                </span>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2"><Mail size={12} className="text-slate-400" /> <span className="truncate">{user.email}</span></div>
                <div className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> <span>{user.phone || 'N/A'}</span></div>
                <div className="flex items-center gap-2"><MapPin size={12} className="text-slate-400" /> <span>{user.location}</span></div>
                <div className="flex items-center gap-2"><span className="text-slate-400">Joined:</span> <span>{user.joined || '—'}</span></div>
              </div>
              <div className="flex gap-2 pt-2">
                {processingId === user.id ? (
                  <div className="flex-1 flex items-center justify-center gap-1 text-slate-400 py-2">
                    <Loader2 className="animate-spin" size={14} />
                    <span className="text-xs">Processing...</span>
                  </div>
                ) : (
                  <>
                    {['suspended'].includes(user.status?.toLowerCase()) ? (
                      <button
                        onClick={() => onToggleStatus(user.id, user.status)}
                        className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <ShieldCheck size={12} /> Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => onToggleStatus(user.id, user.status)}
                        className="flex-1 bg-amber-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <ShieldAlert size={12} /> Suspend
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(user.id, user.name)}
                      className="flex-1 bg-red-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <UserMinus size={12} /> Delete
                    </button>
                  </>
                )}
              </div>
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
  );
};

export default UsersTable;