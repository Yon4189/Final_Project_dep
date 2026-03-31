import React, { useMemo, useRef } from 'react';
import { Loader2, CheckCircle, Calendar, ImageIcon, FileCheck, Eye, Search, ArrowUp, ArrowDown, X } from 'lucide-react';
import { getBackendUrl } from '../utils/url';

const VerificationQueueTable = ({
  queue,
  isLoading,
  processingId,
  onVerify,
  onViewDescription,
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  resetFilters,
}) => {
  const searchInputRef = useRef(null);
  const categorySelectRef = useRef(null);

  const categories = useMemo(() => {
    const cats = new Set();
    queue.forEach((item) => {
      if (item.service_type) cats.add(item.service_type);
    });
    return Array.from(cats).sort();
  }, [queue]);

  const filteredAndSortedQueue = useMemo(() => {
    let result = [...queue];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(term) ||
          item.email?.toLowerCase().includes(term)
      );
    }
    if (filterCategory) {
      result = result.filter((item) => item.service_type === filterCategory);
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
        const dateA = a.submission_date ? new Date(a.submission_date) : new Date(0);
        const dateB = b.submission_date ? new Date(b.submission_date) : new Date(0);
        if (sortOrder === 'asc') return dateA - dateB;
        return dateB - dateA;
      });
    }
    return result;
  }, [queue, searchTerm, filterCategory, sortBy, sortOrder]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const TableSkeleton = () => (
    <div className="overflow-x-auto hidden lg:block animate-pulse" aria-label="Loading verification queue">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black border-b border-slate-100 tracking-tighter">
          <tr>
            <th className="px-6 py-5">Provider Full Name</th>
            <th className="px-6 py-5">Category</th>
            <th className="px-6 py-5">Service</th>
            <th className="px-6 py-5">Service Description</th>
            <th className="px-6 py-5 text-center">Est. Cost</th>
            <th className="px-6 py-5 text-center">Verification Files</th>
            <th className="px-6 py-5 text-center">Submission</th>
            <th className="px-8 py-5 text-center">Action</th>
           </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {[...Array(3)].map((_, i) => (
            <tr key={i}>
              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                  <div>
                    <div className="h-4 w-24 bg-slate-200 rounded mb-1"></div>
                    <div className="h-3 w-32 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5"><div className="h-5 w-20 bg-slate-200 rounded"></div></td>
              <td className="px-6 py-5"><div className="h-5 w-24 bg-slate-200 rounded"></div></td>
              <td className="px-6 py-5"><div className="h-5 w-40 bg-slate-200 rounded"></div></td>
              <td className="px-6 py-5 text-center"><div className="h-5 w-12 bg-slate-200 rounded mx-auto"></div></td>
              <td className="px-6 py-5">
                <div className="flex flex-col gap-1.5 items-center">
                  <div className="w-28 h-7 bg-slate-200 rounded"></div>
                  <div className="w-28 h-7 bg-slate-200 rounded"></div>
                </div>
              </td>
              <td className="px-6 py-5 text-center"><div className="h-5 w-16 bg-slate-200 rounded mx-auto"></div></td>
              <td className="px-8 py-5"><div className="w-20 h-8 bg-slate-200 rounded ml-auto"></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const MobileSkeleton = () => (
    <div className="lg:hidden p-4 space-y-4 animate-pulse" aria-label="Loading mobile cards">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-200"></div>
            <div className="flex-1">
              <div className="h-4 w-32 bg-slate-200 rounded mb-1"></div>
              <div className="h-3 w-40 bg-slate-200 rounded"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="h-3 w-16 bg-slate-200 rounded mb-1"></div><div className="h-4 w-20 bg-slate-200 rounded"></div></div>
            <div><div className="h-3 w-16 bg-slate-200 rounded mb-1"></div><div className="h-4 w-16 bg-slate-200 rounded"></div></div>
          </div>
          <div><div className="h-3 w-20 bg-slate-200 rounded mb-2"></div><div className="flex gap-2"><div className="flex-1 h-8 bg-slate-200 rounded"></div><div className="flex-1 h-8 bg-slate-200 rounded"></div></div></div>
          <div className="flex justify-end gap-3"><div className="w-20 h-8 bg-slate-200 rounded"></div><div className="w-20 h-8 bg-slate-200 rounded"></div></div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-white/50">
          <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <TableSkeleton />
        <MobileSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
      {/* Header with filter bar */}
      <div className="p-8 border-b border-slate-100 bg-white/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            Verification Queue
            <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
              {filteredAndSortedQueue.length}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} aria-hidden="true" />
              <label htmlFor="queue-search" className="sr-only">Search providers by name or email</label>
              <input
                id="queue-search"
                type="text"
                placeholder="Search name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ref={searchInputRef}
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label htmlFor="category-filter" className="sr-only">Filter by category</label>
            <select
              id="category-filter"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              ref={categorySelectRef}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={() => toggleSort('name')}
              className={`px-3 py-2 border rounded-xl text-xs flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                sortBy === 'name'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              aria-label={`Sort by name ${sortBy === 'name' && sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              Name
              {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
            </button>
            <button
              onClick={() => toggleSort('date')}
              className={`px-3 py-2 border rounded-xl text-xs flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                sortBy === 'date'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              aria-label={`Sort by submission date ${sortBy === 'date' && sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              Date
              {sortBy === 'date' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
            </button>
            {(searchTerm || filterCategory || sortBy !== 'date' || sortOrder !== 'desc') && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 border border-red-200 rounded-xl text-xs text-red-600 hover:bg-red-50 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Clear all filters"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] font-bold text-slate-400 italic mt-2">
          Review service details before approval
        </p>
      </div>

      {/* Table content */}
      {filteredAndSortedQueue.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full text-left" aria-label="Verification queue table">
              <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black border-b border-slate-100 tracking-tighter">
                <tr>
                  <th className="px-6 py-5">Provider Full Name</th>
                  <th className="px-6 py-5">Category</th>
                  <th className="px-6 py-5">Service</th>
                  <th className="px-6 py-5">Service Description</th>
                  <th className="px-6 py-5 text-center">Est. Cost</th>
                  <th className="px-6 py-5 text-center">Verification Files</th>
                  <th className="px-6 py-5 text-center">Submission</th>
                  <th className="px-8 py-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAndSortedQueue.map((item) => {
                  const profilePhotoUrl = getBackendUrl(item.profilePicture);
                  const idPhotoUrl = getBackendUrl(item.idPhoto);
                  const credentialUrl = getBackendUrl(item.credentialPhoto);
                  const hasProfilePhoto = !!profilePhotoUrl;
                  const hasIdPhoto = !!idPhotoUrl;
                  const hasCredential = !!credentialUrl;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 shrink-0">
                            {hasProfilePhoto ? (
                              <img
                                src={profilePhotoUrl}
                                alt={`${item.name}'s profile`}
                                className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.querySelector('.fallback-placeholder').style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm ${
                                hasProfilePhoto ? 'fallback-placeholder hidden' : ''
                              }`}
                              style={{ display: hasProfilePhoto ? 'none' : 'flex' }}
                            >
                              {item.name?.charAt(0)?.toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight whitespace-nowrap">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[9px] font-black uppercase border border-slate-200">
                          {item.service_type || 'Root'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-black text-slate-600 uppercase tracking-tighter">
                          {item.service_title || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-5 max-w-[180px]">
                        {item.service_description ? (
                          <div>
                            <p className="text-[11px] text-slate-600 font-medium leading-snug line-clamp-2">
                              {item.service_description}
                            </p>
                            <button
                              onClick={() => onViewDescription(item.service_description, item.name)}
                              className="mt-1 flex items-center gap-1 text-blue-500 hover:text-blue-700 font-black text-[9px] uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                              aria-label={`Read full description for ${item.name}`}
                            >
                              <Eye size={10} aria-hidden="true" /> Read more
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">No description</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-black font-mono text-sm text-emerald-600">
                          {item.estimated_cost != null ? (
                            <>{item.estimated_cost} <span className="text-[10px]">ETB</span></>
                          ) : (
                            <span className="text-slate-300 text-[10px] italic">—</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5 items-center">
                          <button
                            onClick={() => hasIdPhoto && window.open(idPhotoUrl, '_blank')}
                            disabled={!hasIdPhoto}
                            className={`w-28 py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              hasIdPhoto
                                ? 'bg-slate-900 text-white hover:bg-black focus:ring-slate-500'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                            aria-label={hasIdPhoto ? `View ID document for ${item.name}` : `No ID document available for ${item.name}`}
                            aria-disabled={!hasIdPhoto}
                          >
                            <ImageIcon size={10} aria-hidden="true" />
                            {item.idPhotoType ? item.idPhotoType.split(' ')[0].toUpperCase() : 'ID DOC'}
                          </button>
                          <button
                            onClick={() => hasCredential && window.open(credentialUrl, '_blank')}
                            disabled={!hasCredential}
                            className={`w-28 py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              hasCredential
                                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                            aria-label={hasCredential ? `View licence for ${item.name}` : `No licence available for ${item.name}`}
                            aria-disabled={!hasCredential}
                          >
                            <FileCheck size={10} aria-hidden="true" /> LICENCE
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <Calendar size={12} className="text-slate-300" aria-hidden="true" />
                          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">
                            {item.submission_date || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-end gap-3">
                          {processingId === item.id ? (
                            <div className="flex items-center gap-2 text-slate-300 font-bold text-[9px] italic pr-2">
                              <Loader2 className="animate-spin" size={14} aria-hidden="true" /> MAILING...
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => onVerify(item.id, item.name, true)}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                aria-label={`Approve ${item.name}`}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => onVerify(item.id, item.name, false)}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                aria-label={`Reject ${item.name}`}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden p-4 space-y-4">
            {filteredAndSortedQueue.map((item) => {
              const profilePhotoUrl = getBackendUrl(item.profilePicture);
              const idPhotoUrl = getBackendUrl(item.idPhoto);
              const credentialUrl = getBackendUrl(item.credentialPhoto);
              const hasProfilePhoto = !!profilePhotoUrl;
              const hasIdPhoto = !!idPhotoUrl;
              const hasCredential = !!credentialUrl;

              return (
                <div key={item.id} className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 shrink-0">
                      {hasProfilePhoto ? (
                        <img
                          src={profilePhotoUrl}
                          alt={`${item.name}'s profile`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.querySelector('.fallback-placeholder').style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold ${
                          hasProfilePhoto ? 'fallback-placeholder hidden' : ''
                        }`}
                        style={{ display: hasProfilePhoto ? 'none' : 'flex' }}
                      >
                        {item.name?.charAt(0)?.toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{item.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Service</p>
                      <p className="text-xs font-bold text-blue-600 truncate">{item.service_title || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Est. Cost</p>
                      <p className="text-xs font-mono font-bold text-emerald-600 italic">
                        {item.estimated_cost != null ? `${item.estimated_cost} ETB` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documents</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => hasIdPhoto && window.open(idPhotoUrl, '_blank')}
                        disabled={!hasIdPhoto}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase text-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          hasIdPhoto
                            ? 'bg-slate-900 text-white hover:bg-black focus:ring-slate-500'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        aria-label={hasIdPhoto ? `View ID document for ${item.name}` : `No ID document available for ${item.name}`}
                        aria-disabled={!hasIdPhoto}
                      >
                        ID DOC
                      </button>
                      <button
                        onClick={() => hasCredential && window.open(credentialUrl, '_blank')}
                        disabled={!hasCredential}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase text-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          hasCredential
                            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        aria-label={hasCredential ? `View licence for ${item.name}` : `No licence available for ${item.name}`}
                        aria-disabled={!hasCredential}
                      >
                        LICENCE
                      </button>
                    </div>
                  </div>

                  {item.service_description && (
                    <button
                      onClick={() => onViewDescription(item.service_description, item.name)}
                      className="text-xs text-blue-600 font-medium flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      aria-label={`Read full description for ${item.name}`}
                    >
                      <Eye size={12} aria-hidden="true" /> View full description
                    </button>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    {processingId === item.id ? (
                      <Loader2 className="animate-spin text-blue-600" size={20} aria-label="Processing" />
                    ) : (
                      <>
                        <button
                          onClick={() => onVerify(item.id, item.name, false)}
                          className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-[10px] font-black uppercase focus:outline-none focus:ring-2 focus:ring-red-500"
                          aria-label={`Reject ${item.name}`}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => onVerify(item.id, item.name, true)}
                          className="px-4 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          aria-label={`Approve ${item.name}`}
                        >
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="p-24 text-center">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
            <CheckCircle className="text-slate-300" size={32} aria-hidden="true" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            No providers match your filters
          </p>
          {(searchTerm || filterCategory) && (
            <button
              onClick={resetFilters}
              className="mt-4 text-blue-600 text-xs font-bold underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Clear all filters"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationQueueTable;