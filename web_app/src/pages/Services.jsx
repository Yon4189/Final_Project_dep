import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, X, CheckCircle, Loader2, 
  AlertCircle, RefreshCw, Trash, Save, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import api from '../api/axios';

const Services = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals and Alerts
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });

  // Form State
  const [formData, setFormData] = useState({ name: '', description: '', status: 'Active' });

  // Helper: Trigger Toast Notification
  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  //  1. FETCH DATA
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (err) {
      triggerToast("Database connection failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = categories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  //  2. CREATE OR UPDATE
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.catagoryID}`, formData);
        triggerToast("Category updated successfully!");
      } else {
        await api.post('/categories', formData);
        triggerToast("New category created!");
        setCurrentPage(1); // Go back to page 1 to see new item
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      triggerToast(err.response?.data?.message || "Failed to save", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  //  3. DELETE
  const confirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(`/categories/${deleteConfirm.id}`);
      triggerToast(`${deleteConfirm.name} has been deleted`);
      setDeleteConfirm({ show: false, id: null, name: '' });
      fetchCategories();
      // If last item on page deleted, go back one page
      if (currentItems.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
    } catch (err) {
      triggerToast("Cannot delete: Item in use", "error");
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
    <div className="relative space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed bottom-10 right-10 z- [100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-300 border ${
          toast.type === 'success' ? 'bg-slate-900 text-green-400 border-green-500/20' : 'bg-red-600 text-white border-none'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
          <span className="text-sm font-black uppercase tracking-wider">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Service Catalog</h1>
          <p className="text-slate-500 text-sm font-medium">Manage platform categories.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCategories} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm">
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-[#4a90e2] hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg transition-all active:scale-95">
            <Plus size={20} /> Add New 
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[2 rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Querying MySQL...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">ID</th>
                  <th className="px-8 py-5">Name</th>
                  <th className="px-8 py-5">Description</th>
                  <th className="px-8 py-5">Status</th> 
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentItems.map((cat) => (
                  <tr key={cat.catagoryID} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-slate-300">#{cat.catagoryID}</td>
                    <td className="px-8 py-5 font-black text-slate-800">{cat.name}</td>
                    <td className="px-8 py-5 text-sm text-slate-500 max-w-xs truncate">{cat.description || 'N/A'}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                        cat.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {cat.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(cat)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"><Edit2 size={18} /></button>
                        <button onClick={() => setDeleteConfirm({ show: true, id: cat.catagoryID, name: cat.name })} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* --- PAGINATION FOOTER --- */}
        {!isLoading && categories.length > itemsPerPage && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
               {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, categories.length)} of {categories.length}
            </span>
            
            <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                disabled={currentPage === 1}
                onClick={() => paginate(currentPage - 1)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Page Number Buttons */}
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                    currentPage === i + 1 
                    ? 'bg-[#4a90e2] text-white shadow-lg shadow-blue-100' 
                    : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button 
                disabled={currentPage === totalPages}
                onClick={() => paginate(currentPage + 1)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DELETE MODAL */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z- [110] p-4">
          <div className="bg-white rounded-[2 rem] shadow-2xl w-full max-w-sm p-8 text-center space-y-6 animate-in zoom-in duration-200">
             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
               {isSubmitting ? <Loader2 className="animate-spin" size={32} /> : <Trash size={32} />}
             </div>
             <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Category?</h3>
             <div className="flex gap-3 pt-2">
               <button disabled={isSubmitting} onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200">Cancel</button>
               <button disabled={isSubmitting} onClick={confirmDelete} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 shadow-lg shadow-red-100 flex items-center justify-center">
                 {isSubmitting ? "Deleting..." : "Delete"}
               </button>
             </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 tracking-tighter">
                {editingCategory ? 'Update Entry' : 'New Category'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={28} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Name</label>
                <input type="text" required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                   <option value="Active">Active</option>
                   <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea rows="3" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-600" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:bg-slate-400">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                  {isSubmitting ? "Wait..." : "Save Category"}
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