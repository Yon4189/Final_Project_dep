import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Loader2 } from 'lucide-react';

const CategoryModal = ({ isOpen, category, onClose, onSubmit, isSubmitting }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active'
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        status: category.status || 'Active'
      });
    } else {
      setFormData({ name: '', description: '', status: 'Active' });
    }
  }, [category, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-admin-card rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-admin-border">
        <div className="p-6 border-b border-admin-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="text-xl font-bold text-admin-text uppercase tracking-tight">
            {category ? t('serv_modal_update_cat') : t('serv_modal_new_cat')}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full"
            aria-label={t('modal_close')}
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-admin-text-muted uppercase tracking-wider mb-1 block">
              {t('serv_modal_cat_name')}
            </label>
            <input
              type="text"
              required
              className="w-full border border-admin-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-admin-card text-admin-text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-admin-text-muted uppercase tracking-wider mb-1 block">
              {t('serv_status')}
            </label>
            <select
              className="w-full border border-admin-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none bg-admin-card text-admin-text"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Active">{t('serv_status_active')}</option>
              <option value="Inactive">{t('serv_status_inactive')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-admin-text-muted uppercase tracking-wider mb-1 block">
              {t('serv_modal_desc_optional')}
            </label>
            <textarea
              rows="3"
              className="w-full border border-admin-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition bg-admin-card text-admin-text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-800 dark:bg-blue-600 hover:bg-slate-900 dark:hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSubmitting ? t('serv_modal_saving') : t('serv_modal_save_cat')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;