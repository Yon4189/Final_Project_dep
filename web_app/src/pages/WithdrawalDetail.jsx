import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Wallet, User, DollarSign, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { getWithdrawalDetails, approveWithdrawal, rejectWithdrawal } from '../api/withdrawal';

const WithdrawalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getWithdrawalDetails(id);
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch withdrawal details:', err);
      setError(t('withdrawals_not_found'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await approveWithdrawal(id);
      alert(t('withdrawals_success_approved'));
      navigate('/admin/withdrawals');
    } catch (err) {
      alert(t('alert_action_failed') + ': ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
      setShowApprovalDialog(false);
    }
  };

  const handleReject = async (reason) => {
    setProcessing(true);
    try {
      await rejectWithdrawal(id, reason);
      alert(t('withdrawals_success_rejected'));
      navigate('/admin/withdrawals');
    } catch (err) {
      alert(t('alert_action_failed') + ': ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
      setShowRejectionDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-admin-text-muted">{t('withdrawals_fetching_details')}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <AlertCircle size={24} className="text-red-500 mb-2" />
        <p className="text-red-700">{error || t('withdrawals_not_found')}</p>
        <button onClick={() => navigate('/admin/withdrawals')} className="mt-4 text-blue-500 hover:underline">
          {t('withdrawals_back')}
        </button>
      </div>
    );
  }

  const { withdrawal, provider_identity, financial_info, business_metrics, risk_analysis, compliance_checks, recent_activity } = data;
  const isPending = withdrawal.status === 'pending';

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('status_pending') },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: t('status_approved') },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: t('status_rejected') },
    };
    const c = config[status] || config.pending;
    return <span className={`px-4 py-2 rounded-full text-sm font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const getRiskBadge = (level) => {
    const config = {
      low: { bg: 'bg-green-100', text: 'text-green-800', label: t('priority_low') },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('priority_medium') },
      high: { bg: 'bg-orange-100', text: 'text-orange-800', label: t('priority_high') },
      critical: { bg: 'bg-red-100', text: 'text-red-800', label: t('priority_urgent') },
    };
    const c = config[level] || config.low;
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text} uppercase`}>{c.label}</span>;
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/withdrawals')} className="p-2 hover:bg-admin-bg rounded-xl transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-admin-text">{t('withdrawals_details_title')}</h1>
            <p className="text-sm text-admin-text-muted font-mono">{withdrawal.withdrawal_ref}</p>
          </div>
          {getStatusBadge(withdrawal.status)}
        </div>
        {isPending && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowApprovalDialog(true)}
              className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <CheckCircle size={18} />
              {t('withdrawals_approve')}
            </button>
            <button
              onClick={() => setShowRejectionDialog(true)}
              className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <XCircle size={18} />
              {t('withdrawals_reject')}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Provider Identity */}
          <Section title={t('withdrawals_provider_identity')} icon={<User size={20} />}>
            <InfoRow label={t('vqueue_name')} value={provider_identity.fullname} />
            <InfoRow label={t('vqueue_id')} value={provider_identity.providerID} />
            <InfoRow label={t('profile_phone')} value={provider_identity.phone} />
            <InfoRow label={t('profile_email')} value={provider_identity.email} />
            <InfoRow label={t('user_mgmt_joined')} value={new Date(provider_identity.created_at).toLocaleDateString()} />
            <InfoRow label={t('vqueue_status')} value={t(`status_${provider_identity.account_status}`) || provider_identity.account_status} />
          </Section>

          {/* Financial Information */}
          <Section title={t('withdrawals_financial_info')} icon={<DollarSign size={20} />}>
            <InfoRow label={t('withdrawals_available_balance')} value={`${financial_info.available_balance} ETB`} highlight />
            <InfoRow label={t('withdrawals_pending_balance')} value={`${financial_info.pending_balance} ETB`} />
            <InfoRow label={t('withdrawals_requested_amount')} value={`${financial_info.requested_amount} ETB`} highlight />
            <InfoRow label={t('withdrawals_total_earnings')} value={`${financial_info.total_earnings} ETB`} />
            <InfoRow label={t('withdrawals_prev_withdrawals')} value={financial_info.previous_withdrawals_count} />
            <InfoRow label={t('withdrawals_total_withdrawn')} value={`${financial_info.total_withdrawn} ETB`} />
          </Section>

          {/* Payment Details */}
          <Section title={t('withdrawals_payment_details')} icon={<Wallet size={20} />}>
            <InfoRow label={t('withdrawals_col_method')} value={t(`pay_method_${withdrawal.payment_method}`) || withdrawal.payment_method} />
            {withdrawal.payment_method === 'bank' && (
              <>
                <InfoRow label={t('withdrawals_bank_name')} value={withdrawal.provider_bank_name} />
                <InfoRow label={t('withdrawals_account_number')} value={withdrawal.provider_account_number} />
                <InfoRow label={t('withdrawals_account_holder')} value={withdrawal.provider_account_holder_name} />
              </>
            )}
            {withdrawal.payment_method === 'telebir' && (
              <>
                <InfoRow label={t('withdrawals_telebirr_number')} value={withdrawal.telebir_number} />
                <InfoRow label={t('withdrawals_holder_name')} value={withdrawal.telebir_holder_name} />
              </>
            )}
          </Section>

          {/* Business Metrics */}
          <Section title={t('withdrawals_business_metrics')} icon={<TrendingUp size={20} />}>
            <InfoRow label={t('withdrawals_completed_bookings')} value={business_metrics.completed_bookings} />
            <InfoRow label={t('withdrawals_avg_rating')} value={`${business_metrics.average_rating.toFixed(1)} / 5.0`} />
            <InfoRow label={t('withdrawals_total_reviews')} value={business_metrics.total_reviews} />
            <InfoRow label={t('withdrawals_service_category')} value={business_metrics.service_category} />
          </Section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Risk Analysis */}
          <Section title={t('withdrawals_risk_analysis')} icon={<AlertTriangle size={20} />}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-admin-text-muted">{t('withdrawals_risk_level')}</span>
                {getRiskBadge(risk_analysis.risk_level)}
              </div>
            </div>
            {risk_analysis.warnings.length > 0 ? (
              <div className="space-y-2">
                {risk_analysis.warnings.map((warning, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    warning.severity === 'high' 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                      : warning.severity === 'medium' 
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}>
                    <p className={`text-xs font-semibold ${
                      warning.severity === 'high' 
                        ? 'text-red-800 dark:text-red-200' 
                        : warning.severity === 'medium' 
                        ? 'text-yellow-800 dark:text-yellow-200' 
                        : 'text-blue-800 dark:text-blue-200'
                    }`}>
                      {warning.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400">{t('withdrawals_no_risks')}</p>
            )}
          </Section>

          {/* Compliance Checks */}
          <Section title={t('withdrawals_compliance_checks')} icon={<CheckCircle size={20} />}>
            {compliance_checks.violations.length > 0 ? (
              <div className="space-y-2">
                {compliance_checks.violations.map((violation, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    violation.severity === 'critical' ? 'bg-red-50 border-red-200' :
                    violation.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <p className="text-xs font-semibold text-admin-text">{violation.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600">{t('withdrawals_compliance_passed')}</p>
            )}
          </Section>

          {/* Recent Activity */}
          <Section title={t('withdrawals_recent_activity')} icon={<Clock size={20} />}>
            <InfoRow label={t('sidebar_bookings')} value={recent_activity.bookings_last_30_days} />
            <InfoRow label={t('dashboard_revenue')} value={`${recent_activity.earnings_last_30_days} ETB`} />
            <InfoRow label={t('withdrawals_avg_booking_val')} value={`${recent_activity.average_booking_value.toFixed(2)} ETB`} />
            <InfoRow label={t('withdrawals_recent_reviews')} value={recent_activity.recent_reviews_count} />
          </Section>
        </div>
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <Dialog
          title={t('withdrawals_approve')}
          onClose={() => setShowApprovalDialog(false)}
          onConfirm={handleApprove}
          confirmText={t('withdrawals_confirm_approval')}
          confirmColor="green"
          processing={processing}
          t={t}
        >
          <div className="space-y-4">
            <p className="text-admin-text">{t('withdrawals_approve_confirm')}</p>
            <div className="bg-admin-bg p-4 rounded-xl space-y-2">
              <InfoRow label={t('vqueue_provider')} value={provider_identity.fullname} />
              <InfoRow label={t('withdrawals_col_amount')} value={`${withdrawal.amount} ${withdrawal.currency}`} />
              <InfoRow label={t('withdrawals_col_method')} value={withdrawal.payment_method} />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-xs text-yellow-800">⚠️ {t('withdrawals_undo_warning')}</p>
            </div>
          </div>
        </Dialog>
      )}

      {/* Rejection Dialog */}
      {showRejectionDialog && (
        <RejectionDialog
          onClose={() => setShowRejectionDialog(false)}
          onConfirm={handleReject}
          processing={processing}
          withdrawal={withdrawal}
          provider={provider_identity}
          t={t}
        />
      )}
    </div>
  );
};

// Helper Components
const Section = ({ title, icon, children }) => (
  <div className="bg-admin-card border border-admin-border rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <div className="text-blue-500">{icon}</div>
      <h2 className="text-lg font-bold text-admin-text">{title}</h2>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const InfoRow = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-admin-text-muted">{label}</span>
    <span className={`text-sm font-semibold ${highlight ? 'text-blue-600' : 'text-admin-text'}`}>{value}</span>
  </div>
);

const Dialog = ({ title, children, onClose, onConfirm, confirmText, confirmColor, processing, t }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-admin-card rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-admin-border">
      <h3 className="text-xl font-bold text-admin-text mb-4">{title}</h3>
      {children}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          disabled={processing}
          className="flex-1 px-4 py-2 bg-admin-bg text-admin-text rounded-xl font-semibold hover:bg-admin-border transition-colors disabled:opacity-50"
        >
          {t('modal_cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={processing}
          className={`flex-1 px-4 py-2 bg-${confirmColor}-500 text-white rounded-xl font-semibold hover:bg-${confirmColor}-600 transition-colors disabled:opacity-50 shadow-lg shadow-${confirmColor}-500/30`}
        >
          {processing ? t('processing') : confirmText}
        </button>
      </div>
    </div>
  </div>
);

const RejectionDialog = ({ onClose, onConfirm, processing, withdrawal, provider, t }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');

  const suggestedReasons = [
    { key: 'withdrawals_reason_insufficient', value: 'Insufficient verification documents' },
    { key: 'withdrawals_reason_mismatch', value: 'Account holder name mismatch' },
    { key: 'withdrawals_reason_suspicious', value: 'Suspicious activity detected' },
    { key: 'withdrawals_reason_disputes', value: 'Active disputes pending resolution' },
    { key: 'withdrawals_reason_compliance', value: 'Compliance violation' },
    { key: 'withdrawals_reason_other', value: 'Other' }
  ];

  const handleConfirm = () => {
    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason || finalReason.length < 5) {
      setError(t('withdrawals_reason_error'));
      return;
    }
    setError('');
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-admin-card rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-admin-border">
        <h3 className="text-xl font-bold text-admin-text mb-4">{t('withdrawals_reject')}</h3>
        <div className="space-y-4">
          <div className="bg-admin-bg p-4 rounded-xl space-y-2">
            <InfoRow label={t('vqueue_provider')} value={provider.fullname} />
            <InfoRow label={t('withdrawals_col_amount')} value={`${withdrawal.amount} ${withdrawal.currency}`} />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-admin-text mb-2">{t('withdrawals_reject_reason')}</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 bg-admin-bg border border-admin-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-admin-text"
            >
              <option value="">{t('withdrawals_select_reason')}</option>
              {suggestedReasons.map((r) => (
                <option key={r.key} value={r.value}>{t(r.key)}</option>
              ))}
            </select>
          </div>

          {reason === 'Other' && (
            <div>
              <label className="block text-sm font-semibold text-admin-text mb-2">{t('withdrawals_custom_reason')}</label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t('withdrawals_reason_placeholder')}
                className="w-full px-4 py-2 bg-admin-bg border border-admin-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none text-admin-text"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-4 py-2 bg-admin-bg text-admin-text rounded-xl font-semibold hover:bg-admin-border transition-colors disabled:opacity-50"
          >
            {t('modal_cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 shadow-lg shadow-red-500/30"
          >
            {processing ? t('processing') : t('withdrawals_confirm_rejection')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalDetail;
