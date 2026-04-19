import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const searchInputRef = useRef(null);
  const categorySelectRef = useRef(null);
  
  const translateDBString = (str) => {
    if (!str) return str;
    const key = str.toLowerCase().replace(/\s+/g, '_');
    
    // Check for category matches
    if (key.includes('electronic')) return t('db_cat_electronic_repair');
    if (key.includes('home_maintenance')) return t('db_cat_home_maintenance');
    if (key.includes('plumbering') || key.includes('plumbing')) return t('db_cat_plumbing');
    if (key.includes('cleaning')) return t('db_cat_cleaning');
    
    // Check for document matches
    if (key.includes('passport')) return t('db_doc_passport');
    if (key.includes('national')) return t('db_doc_national');
    if (key.includes('licence') || key.includes('license')) return t('db_doc_licence');

    return t(`db_${key}`) !== `db_${key}` ? t(`db_${key}`) : str;
  };

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
        <thead className="bg-slate-50 dark:bg-black/20 text-slate-400 dark:text-slate-500 text-xs uppercase font-black border-b border-admin-border tracking-tighter">
          <tr>
            <th className="px-6 py-5">{t('vqueue_col_name')}</th>
            <th className="px-6 py-5">{t('vqueue_col_category')}</th>
            <th className="px-6 py-5">{t('vqueue_col_service')}</th>
            <th className="px-6 py-5">{t('vqueue_col_desc')}</th>
            <th className="px-6 py-5 text-center">{t('vqueue_col_cost')}</th>
            <th className="px-6 py-5 text-center">{t('vqueue_col_files')}</th>
            <th className="px-6 py-5 text-center">{t('vqueue_col_submission')}</th>
            <th className="px-8 py-5 text-center">{t('vqueue_col_action')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {[...Array(3)].map((_, i) => (
            <tr key={i}>
              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                  <div>
                    <div className="h-4 w-24 bg-slate-200 bg-admin-card rounded mb-1"></div>
                    <div className="h-3 w-32 bg-slate-200 bg-admin-card rounded"></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5"><div className="h-5 w-20 bg-slate-200 bg-admin-card rounded"></div></td>
              <td className="px-6 py-5"><div className="h-5 w-24 bg-slate-200 bg-admin-card rounded"></div></td>
              <td className="px-6 py-5"><div className="h-5 w-40 bg-slate-200 bg-admin-card rounded"></div></td>
              <td className="px-6 py-5 text-center"><div className="h-5 w-12 bg-slate-200 bg-admin-card rounded mx-auto"></div></td>
              <td className="px-6 py-5">
                <div className="flex flex-col gap-1.5 items-center">
                  <div className="w-28 h-7 bg-slate-200 bg-admin-card rounded"></div>
                  <div className="w-28 h-7 bg-slate-200 bg-admin-card rounded"></div>
                </div>
              </td>
              <td className="px-6 py-5 text-center"><div className="h-5 w-16 bg-slate-200 bg-admin-card rounded mx-auto"></div></td>
              <td className="px-8 py-5"><div className="w-20 h-8 bg-slate-200 bg-admin-card rounded ml-auto"></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const MobileSkeleton = () => (
    <div className="lg:hidden p-4 space-y-4 animate-pulse" aria-label="Loading mobile cards">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-admin-card/50 rounded-3xl p-5 border border-admin-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800"></div>
            <div className="flex-1">
              <div className="h-4 w-32 bg-slate-200 bg-admin-card rounded mb-1"></div>
              <div className="h-3 w-40 bg-slate-200 bg-admin-card rounded"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="h-3 w-16 bg-slate-200 bg-admin-card rounded mb-1"></div><div className="h-4 w-20 bg-slate-200 bg-admin-card rounded"></div></div>
            <div><div className="h-3 w-16 bg-slate-200 bg-admin-card rounded mb-1"></div><div className="h-4 w-16 bg-slate-200 bg-admin-card rounded"></div></div>
          </div>
          <div><div className="h-3 w-20 bg-slate-200 bg-admin-card rounded mb-2"></div><div className="flex gap-2"><div className="flex-1 h-8 bg-slate-200 bg-admin-card rounded"></div><div className="flex-1 h-8 bg-slate-200 bg-admin-card rounded"></div></div></div>
          <div className="flex justify-end gap-3"><div className="w-20 h-8 bg-slate-200 bg-admin-card rounded"></div><div className="w-20 h-8 bg-slate-200 bg-admin-card rounded"></div></div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-admin-card rounded-[2.5rem] shadow-sm border border-admin-border overflow-hidden">
        <div className="p-8 border-b border-admin-border bg-admin-card">
          <div className="h-6 w-32 bg-slate-200 bg-admin-card rounded animate-pulse"></div>
        </div>
        <TableSkeleton />
        <MobileSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-admin-card rounded-[2.5rem] shadow-sm border border-admin-border overflow-hidden">
      {/* Header with filter bar */}
      <div className="p-8 border-b border-admin-border bg-admin-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-black text-admin-text uppercase text-xs tracking-widest flex items-center gap-2">
            {t('vqueue_title')}
            <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-black">
              {filteredAndSortedQueue.length}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} aria-hidden="true" />
              <label htmlFor="queue-search" className="sr-only">{t('vqueue_search_placeholder')}</label>
              <input
                id="queue-search"
                type="text"
                placeholder={t('vqueue_search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ref={searchInputRef}
                className="pl-9 pr-3 py-2 border border-admin-border bg-admin-card rounded-xl text-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 text-admin-text"
              />
            </div>
            <label htmlFor="category-filter" className="sr-only">{t('vqueue_filter_all')}</label>
            <select
              id="category-filter"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              ref={categorySelectRef}
              className="px-3 py-2 border border-admin-border rounded-xl text-xs bg-admin-card text-admin-text focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('vqueue_filter_all')}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={() => toggleSort('name')}
              className={`px-3 py-2 border rounded-xl text-xs flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${sortBy === 'name'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              aria-label={`${t('vqueue_sort_name')} ${sortBy === 'name' && sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              {t('vqueue_sort_name')}
              {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
            </button>
            <button
              onClick={() => toggleSort('date')}
              className={`px-3 py-2 border rounded-xl text-xs flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${sortBy === 'date'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              aria-label={`${t('vqueue_sort_date')} ${sortBy === 'date' && sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              {t('vqueue_sort_date')}
              {sortBy === 'date' && (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
            </button>
            {(searchTerm || filterCategory || sortBy !== 'date' || sortOrder !== 'desc') && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 border border-red-200 rounded-xl text-xs text-red-600 hover:bg-red-50 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label={t('vqueue_clear')}
              >
                <X size={12} /> {t('vqueue_clear')}
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] font-bold text-slate-400 italic mt-2">
          {t('vqueue_review_msg')}
        </p>
      </div>

      {/* Table content */}
      {filteredAndSortedQueue.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full text-left" aria-label="Verification queue table">
              <thead className="bg-slate-50 dark:bg-black/20 text-admin-text-muted text-xs uppercase font-black border-b border-admin-border tracking-tighter">
                <tr>
                  <th className="px-6 py-5">{t('vqueue_col_name')}</th>
                  <th className="px-6 py-5">{t('vqueue_col_category')}</th>
                  <th className="px-6 py-5">{t('vqueue_col_service')}</th>
                  <th className="px-6 py-5">{t('vqueue_col_desc')}</th>
                  <th className="px-6 py-5 text-center">{t('vqueue_col_cost')}</th>
                  <th className="px-6 py-5 text-center">{t('vqueue_col_files')}</th>
                  <th className="px-6 py-5 text-center">{t('vqueue_col_submission')}</th>
                  <th className="px-8 py-5 text-center">{t('vqueue_col_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
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
                                className="w-10 h-10 rounded-full object-cover border-2 border-admin-border"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.querySelector('.fallback-placeholder').style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm ${hasProfilePhoto ? 'fallback-placeholder hidden' : ''
                                }`}
                              style={{ display: hasProfilePhoto ? 'none' : 'flex' }}
                            >
                              {item.name?.charAt(0)?.toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-admin-text text-sm leading-tight whitespace-nowrap">
                              {item.name}
                            </p>
                            <p className="text-xs text-admin-text-muted font-bold">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-admin-text text-xs font-bold uppercase tracking-wider italic">
                          {item.service_type || 'Root'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-admin-text-muted uppercase tracking-wider">
                          {item.service_title || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-5 max-w-[180px]">
                        {item.service_description ? (
                          <div>
                            <p className="text-xs text-admin-text-muted font-medium leading-snug line-clamp-2">
                              {item.service_description}
                            </p>
                            <button
                              onClick={() => onViewDescription(item.service_description, item.name)}
                              className="mt-1 flex items-center gap-1 text-blue-500 hover:text-blue-700 font-black text-[9px] uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                              aria-label={`${t('vqueue_read_more')} ${item.name}`}
                            >
                              <Eye size={10} aria-hidden="true" /> {t('vqueue_read_more')}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">{t('vqueue_no_desc')}</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-black font-mono text-sm text-emerald-600">
                          {item.estimated_cost != null ? (
                            <>{item.estimated_cost} <span className="text-xs">ETB</span></>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 text-xs italic">—</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5 items-center">
                          <button
                            onClick={() => hasIdPhoto && window.open(idPhotoUrl, '_blank')}
                            disabled={!hasIdPhoto}
                            className={`w-28 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${hasIdPhoto
                                ? 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-black dark:hover:bg-black focus:ring-slate-500'
                                : 'bg-slate-200 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                              }`}
                            aria-label={hasIdPhoto ? `${t('vqueue_id_doc')} for ${item.name}` : `No ID document available for ${item.name}`}
                            aria-disabled={!hasIdPhoto}
                          >
                            <ImageIcon size={12} aria-hidden="true" />
                            {item.idPhotoType ? translateDBString(item.idPhotoType.split(' ')[0]) : t('vqueue_id_doc')}
                          </button>
                          <button
                            onClick={() => hasCredential && window.open(credentialUrl, '_blank')}
                            disabled={!hasCredential}
                            className={`w-28 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${hasCredential
                                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                                : 'bg-slate-200 bg-admin-card text-slate-400 dark:text-slate-600 cursor-not-allowed'
                              }`}
                            aria-label={hasCredential ? `${t('vqueue_licence')} for ${item.name}` : `No licence available for ${item.name}`}
                            aria-disabled={!hasCredential}
                          >
                            <FileCheck size={10} aria-hidden="true" /> {t('vqueue_licence')}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <Calendar size={12} className="text-slate-300" aria-hidden="true" />
                          <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">
                            {item.submission_date || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-end gap-3">
                          {processingId === item.id ? (
                            <div className="flex items-center gap-2 text-slate-300 font-bold text-[9px] italic pr-2">
                              <Loader2 className="animate-spin" size={14} aria-hidden="true" /> {t('vqueue_mailing')}
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => onVerify(item.id, item.name, true)}
                                className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase shadow-lg shadow-green-100 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2"
                                aria-label={`${t('vqueue_approve')} ${item.name}`}
                              >
                                {t('vqueue_approve')}
                              </button>
                              <button
                                onClick={() => onVerify(item.id, item.name, false)}
                                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:shadow-red-900/20 shadow-lg shadow-red-100 flex items-center gap-2"
                                aria-label={`${t('vqueue_reject')} ${item.name}`}
                              >
                                {t('vqueue_reject')}
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
                <div key={item.id} className="bg-white rounded-3xl p-5 border border-admin-border space-y-4 shadow-sm">
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
                        className={`w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold ${hasProfilePhoto ? 'fallback-placeholder hidden' : ''
                          }`}
                        style={{ display: hasProfilePhoto ? 'none' : 'flex' }}
                      >
                        {item.name?.charAt(0)?.toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-admin-text text-sm truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{item.email}</p>
                    </div>
                  </div>

                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-admin-border">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('vqueue_col_service')}</p>
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate">{item.service_title || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('vqueue_col_cost')}</p>
                        <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 italic">
                          {item.estimated_cost != null ? `${item.estimated_cost} ETB` : '—'}
                        </p>
                      </div>
                    </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('vqueue_col_files')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => hasIdPhoto && window.open(idPhotoUrl, '_blank')}
                        disabled={!hasIdPhoto}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase text-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${hasIdPhoto
                            ? 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-black dark:hover:bg-black focus:ring-slate-500'
                            : 'bg-slate-200 bg-admin-card text-slate-400 dark:text-slate-600 cursor-not-allowed'
                          }`}
                        aria-label={hasIdPhoto ? `${t('vqueue_id_doc')} for ${item.name}` : `No ID document available for ${item.name}`}
                        aria-disabled={!hasIdPhoto}
                      >
                        {item.idPhotoType ? translateDBString(item.idPhotoType.split(' ')[0]) : t('vqueue_id_doc')}
                      </button>
                      <button
                        onClick={() => hasCredential && window.open(credentialUrl, '_blank')}
                        disabled={!hasCredential}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase text-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${hasCredential
                            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                            : 'bg-slate-200 bg-admin-card text-slate-400 dark:text-slate-600 cursor-not-allowed'
                          }`}
                        aria-label={hasCredential ? `${t('vqueue_licence')} for ${item.name}` : `No licence available for ${item.name}`}
                        aria-disabled={!hasCredential}
                      >
                        {t('vqueue_licence')}
                      </button>
                    </div>
                  </div>

                  {item.service_description && (
                      <button
                        onClick={() => onViewDescription(item.service_description, item.name)}
                        className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        aria-label={`${t('vqueue_view_full_desc')} for ${item.name}`}
                      >
                      <Eye size={12} aria-hidden="true" /> {t('vqueue_view_full_desc')}
                    </button>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    {processingId === item.id ? (
                      <Loader2 className="animate-spin text-blue-600" size={20} aria-label="Processing" />
                    ) : (
                      <>
                          <button
                            onClick={() => onVerify(item.id, item.name, false)}
                            className="flex-1 py-3 border border-red-200 dark:border-red-900/30 text-red-500 dark:text-red-400 rounded-xl text-[11px] font-black uppercase focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-label={`${t('vqueue_reject')} ${item.name}`}
                          >
                            {t('vqueue_reject')}
                          </button>
                        <button
                          onClick={() => onVerify(item.id, item.name, true)}
                          className="flex-1 py-3 bg-green-500 text-white rounded-xl text-[11px] font-black uppercase shadow-lg shadow-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          aria-label={`${t('vqueue_approve')} ${item.name}`}
                        >
                          {t('vqueue_approve')}
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
          <div className="bg-admin-card/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-admin-border">
            <CheckCircle className="text-slate-300 dark:text-slate-700" size={32} aria-hidden="true" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            {t('vqueue_no_match')}
          </p>
          {(searchTerm || filterCategory) && (
            <button
              onClick={resetFilters}
              className="mt-4 text-blue-600 text-xs font-bold underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label={t('vqueue_clear_filters')}
            >
              {t('vqueue_clear_filters')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationQueueTable;