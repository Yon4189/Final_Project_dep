import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, X, CheckCircle, Loader2,
  AlertCircle, RefreshCw, Trash, Save,
  ChevronLeft, ChevronRight, Layers, Wrench, Database, Search
} from 'lucide-react';
import api from '../api/axios';

const Services = () => {
  const queryClient = useQueryClient();
  const location = useLocation();

  const getActiveTabFromPath = () => {
    if (location.pathname.includes('/services/categories')) return 'categories';
    if (location.pathname.includes('/services/services')) return 'services';
    return 'categories';
  };

  const activeTab = getActiveTabFromPath();

  // 🚀 HELPER: Extract array from API response (flexible)
  const extractData = (response, expectedKey = null) => {
    if (!response || !response.data) return [];
    if (Array.isArray(response.data)) return response.data;

    const obj = response.data.data ? response.data.data : response.data;
    if (Array.isArray(obj)) return obj;

    if (expectedKey && Array.isArray(obj[expectedKey])) return obj[expectedKey];
    
    // Fallback search
    for (let key in obj) {
      if (Array.isArray(obj[key])) return obj[key];
    }
    return [];
  };

  // 1. Data Fetching with TanStack Query
  const { 
    data: { categories = [], services = [], providers = [] } = {}, 
    isLoading, 
    error: apiError,
    refetch 
  } = useQuery({
    queryKey: ['servicesSystem'],
    queryFn: async () => {
      const [catRes, svcRes, provRes] = await Promise.allSettled([
        api.get('/admin/categories'),
        api.get('/admin/services'),
        api.get('/admin/providers')
      ]);

      const categories = catRes.status === 'fulfilled' ? extractData(catRes.value, 'categories') : [];
      const services = svcRes.status === 'fulfilled' ? extractData(svcRes.value, 'services') : [];
      const providers = provRes.status === 'fulfilled' ? extractData(provRes.value, 'providers') : [];

      return { categories, services, providers };
    },
    staleTime: 60000,
    refetchInterval: 30000,
  });

  const dbStatus = apiError ? 'disconnected' : (isLoading ? 'checking' : 'connected');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });

  const [formData, setFormData] = useState({ name: '', description: '', status: 'Active' });
  const [searchQuery, setSearchQuery] = useState('');

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Helper to get category name by ID
  const getCategoryName = (catagoryID) => {
    const cat = categories.find(c => c.catagoryID === catagoryID);
    return cat ? cat.name : 'Unknown';
  };

  // --- FILTERING & PAGINATION LOGIC ---
  const filteredData = (activeTab === 'categories' ? categories : services).filter(item => {
    const searchLower = searchQuery.toLowerCase();
    if (activeTab === 'categories') {
      return item.name.toLowerCase().includes(searchLower) ||
        String(item.catagoryID).includes(searchLower);
    } else {
      return item.title.toLowerCase().includes(searchLower) ||
        String(item.serviceID).includes(searchLower) ||
        getCategoryName(item.catagoryID).toLowerCase().includes(searchLower);
    }
  });

  const dataToDisplay = filteredData;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = dataToDisplay.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(dataToDisplay.length / itemsPerPage) || 1;

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Check if a category is in use by services or providers
  const categoryIsInUse = (catagoryID) => {
    const usedByServices = services.some(s => s.catagoryID === catagoryID);
    const usedByProviders = providers.some(p => p.catagoryID === catagoryID);
    return usedByServices || usedByProviders;
  };

  // 🚀 CRUD: SUBMIT (Categories Only)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory.catagoryID}`, formData);
        triggerToast('Category updated!');
      } else {
        await api.post('/admin/categories', formData);
        triggerToast('New Category added!');
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['servicesSystem'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving data';
      triggerToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚀 CRUD: DELETE (Categories Only) – with pre‑check
  const handleDeleteClick = (item) => {
    if (categoryIsInUse(item.catagoryID)) {
      triggerToast('Cannot delete: This category is used by services or service providers. Remove or reassign them first.', 'error');
      return;
    }
    setDeleteConfirm({ show: true, id: item.catagoryID, name: item.name });
  };

  const confirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(`/admin/categories/${deleteConfirm.id}`);
      triggerToast('Deleted successfully');
      setDeleteConfirm({ show: false, id: null, name: '' });
      queryClient.invalidateQueries({ queryKey: ['servicesSystem'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    } catch (err) {
      const msg = err.response?.data?.message || 'Cannot delete due to database constraints.';
      triggerToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({ name: cat.name, description: cat.description || '', status: cat.status || 'Active' });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', status: 'Active' });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="relative space-y-6 animate-in fade-in duration-500 pb-10">

      {/* TOAST SYSTEM */}
      {toast.show && (
        <div className={`fixed bottom-10 right-10 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 border ${toast.type === 'success' ? 'bg-slate-900 text-green-400 border-green-500/20' : 'bg-red-600 text-white'
          }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      {/* Header with Database Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">
            {activeTab === 'categories' ? 'Categories' : 'Services'}
          </h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-tighter">
            {activeTab === 'categories' ? 'Manage structure' : 'View marketplace services'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Database Status Indicator */}
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

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* New Category Button (only for categories) */}
          {activeTab === 'categories' && dbStatus === 'connected' && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-[#4a90e2] hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg transition-all active:scale-95"
            >
              <Plus size={20} /> New Category
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder={`Search ${activeTab === 'categories' ? 'categories' : 'services'} by name or ID...`}
          className="pl-12 pr-4 py-4 border border-slate-200 rounded-2xl w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm font-medium transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[450px] flex flex-col">
        <div className="overflow-x-auto flex-1 hidden lg:block">
          {isLoading ? (
            <div className="p-40 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Syncing MySQL</p>
            </div>
          ) : dbStatus === 'disconnected' ? (
            <div className="p-40 text-center flex flex-col items-center gap-4">
              <AlertCircle className="text-red-500" size={40} />
              <p className="font-black text-red-400 uppercase text-[10px] tracking-[0.2em]">
                {apiError ? `Error: ${apiError.message}` : 'Database connection failed'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-2 text-xs bg-slate-100 px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                Retry
              </button>
            </div>
          ) : dataToDisplay.length === 0 ? (
            <div className="p-40 text-center flex flex-col items-center gap-4">
              <p className="font-black text-slate-300 uppercase text-[10px] tracking-[0.2em]">
                {activeTab === 'categories' ? 'No categories found.' : 'No services found.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                <tr>
                  {activeTab === 'categories' ? (
                    <>
                      <th className="px-8 py-5">ID</th>
                      <th className="px-8 py-5">Name</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5">Description</th>
                      <th className="px-8 py-5 text-right">Action</th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5">Service ID</th>
                      <th className="px-8 py-5">Title</th>
                      <th className="px-8 py-5">Category</th>
                      <th className="px-8 py-5">Cost (ETB)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentItems.map((item) => (
                  <tr key={activeTab === 'categories' ? item.catagoryID : item.serviceID} className="hover:bg-slate-50/50 transition-colors">
                    {activeTab === 'categories' ? (
                      <>
                        <td className="px-8 py-5 font-mono text-xs font-bold text-slate-300">#{item.catagoryID}</td>
                        <td className="px-8 py-5 font-black text-slate-800">{item.name}</td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${item.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            }`}>
                            {item.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-500 max-w-xs truncate italic">{item.description || 'No description.'}</td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95"
                            >
                              <Edit2 size={16} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item)}
                              className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95"
                              title={categoryIsInUse(item.catagoryID) ? "Cannot delete – category is in use" : "Delete category"}
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-8 py-5 font-mono text-xs font-bold text-slate-300">#{item.serviceID}</td>
                        <td className="px-8 py-5 font-black text-slate-800 uppercase tracking-tighter">{item.title}</td>
                        <td className="px-8 py-5">
                          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase italic border border-blue-100">
                            {getCategoryName(item.catagoryID)}
                          </span>
                        </td>
                        <td className="px-8 py-5 font-black text-slate-800 font-mono tracking-tighter">{item.estimatedPrice}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden p-4 space-y-4">
          {isLoading ? (
            <div className="p-10 text-center flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="font-black text-slate-400 uppercase text-[10px]">Loading...</p>
            </div>
          ) : currentItems.length > 0 ? (
            currentItems.map((item) => (
              <div key={activeTab === 'categories' ? item.catagoryID : item.serviceID} className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] font-black text-slate-300">#{activeTab === 'categories' ? item.catagoryID : item.serviceID}</p>
                    <p className="font-black text-slate-800 text-base leading-tight">
                      {activeTab === 'categories' ? item.name : item.title}
                    </p>
                  </div>
                  {activeTab === 'categories' && (
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${item.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {item.status || 'Active'}
                    </span>
                  )}
                </div>

                {activeTab === 'services' && (
                  <div className="flex items-center justify-between">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase italic border border-blue-100">
                      {getCategoryName(item.catagoryID)}
                    </span>
                    <span className="font-black text-slate-800 font-mono text-sm">{item.estimatedPrice} ETB</span>
                  </div>
                )}

                {activeTab === 'categories' && item.description && (
                  <p className="text-xs text-slate-500 italic leading-relaxed line-clamp-2">{item.description}</p>
                )}

                {activeTab === 'categories' && (
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleOpenModal(item)} className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-100">
                      <Edit2 size={14} /> Edit
                    </button>
                    <button onClick={() => handleDeleteClick(item)} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-red-100">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-[10px] font-black text-slate-400 uppercase">No records found.</div>
          )}
        </div>

        {/* Pagination Footer */}
        {!isLoading && dbStatus === 'connected' && dataToDisplay.length > itemsPerPage && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              Entries {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, dataToDisplay.length)} of {dataToDisplay.length}
            </span>
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <button disabled={currentPage === 1} onClick={() => paginate(currentPage - 1)} className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-20 transition-all"><ChevronLeft size={20} /></button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i + 1} onClick={() => paginate(i + 1)} className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-admin-accent text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                  {i + 1}
                </button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => paginate(currentPage + 1)} className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-20 transition-all"><ChevronRight size={20} /></button>
            </div>
          </div>
        )}
      </div>

      {/* DELETE MODAL (Categories Only) */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {isSubmitting ? <Loader2 className="animate-spin" size={32} /> : <Trash size={32} />}
            </div>
            <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Confirm Deletion</h3>
            <p className="text-slate-400 text-xs mt-2 uppercase font-bold tracking-widest">{deleteConfirm.name}</p>
            <div className="flex gap-3 mt-8">
              <button disabled={isSubmitting} onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200">Cancel</button>
              <button disabled={isSubmitting} onClick={confirmDelete} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 shadow-lg shadow-red-100">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL (Categories Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">
                {editingCategory ? 'Update Entry' : 'New Category'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={28} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Title</label>
                <input type="text" required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select className="w-full bg-slate-100 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 cursor-pointer appearance-none" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea rows="3" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-600 transition-all" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:bg-slate-400">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {isSubmitting ? 'Wait...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;