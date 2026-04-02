import React from 'react';
import { Trash, Loader2 } from 'lucide-react';

const DeleteConfirmModal = ({ show, name, isSubmitting, onConfirm, onCancel }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in duration-200">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          {isSubmitting ? <Loader2 className="animate-spin" size={32} /> : <Trash size={32} />}
        </div>
        <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Confirm Deletion</h3>
        <p className="text-slate-500 text-sm mt-2 font-medium">{name}</p>
        <div className="flex gap-3 mt-8">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;