import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Database, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import { useVerificationData } from '../hooks/useVerificationData';
import VerificationTable from '../components/VerificationTable';
import DescriptionModal from '../components/DescriptionModal';
import RejectModal from '../components/RejectModal';

const getFilterFromPath = (pathname) => {
  if (pathname.includes('/verification/pending')) return 'Pending';
  if (pathname.includes('/verification/approved')) return 'Approved';
  if (pathname.includes('/verification/rejected')) return 'Rejected';
  if (pathname.includes('/verification/suspended')) return 'Suspended';
  return 'Pending';
};

const Verification = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const location = useLocation();
  const filter = getFilterFromPath(location.pathname);

  const { providers, isLoading, isError, error, refetch } = useVerificationData(filter);

  const [processingId, setProcessingId] = useState(null);
  const [descriptionModal, setDescriptionModal] = useState({
    show: false,
    description: '',
    providerName: '',
  });
  const [rejectModal, setRejectModal] = useState({
    show: false,
    provider: null,
    reason: '',
  });

  const openDescriptionModal = (description, providerName) => {
    setDescriptionModal({ show: true, description, providerName });
  };

  const handleApprove = async (id, name) => {
    if (!window.confirm(t('vpage_approve_confirm', { name }))) return;
    setProcessingId(id);
    try {
      const response = await api.post(`/admin/providers/${id}/verify`, { status: 'approved' });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['providers'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        alert(t('vpage_alert_approved'));
      }
    } catch (err) {
      alert(t('vpage_alert_mail_error'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReactivate = async (id, name) => {
    if (!window.confirm(t('vpage_reactivate_confirm', { name }))) return;
    setProcessingId(id);
    try {
      const response = await api.post(`/admin/providers/${id}/verify`, { status: 'approved' });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['providers'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        alert(t('vpage_alert_reactivated'));
      }
    } catch (err) {
      alert(t('common_error'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (id, name) => {
    if (!window.confirm(t('vpage_suspend_confirm', { name }))) return;
    setProcessingId(id);
    try {
      const response = await api.post(`/admin/providers/${id}/verify`, {
        status: 'suspended',
        verification_reason: 'Account suspended by administration.',
      });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['providers'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        alert(t('vpage_alert_suspended'));
      }
    } catch (err) {
      alert(t('common_error'));
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (provider) => {
    setRejectModal({ show: true, provider, reason: '' });
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal.provider) return;
    setProcessingId(rejectModal.provider.id);
    try {
      const response = await api.post(`/admin/providers/${rejectModal.provider.id}/verify`, {
        status: 'rejected',
        verification_reason: rejectModal.reason,
      });
      if (response.data.success) {
        setRejectModal({ show: false, provider: null, reason: '' });
        queryClient.invalidateQueries({ queryKey: ['providers'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        alert(t('vpage_alert_rejected'));
      }
    } catch (err) {
      alert(t('common_error'));
    } finally {
      setProcessingId(null);
    }
  };

  const dbStatus = isError ? 'disconnected' : (isLoading ? 'checking' : 'connected');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <DescriptionModal
        show={descriptionModal.show}
        providerName={descriptionModal.providerName}
        description={descriptionModal.description}
        onClose={() => setDescriptionModal({ show: false, description: '', providerName: '' })}
      />
      <RejectModal
        show={rejectModal.show}
        providerName={rejectModal.provider?.name}
        defaultReason={t('alert_provide_reason')}
        inputReason={rejectModal.reason}
        onReasonChange={(value) => setRejectModal(prev => ({ ...prev, reason: value }))}
        onSubmit={handleRejectSubmit}
        onCancel={() => setRejectModal({ show: false, provider: null, reason: '' })}
        isLoading={processingId === rejectModal.provider?.id}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-admin-text tracking-tight italic">
              {t('vpage_title', { status: t(filter.toLowerCase()) })}
            </h1>
            {providers.length > 0 && (
              <span className="bg-blue-500 text-white text-[10px] px-3 py-1 rounded-full font-black shadow-sm">
                {providers.length}
              </span>
            )}
          </div>
          <p className="text-admin-text-muted text-[10px] font-black uppercase tracking-widest italic mt-1">
            {t('vpage_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-admin-border bg-admin-card shadow-sm">
            <Database size={14} className={dbStatus === 'connected' ? 'text-green-500' : 'text-red-500'} />
            <span className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted">
              {dbStatus === 'connected' ? t('db_connected') :
                dbStatus === 'disconnected' ? t('db_disconnected') :
                  t('db_checking')}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-admin-card border border-admin-border rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Refresh data"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <VerificationTable
        providers={providers}
        isLoading={isLoading}
        processingId={processingId}
        onApprove={handleApprove}
        onReject={openRejectModal}
        onSuspend={handleSuspend}
        onReactivate={handleReactivate}
        onViewDescription={openDescriptionModal}
        dbStatus={dbStatus}
        error={error}
        onRefresh={refetch}
      />
    </div>
  );
};

export default Verification;