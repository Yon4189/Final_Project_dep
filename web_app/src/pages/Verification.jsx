import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
    if (!window.confirm(`Approve ${name} and notify them via email?`)) return;
    setProcessingId(id);
    try {
      const response = await api.post(`/admin/providers/${id}/verify`, { status: 'approved' });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['providers'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        alert('Account Approved & Email Sent!');
      }
    } catch (err) {
      alert('Mail Error: Check backend SMTP settings.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReactivate = async (id, name) => {
    if (!window.confirm(`Reactivate ${name}? They will become active again.`)) return;
    setProcessingId(id);
    try {
      const response = await api.post(`/admin/providers/${id}/verify`, { status: 'approved' });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['providers'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        alert('Provider Reactivated.');
      }
    } catch (err) {
      alert('Action failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (id, name) => {
    if (!window.confirm(`Suspend ${name}? They will be hidden from the marketplace.`)) return;
    setProcessingId(id);
    try {
      const response = await api.post(`/admin/providers/${id}/verify`, {
        status: 'suspended',
        verification_reason: 'Account suspended by administration.',
      });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['providers'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        alert('Provider Suspended.');
      }
    } catch (err) {
      alert('Action failed.');
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
        alert('Provider Rejected & Notified.');
      }
    } catch (err) {
      alert('Network Error');
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
        defaultReason="Please provide a reason for rejection."
        inputReason={rejectModal.reason}
        onReasonChange={(value) => setRejectModal(prev => ({ ...prev, reason: value }))}
        onSubmit={handleRejectSubmit}
        onCancel={() => setRejectModal({ show: false, provider: null, reason: '' })}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {filter} Providers
            </h1>
            {providers.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
                {providers.length}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mt-1">
            Verification Management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Database size={14} className={dbStatus === 'connected' ? 'text-green-500' : 'text-red-500'} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {dbStatus === 'connected' ? 'Database Connected' :
                dbStatus === 'disconnected' ? 'Database Disconnected' :
                  'Checking Database...'}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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