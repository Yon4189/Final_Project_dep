import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Database, Users, UserCheck, Clock, Banknote, Layers, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAdminData } from '../hooks/useAdminData';
import StatCard from '../components/StatCard';
import VerificationQueueTable from '../components/VerificationQueueTable';
import DescriptionModal from '../components/DescriptionModal';
import RejectModal from '../components/RejectModal';

const Dashboard = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { stats, pendingQueue, isLoading, isError, refresh } = useAdminData();

  // Filter & sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const resetFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setSortBy('date');
    setSortOrder('desc');
  };

  // UI state for modals
  const [processingId, setProcessingId] = useState(null);
  const [descriptionModal, setDescriptionModal] = useState({
    show: false,
    description: '',
    providerName: '',
  });
  const [rejectModal, setRejectModal] = useState({
    show: false,
    providerId: null,
    providerName: '',
    defaultReason: t('modal_reject_placeholder'),
    inputReason: '',
  });

  const openDescriptionModal = (description, providerName) => {
    setDescriptionModal({ show: true, description, providerName });
  };

  const processVerification = async (id, status, reason = null) => {
    setProcessingId(id);
    try {
      const response = await api.post(`/admin/providers/${id}/verify`, {
        status,
        verification_reason: reason,
      });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        queryClient.invalidateQueries({ queryKey: ['pendingProviders'] });
        alert(status === 'approved' ? t('alert_approved') : t('alert_rejected'));
      }
    } catch (error) {
      alert(t('alert_action_failed'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerification = (id, name, approve) => {
    if (!approve) {
      setRejectModal({
        show: true,
        providerId: id,
        providerName: name,
        defaultReason: t('modal_reject_placeholder'),
        inputReason: '',
      });
      return;
    }
    if (!window.confirm(t('confirm_approve', { name }))) return;
    processVerification(id, 'approved');
  };

  const handleRejectSubmit = () => {
    if (!rejectModal.inputReason.trim()) {
      alert(t('alert_provide_reason'));
      return;
    }
    setRejectModal((prev) => ({ ...prev, show: false }));
    processVerification(rejectModal.providerId, 'rejected', rejectModal.inputReason);
  };

  const handleRejectCancel = () => {
    setRejectModal({
      show: false,
      providerId: null,
      providerName: '',
      defaultReason: t('modal_reject_placeholder'),
      inputReason: '',
    });
  };

  const dbStatus = isError ? 'disconnected' : 'connected';

  // Announce queue changes to screen readers
  const [queueLength, setQueueLength] = useState(pendingQueue.length);
  useEffect(() => {
    if (queueLength !== pendingQueue.length) {
      setQueueLength(pendingQueue.length);
      const announcer = document.getElementById('queue-announcer');
      if (announcer) {
        announcer.textContent = t('announcer_vqueue_updated', { count: pendingQueue.length });
        setTimeout(() => { announcer.textContent = ''; }, 1000);
      }
    }
  }, [pendingQueue.length, queueLength, t]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div id="queue-announcer" className="sr-only" aria-live="polite" aria-atomic="true"></div>

      <DescriptionModal
        show={descriptionModal.show}
        providerName={descriptionModal.providerName}
        description={descriptionModal.description}
        onClose={() => setDescriptionModal({ show: false, description: '', providerName: '' })}
      />
      <RejectModal
        show={rejectModal.show}
        providerName={rejectModal.providerName}
        defaultReason={rejectModal.defaultReason}
        inputReason={rejectModal.inputReason}
        onReasonChange={(value) => setRejectModal((prev) => ({ ...prev, inputReason: value }))}
        onSubmit={handleRejectSubmit}
        onCancel={handleRejectCancel}
      />

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-admin-text tracking-tight">{t('dashboard_title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-admin-border bg-admin-card shadow-sm">
            <Database size={14} className={dbStatus === 'connected' ? 'text-green-500' : 'text-red-500'} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-admin-text-muted">
              {dbStatus === 'connected' ? t('dashboard_db_connected') : t('dashboard_db_disconnected')}
            </span>
          </div>
          <button
            onClick={refresh}
            className="p-3 bg-admin-card border border-admin-border rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={t('dashboard_refresh')}
            aria-busy={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title={t('sidebar_providers')} value={stats.providers} icon={Users} color="bg-blue-500" loading={isLoading} />
        <StatCard title={t('sidebar_customers')} value={stats.customers} icon={UserCheck} color="bg-emerald-500" loading={isLoading} />
        <StatCard title={t('sidebar_pending_queue')} value={pendingQueue.length} icon={Clock} color="bg-orange-500" loading={isLoading} />
        <StatCard title={t('sidebar_categories')} value={stats.categories} icon={Layers} color="bg-purple-500" loading={isLoading} />
        <StatCard title={t('sidebar_services')} value={stats.services} icon={Wrench} color="bg-indigo-500" loading={isLoading} />
        <StatCard title={t('dashboard_revenue')} value={stats.revenue?.toLocaleString() || '0'} icon={Banknote} color="bg-green-600" loading={isLoading} />
      </div>

      <VerificationQueueTable
        queue={pendingQueue}
        isLoading={isLoading}
        processingId={processingId}
        onVerify={handleVerification}
        onViewDescription={openDescriptionModal}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        resetFilters={resetFilters}
      />
    </div>
  );
};

export default Dashboard;