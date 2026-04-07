import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, Eye, ImageIcon, FileCheck, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Filter, XCircle as XCircleIcon
} from 'lucide-react';
import { getBackendUrl } from '../utils/url';

const VerificationTable = ({
  providers,
  isLoading,
  processingId,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  onViewDescription,
  dbStatus,
  error,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'cost'
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Extract unique categories from providers
  const categories = useMemo(() => {
    const cats = new Set();
    providers.forEach(p => {
      if (p.service_type) cats.add(p.service_type);
    });
    return Array.from(cats).sort();
  }, [providers]);

  // Filter and sort logic
  const processedData = useMemo(() => {
    let result = [...providers];

    // Search
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.service_title?.toLowerCase().includes(term) ||
        p.service_type?.toLowerCase().includes(term) ||
        String(p.id).includes(term)
      );
    }

    // Category filter
    if (filterCategory) {
      result = result.filter(p => p.service_type === filterCategory);
    }

    // Sort
    if (sortBy === 'name') {
      result.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';
        if (sortOrder === 'asc') return nameA.localeCompare(nameB);
        return nameB.localeCompare(nameA);
      });
    } else if (sortBy === 'date') {
      result.sort((a, b) => {
        const dateA = a.submission_date ? new Date(a.submission_date) : new Date(0);
        const dateB = b.submission_date ? new Date(b.submission_date) : new Date(0);
        if (sortOrder === 'asc') return dateA - dateB;
        return dateB - dateA;
      });
    } else if (sortBy === 'cost') {
      result.sort((a, b) => {
        const costA = a.estimated_cost || 0;
        const costB = b.estimated_cost || 0;
        if (sortOrder === 'asc') return costA - costB;
        return costB - costA;
      });
    }

    return result;
  }, [providers, searchQuery, filterCategory, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, sortBy, sortOrder]);

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
    setFilterCategory('');
    setSortBy('date');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchQuery || filterCategory || sortBy !== 'date' || sortOrder !== 'desc';

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-admin-card rounded-[2rem] shadow-sm border border-admin-border overflow-hidden min-h-[450px] flex items-center justify-center">
        <div className="text-center p-12">
          <Loader2 className="animate-spin text-blue-500 w-10 h-10 mx-auto mb-4" />
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Loading providers...</p>
        </div>
      </div>
    );
  }

  // Error state
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
      <div className="p-6 border-b border-admin-border bg-admin-card">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, service, or ID..."
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

          {/* Filters and Sort */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter/Sort:</span>

            {/* Category filter (only if categories exist) */}
            {categories.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2.5 border border-admin-border rounded-xl text-sm bg-admin-card text-admin-text focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            {/* Sort by name */}
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

            {/* Sort by submission date */}
            <button
              onClick={() => toggleSort('date')}
              className={`px-3 py-2.5 border rounded-xl text-sm flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                sortBy === 'date'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                  : 'border-admin-border text-admin-text-muted hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Date
              {sortBy === 'date' && (sortOrder === 'asc' ? <span className="text-xs">↑</span> : <span className="text-xs">↓</span>)}
            </button>

            {/* Sort by cost */}
            <button
              onClick={() => toggleSort('cost')}
              className={`px-3 py-2.5 border rounded-xl text-sm flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                sortBy === 'cost'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                  : 'border-admin-border text-admin-text-muted hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Cost
              {sortBy === 'cost' && (sortOrder === 'asc' ? <span className="text-xs">↑</span> : <span className="text-xs">↓</span>)}
            </button>

            {/* Reset filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-2.5 border border-red-200 rounded-xl text-sm text-red-600 hover:bg-red-50 transition"
                aria-label="Clear all filters"
              >
                <XCircleIcon size={16} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
            <Filter size={12} />
            <span>Active filters: </span>
            {searchQuery && <span className="bg-slate-100 px-2 py-0.5 rounded">Search: {searchQuery}</span>}
            {filterCategory && <span className="bg-slate-100 px-2 py-0.5 rounded">Category: {filterCategory}</span>}
            {sortBy !== 'date' && <span className="bg-slate-100 px-2 py-0.5 rounded">Sort: {sortBy} ({sortOrder === 'asc' ? 'asc' : 'desc'})</span>}
            {sortBy === 'date' && sortOrder !== 'desc' && <span className="bg-slate-100 px-2 py-0.5 rounded">Date: oldest first</span>}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-black/20 text-admin-text-muted text-xs font-semibold uppercase border-b border-admin-border">
            <tr>
              <th className="px-6 py-4">Provider</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Service</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-center">Cost</th>
              <th className="px-6 py-4 text-center">Files</th>
              <th className="px-6 py-4 text-center">Submitted</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-12 text-slate-400 text-sm">
                  No providers found.
                </td>
              </tr>
            ) : (
              currentItems.map((item) => {
                const profileUrl = getBackendUrl(item.profilePicture);
                const idPhotoUrl = getBackendUrl(item.idPhoto);
                const credentialUrl = getBackendUrl(item.credentialPhoto);
                const hasProfilePhoto = !!profileUrl;
                const hasIdPhoto = !!idPhotoUrl;
                const hasCredential = !!credentialUrl;
                const status = item.status?.toLowerCase() || 'pending';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Provider info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 shrink-0">
                          {hasProfilePhoto ? (
                            <img
                              src={profileUrl}
                              alt={item.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.querySelector('.fallback').style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm fallback"
                            style={{ display: hasProfilePhoto ? 'none' : 'flex' }}
                          >
                            {item.name?.charAt(0)?.toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-admin-text text-sm">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      <span className="inline-block bg-admin-card text-admin-text px-2 py-1 rounded text-xs font-medium border border-admin-border">
                        {item.service_type || '—'}
                      </span>
                    </td>

                    {/* Service */}
                    <td className="px-6 py-4">
                      <p className="text-xs font-semibold text-blue-600 uppercase">{item.service_title || '—'}</p>
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4 max-w-[200px]">
                      {item.service_description ? (
                        <div>
                          <p className="text-xs text-admin-text-muted line-clamp-2">{item.service_description}</p>
                          <button
                            onClick={() => onViewDescription(item.service_description, item.name)}
                            className="mt-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-[10px] font-medium flex items-center gap-1"
                          >
                            <Eye size={12} /> Read more
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No description</span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-semibold text-emerald-600 text-sm">
                        {item.estimated_cost != null ? `${item.estimated_cost} ETB` : '—'}
                      </span>
                    </td>

                    {/* Files */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 items-center">
                        <button
                          onClick={() => hasIdPhoto && window.open(idPhotoUrl, '_blank')}
                          disabled={!hasIdPhoto}
                          className={`w-28 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition ${
                            hasIdPhoto
                              ? 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600'
                              : 'bg-slate-100 bg-admin-card text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <ImageIcon size={12} /> ID
                        </button>
                        <button
                          onClick={() => hasCredential && window.open(credentialUrl, '_blank')}
                          disabled={!hasCredential}
                          className={`w-28 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition ${
                            hasCredential
                              ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                              : 'bg-slate-100 bg-admin-card text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <FileCheck size={12} /> Licence
                        </button>
                      </div>
                    </td>

                    {/* Submission date */}
                    <td className="px-6 py-4 text-center text-xs text-slate-500">
                      {item.submission_date || 'Unknown'}
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                        status === 'active' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                        status === 'rejected' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' :
                        status === 'suspended' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' :
                        'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}>
                        <span className="text-admin-text">{item.status || 'Pending'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {processingId === item.id ? (
                          <Loader2 className="animate-spin text-blue-500" size={18} />
                        ) : (
                          <>
                            {/* Approve / Reactivate */}
                            {(status === 'pending' || status === 'rejected' || status === 'suspended') && (
                              <button
                                onClick={() => status === 'suspended' ? onReactivate(item.id, item.name) : onApprove(item.id, item.name)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition"
                              >
                                <CheckCircle size={12} /> {status === 'suspended' ? 'Reactivate' : 'Approve'}
                              </button>
                            )}
                            {/* Reject (if not already rejected) */}
                            {(status === 'pending' || status === 'active') && (
                              <button
                                onClick={() => onReject(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            )}
                            {/* Suspend (if active) */}
                            {status === 'active' && (
                              <button
                                onClick={() => onSuspend(item.id, item.name)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition"
                              >
                                <AlertCircle size={12} /> Suspend
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden p-4 space-y-4">
        {currentItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No providers found.</div>
        ) : (
          currentItems.map((item) => {
            const profileUrl = getBackendUrl(item.profilePicture);
            const idPhotoUrl = getBackendUrl(item.idPhoto);
            const credentialUrl = getBackendUrl(item.credentialPhoto);
            const hasProfilePhoto = !!profileUrl;
            const hasIdPhoto = !!idPhotoUrl;
            const hasCredential = !!credentialUrl;
            const status = item.status?.toLowerCase() || 'pending';

            return (
              <div key={item.id} className="bg-white rounded-2xl p-5 border border-admin-border space-y-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 shrink-0">
                    {hasProfilePhoto ? (
                      <img
                        src={profileUrl}
                        alt={item.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.querySelector('.fallback').style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm fallback"
                      style={{ display: hasProfilePhoto ? 'none' : 'flex' }}
                    >
                      {item.name?.charAt(0)?.toUpperCase()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-admin-text text-sm">{item.name}</p>
                    <p className="text-xs text-slate-500 truncate">{item.email}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                    status === 'active' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                    status === 'rejected' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' :
                    status === 'suspended' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' :
                    'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  }`}>
                    <span className="text-admin-text">{item.status || 'Pending'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-admin-border pt-2">
                  <div><span className="font-semibold text-admin-text-muted">Category:</span> <span className="dark:text-slate-300">{item.service_type || '—'}</span></div>
                  <div><span className="font-semibold text-admin-text-muted">Cost:</span> <span className="dark:text-slate-300">{item.estimated_cost ? `${item.estimated_cost} ETB` : '—'}</span></div>
                  <div><span className="font-semibold text-admin-text-muted">Service:</span> <span className="dark:text-slate-300">{item.service_title || '—'}</span></div>
                  <div><span className="font-semibold text-admin-text-muted">Submitted:</span> <span className="dark:text-slate-300">{item.submission_date || 'Unknown'}</span></div>
                </div>

                {item.service_description && (
                  <button
                    onClick={() => onViewDescription(item.service_description, item.name)}
                    className="text-xs text-blue-600 font-medium flex items-center gap-1"
                  >
                    <Eye size={12} /> View full description
                  </button>
                )}

                <div className="flex gap-2">
                  <button onClick={() => hasIdPhoto && window.open(idPhotoUrl, '_blank')} disabled={!hasIdPhoto} className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center ${
                    hasIdPhoto ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}>
                    <ImageIcon size={12} className="inline mr-1" /> ID
                  </button>
                  <button onClick={() => hasCredential && window.open(credentialUrl, '_blank')} disabled={!hasCredential} className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center ${
                    hasCredential ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}>
                    <FileCheck size={12} className="inline mr-1" /> Licence
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  {processingId === item.id ? (
                    <Loader2 className="animate-spin text-blue-500 mx-auto" size={20} />
                  ) : (
                    <>
                      {(status === 'pending' || status === 'rejected' || status === 'suspended') && (
                        <button
                          onClick={() => status === 'suspended' ? onReactivate(item.id, item.name) : onApprove(item.id, item.name)}
                          className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <CheckCircle size={12} /> {status === 'suspended' ? 'Reactivate' : 'Approve'}
                        </button>
                      )}
                      {(status === 'pending' || status === 'active') && (
                        <button
                          onClick={() => onReject(item)}
                          className="flex-1 bg-red-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      )}
                      {status === 'active' && (
                        <button
                          onClick={() => onSuspend(item.id, item.name)}
                          className="flex-1 bg-amber-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <AlertCircle size={12} /> Suspend
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
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

export default VerificationTable;