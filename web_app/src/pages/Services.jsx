import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Plus, RefreshCw, Database, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import { useServicesData } from '../hooks/useServicesData';
import ServicesTable from '../components/ServicesTable';
import CategoryModal from '../components/CategoryModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const Services = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { categories, services, providers, isLoading, isError, error, refresh } = useServicesData();

  // Determine active tab from URL
  const activeTab = location.pathname.includes('/services/services') ? 'services' : 'categories';

  // Filter state for services
  const [filterCategory, setFilterCategory] = useState('');
  const [costMin, setCostMin] = useState('');
  const [costMax, setCostMax] = useState('');

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const categoryIsInUse = (catagoryID) => {
    const usedByServices = services.some(s => s.catagoryID === catagoryID);
    const usedByProviders = providers.some(p => p.catagoryID === catagoryID);
    return usedByServices || usedByProviders;
  };

  const handleCategorySubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory.catagoryID}`, formData);
        showToast('Category updated successfully');
      } else {
        await api.post('/admin/categories', formData);
        showToast('Category added successfully');
      }
      setIsModalOpen(false);
      setEditingCategory(null);
      queryClient.invalidateQueries({ queryKey: ['servicesSystem'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving category';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = (item) => {
    if (categoryIsInUse(item.catagoryID)) {
      showToast('Cannot delete: category is used by services or providers', 'error');
      return;
    }
    setDeleteConfirm({ show: true, id: item.catagoryID, name: item.name });
  };

  const confirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(`/admin/categories/${deleteConfirm.id}`);
      showToast('Category deleted successfully');
      setDeleteConfirm({ show: false, id: null, name: '' });
      queryClient.invalidateQueries({ queryKey: ['servicesSystem'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    } catch (err) {
      const msg = err.response?.data?.message || 'Cannot delete due to constraints';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (category = null) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setFilterCategory('');
    setCostMin('');
    setCostMax('');
  };

  const dbStatus = isError ? 'disconnected' : (isLoading ? 'checking' : 'connected');

  return (
    <div className="relative space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed bottom-10 right-10 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl animate-in slide-in-from-right-10 border ${toast.type === 'success' ? 'bg-slate-800 text-green-400 border-green-500/30' : 'bg-red-600 text-white border-red-400/30'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {activeTab === 'categories' ? 'Categories' : 'Services'}
          </h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">
            {activeTab === 'categories' ? 'Manage service categories' : 'View system services'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Database size={14} className={
              dbStatus === 'connected' ? 'text-green-500' :
                dbStatus === 'disconnected' ? 'text-red-500' : 'text-yellow-500 animate-pulse'
            } />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {dbStatus === 'connected' && 'Database Connected'}
              {dbStatus === 'disconnected' && 'Database Disconnected'}
              {dbStatus === 'checking' && 'Checking Database...'}
            </span>
          </div>
          <button
            onClick={refresh}
            className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Refresh data"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {activeTab === 'categories' && dbStatus === 'connected' && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus size={18} /> Add Category
            </button>
          )}
        </div>
      </div>

      <ServicesTable
        activeTab={activeTab}
        categories={categories}
        services={services}
        providers={providers}
        isLoading={isLoading}
        dbStatus={dbStatus}
        error={error}
        onRefresh={refresh}
        onEditCategory={openModal}
        onDeleteCategory={handleDeleteCategory}
        categoryIsInUse={categoryIsInUse}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        costMin={costMin}
        setCostMin={setCostMin}
        costMax={costMax}
        setCostMax={setCostMax}
        resetFilters={resetFilters}
      />

      <CategoryModal
        isOpen={isModalOpen}
        category={editingCategory}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleCategorySubmit}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmModal
        show={deleteConfirm.show}
        name={deleteConfirm.name}
        isSubmitting={isSubmitting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ show: false, id: null, name: '' })}
      />
    </div>
  );
};

export default Services;