import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, X, Edit2, Trash2, Loader2, AlertCircle, Filter, XCircle } from 'lucide-react';

const ServicesTable = ({
  activeTab,
  categories,
  services,
  providers,
  isLoading,
  dbStatus,
  error,
  onRefresh,
  onEditCategory,
  onDeleteCategory,
  categoryIsInUse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter states
  const [filterCategory, setFilterCategory] = useState('');
  const [minCost, setMinCost] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // for categories tab

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.catagoryID === categoryId);
    return cat ? cat.name : 'Unknown';
  };

  // Available categories for filter dropdown
  const availableCategories = categories.map(c => ({ id: c.catagoryID, name: c.name }));

  // Filtering logic
  const filterData = (items) => {
    let filtered = [...items];

    // Search filter
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        if (activeTab === 'categories') {
          return item.name?.toLowerCase().includes(term) ||
            String(item.catagoryID).includes(term);
        } else {
          return item.title?.toLowerCase().includes(term) ||
            String(item.serviceID).includes(term) ||
            getCategoryName(item.catagoryID).toLowerCase().includes(term);
        }
      });
    }

    // Filters for services
    if (activeTab === 'services') {
      if (filterCategory) {
        filtered = filtered.filter(item => item.catagoryID === parseInt(filterCategory));
      }
      if (minCost) {
        filtered = filtered.filter(item => item.estimatedPrice >= parseFloat(minCost));
      }
      if (maxCost) {
        filtered = filtered.filter(item => item.estimatedPrice <= parseFloat(maxCost));
      }
    }

    // Filters for categories
    if (activeTab === 'categories' && filterStatus) {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    return filtered;
  };

  const data = activeTab === 'categories' ? categories : services;
  const filteredData = filterData(data);

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setMinCost('');
    setMaxCost('');
    setFilterStatus('');
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterCategory, minCost, maxCost, filterStatus]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[450px] flex items-center justify-center">
        <div className="text-center p-12">
          <Loader2 className="animate-spin text-blue-500 w-10 h-10 mx-auto mb-4" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Loading data...</p>
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

  const hasActiveFilters = searchQuery || filterCategory || minCost || maxCost || filterStatus;

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
      {/* Search and Filters Bar */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'categories' ? 'categories' : 'services'} by name or ID...`}
              className="pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
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

          {/* Filters - side by side with search */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* "Filter By:" label */}
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter By:</span>

            {activeTab === 'services' ? (
              <>
                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                {/* Cost Range */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min Cost"
                    value={minCost}
                    onChange={(e) => setMinCost(e.target.value)}
                    className="w-24 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Max Cost"
                    value={maxCost}
                    onChange={(e) => setMaxCost(e.target.value)}
                    className="w-24 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </>
            ) : (
              /* Status Filter for Categories */
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            )}

            {/* Reset Filters Button */}
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

        {/* Show active filters summary */}
        {hasActiveFilters && (
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
            <Filter size={12} />
            <span>Active filters: </span>
            {searchQuery && <span className="bg-slate-100 px-2 py-0.5 rounded">Search: {searchQuery}</span>}
            {activeTab === 'services' && filterCategory && (
              <span className="bg-slate-100 px-2 py-0.5 rounded">Category: {availableCategories.find(c => c.id == filterCategory)?.name}</span>
            )}
            {activeTab === 'services' && minCost && <span className="bg-slate-100 px-2 py-0.5 rounded">Min: {minCost}</span>}
            {activeTab === 'services' && maxCost && <span className="bg-slate-100 px-2 py-0.5 rounded">Max: {maxCost}</span>}
            {activeTab === 'categories' && filterStatus && <span className="bg-slate-100 px-2 py-0.5 rounded">Status: {filterStatus}</span>}
          </div>
        )}
      </div>

      {/* Desktop Table (unchanged) */}
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-100">
            <tr>
              {activeTab === 'categories' ? (
                <>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </>
              ) : (
                <>
                  <th className="px-6 py-4">Service ID</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Cost (ETB)</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'categories' ? 5 : 4} className="text-center py-12 text-slate-400 text-sm">
                  No {activeTab === 'categories' ? 'categories' : 'services'} found.
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr key={activeTab === 'categories' ? item.catagoryID : item.serviceID} className="hover:bg-slate-50/50 transition-colors">
                  {activeTab === 'categories' ? (
                    <>
                      <td className="px-6 py-4 font-mono text-sm text-slate-400">#{item.catagoryID}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {item.description || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => onEditCategory(item)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => onDeleteCategory(item)}
                            disabled={categoryIsInUse(item.catagoryID)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 ${
                              categoryIsInUse(item.catagoryID)
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                : 'bg-red-500 hover:bg-red-600 text-white'
                            }`}
                            aria-label={`Delete ${item.name}`}
                            title={categoryIsInUse(item.catagoryID) ? "Cannot delete – category is in use" : "Delete category"}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-mono text-sm text-slate-400">#{item.serviceID}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{item.title}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                          {getCategoryName(item.catagoryID)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-emerald-600">
                        {item.estimatedPrice} ETB
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (unchanged) */}
      <div className="lg:hidden p-4 space-y-4">
        {currentItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No {activeTab === 'categories' ? 'categories' : 'services'} found.</div>
        ) : (
          currentItems.map((item) => (
            <div key={activeTab === 'categories' ? item.catagoryID : item.serviceID} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-xs text-slate-400">#{activeTab === 'categories' ? item.catagoryID : item.serviceID}</p>
                  <p className="font-semibold text-slate-800 text-base">
                    {activeTab === 'categories' ? item.name : item.title}
                  </p>
                </div>
                {activeTab === 'categories' && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.status || 'Active'}
                  </span>
                )}
              </div>

              {activeTab === 'services' && (
                <div className="flex justify-between items-center">
                  <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                    {getCategoryName(item.catagoryID)}
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 text-sm">{item.estimatedPrice} ETB</span>
                </div>
              )}

              {activeTab === 'categories' && item.description && (
                <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>
              )}

              {activeTab === 'categories' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => onEditCategory(item)}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => onDeleteCategory(item)}
                    disabled={categoryIsInUse(item.catagoryID)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${
                      categoryIsInUse(item.catagoryID)
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs font-medium text-slate-500">
            Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length}
          </span>
          <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button
              disabled={currentPage === 1}
              onClick={() => paginate(currentPage - 1)}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => paginate(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${currentPage === i + 1 ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => paginate(currentPage + 1)}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesTable;