import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash, Loader2 } from 'lucide-react';

const DeleteConfirmModal = ({ show, name, isSubmitting, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-admin-card rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in duration-200 border border-admin-border">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          {isSubmitting ? <Loader2 className="animate-spin" size={32} /> : <Trash size={32} />}
        </div>
        <h3 className="text-xl font-bold text-admin-text uppercase tracking-tight">{t('serv_modal_confirm_delete')}</h3>
        <p className="text-admin-text-muted text-sm mt-2 font-medium">{name}</p>
        <div className="flex gap-3 mt-8">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-2xl bg-slate-100 bg-admin-card text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            {t('modal_cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition disabled:opacity-50"
          >
            {t('serv_delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;