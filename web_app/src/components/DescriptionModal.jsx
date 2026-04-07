import React, { useEffect, useRef } from 'react';
import { XCircle } from 'lucide-react';

const DescriptionModal = ({ show, providerName, description, onClose }) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (show) {
      closeButtonRef.current?.focus();
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
      if (e.key === 'Escape' && show) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="description-modal-title"
      aria-describedby="description-modal-content"
    >
      <div
        ref={modalRef}
        className="bg-admin-card rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200 border border-admin-border"
      >
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <h2 id="description-modal-title" className="text-xl font-black italic tracking-tighter uppercase">
            Service Description – {providerName}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="focus:outline-none focus:ring-2 focus:ring-white rounded-full"
            aria-label="Close description modal"
          >
            <XCircle size={28} />
          </button>
        </div>
        <div id="description-modal-content" className="p-8">
          <p className="text-admin-text text-base leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </div>
        <div className="p-6 border-t border-admin-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-200 bg-admin-card hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DescriptionModal;