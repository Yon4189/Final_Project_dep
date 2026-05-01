import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';

const RejectModal = ({
  show,
  providerName,
  defaultReason,
  inputReason,
  onReasonChange,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef(null);
  const textareaRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (show) {
      textareaRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && show && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onCancel, isLoading]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      aria-describedby="reject-modal-description"
    >
      <div
        ref={modalRef}
        className="bg-admin-card rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border border-admin-border"
      >
        <div className="p-6 bg-red-500 text-white flex justify-between items-center">
          <h2 id="reject-modal-title" className="text-lg font-black italic tracking-tighter uppercase">
            {t('modal_reject_title')} – {providerName}
          </h2>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="focus:outline-none focus:ring-2 focus:ring-white rounded-full disabled:opacity-50"
            aria-label={t('modal_cancel')}
          >
            <XCircle size={28} />
          </button>
        </div>
        <div className="p-6">
          <label id="reject-modal-description" className="block text-admin-text font-bold mb-2 text-xs uppercase">
            {t('modal_reject_reason')}
          </label>
          <textarea
            ref={textareaRef}
            disabled={isLoading}
            className="w-full border border-admin-border rounded-xl p-3 text-sm text-admin-text focus:outline-none focus:ring-2 focus:ring-red-400 bg-admin-card transition-colors disabled:opacity-50"
            rows={3}
            placeholder={defaultReason}
            value={inputReason}
            onChange={(e) => onReasonChange(e.target.value)}
            aria-required="true"
          />
        </div>
        <div className="p-6 border-t border-admin-border flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={isLoading}
            className="bg-admin-card hover:bg-slate-100 dark:hover:bg-slate-700 text-admin-text font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 border border-admin-border disabled:opacity-50"
          >
            {t('modal_cancel')}
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            aria-label={t('modal_submit')}
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? t('processing') || '...' : t('modal_submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;