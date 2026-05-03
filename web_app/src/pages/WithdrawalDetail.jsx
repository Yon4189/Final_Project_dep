import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Wallet, User, DollarSign, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { getWithdrawalDetails, approveWithdrawal, rejectWithdrawal } from '../api/withdrawal';

const WithdrawalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
      setError('Failed to load withdrawal details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await approveWithdrawal(id);
      alert('Withdrawal approved successfully!');
      navigate('/admin/withdrawals');
    } catch (err) {
      alert('Failed to approve withdrawal: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
      setShowApprovalDialog(false);
    }
  };

  const handleReject = async (reason) => {
    setProcessing(true);
    try {
      await rejectWithdrawal(id, reason);
      alert('Withdrawal rejected successfully!');
      navigate('/admin/withdrawals');
    } catch (err) {
      alert('Failed to reject withdrawal: ' + (err.response?.data?.message || err.message));
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
          <p className="text-admin-text-muted">Loading withdrawal details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <AlertCircle size={24} className="text-red-500 mb-2" />
        <p className="text-red-700">{error || 'Withdrawal not found'}</p>
        <button onClick={() => navigate('/admin/withdrawals')} className="mt-4 text-blue-500 hover:underline">
          Back to Withdrawals
        </button>
      </div>
    );
  }

  const { withdrawal, provider_identity, financial_info, business_metrics, withdrawal_history, recent_activity, risk_analysis, compliance_checks } = data;
  const isPending = withdrawal.status === 'pending';

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
    };
    const c = config[status] || config.pending;
    return <span className={`px-4 py-2 rounded-full text-sm font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const getRiskBadge = (level) => {
    const config = {
      low: { bg: 'bg-green-100', text: 'text-green-800' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800' },
      critical: { bg: 'bg-red-100', text: 'text-red-800' },
    };
    const c = config[level] || config.low;
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text} uppercase`}>{level}</span>;
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
            <h1 className="text-2xl font-black text-admin-text">Withdrawal Details</h1>
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
              Approve
            </button>
            <button
              onClick={() => setShowRejectionDialog(true)}
              className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <XCircle size={18} />
              Reject
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Provider Identity */}
          <Section title="Provider Identity" icon={<User size={20} />}>
            <InfoRow label="Full Name" value={provider_identity.fullname} />
            <InfoRow label="Provider ID" value={provider_identity.providerID} />
            <InfoRow label="Phone" value={provider_identity.phone} />
            <InfoRow label="Email" value={provider_identity.email} />
            <InfoRow label="Account Created" value={new Date(provider_identity.created_at).toLocaleDateString()} />
            <InfoRow label="Status" value={provider_identity.account_status} />
          </Section>

          {/* Financial Information */}
          <Section title="Financial Information" icon={<DollarSign size={20} />}>
            <InfoRow label="Available Balance" value={`${financial_info.available_balance} ETB`} highlight />
            <InfoRow label="Pending Balance" value={`${financial_info.pending_balance} ETB`} />
            <InfoRow label="Requested Amount" value={`${financial_info.requested_amount} ETB`} highlight />
            <InfoRow label="Total Earnings" value={`${financial_info.total_earnings} ETB`} />
            <InfoRow label="Previous Withdrawals" value={financial_info.previous_withdrawals_count} />
            <InfoRow label="Total Withdrawn" value={`${financial_info.total_withdrawn} ETB`} />
          </Section>

          {/* Bank Details */}
          <Section title="Payment Details" icon={<Wallet size={20} />}>
            <InfoRow label="Payment Method" value={withdrawal.payment_method} />
            {withdrawal.payment_method === 'bank' && (
              <>
                <InfoRow label="Bank Name" value={withdrawal.provider_bank_name} />
                <InfoRow label="Account Number" value={withdrawal.provider_account_number} />
                <InfoRow label="Account Holder" value={withdrawal.provider_account_holder_name} />
              </>
            )}
            {withdrawal.payment_method === 'telebir' && (
              <>
                <InfoRow label="TeleBirr Number" value={withdrawal.telebir_number} />
                <InfoRow label="Holder Name" value={withdrawal.telebir_holder_name} />
              </>
            )}
          </Section>

          {/* Business Metrics */}
          <Section title="Business Metrics" icon={<TrendingUp size={20} />}>
            <InfoRow label="Completed Bookings" value={business_metrics.completed_bookings} />
            <InfoRow label="Average Rating" value={`${business_metrics.average_rating.toFixed(1)} / 5.0`} />
            <InfoRow label="Total Reviews" value={business_metrics.total_reviews} />
            <InfoRow label="Service Category" value={business_metrics.service_category} />
          </Section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Risk Analysis */}
          <Section title="Risk Analysis" icon={<AlertTriangle size={20} />}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-admin-text-muted">Risk Level</span>
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
              <p className="text-sm text-green-600 dark:text-green-400">No risk warnings</p>
            )}
          </Section>

          {/* Compliance Checks */}
          <Section title="Compliance Checks" icon={<CheckCircle size={20} />}>
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
              <p className="text-sm text-green-600">All compliance checks passed</p>
            )}
          </Section>

          {/* Recent Activity */}
          <Section title="Recent Activity (30 days)" icon={<Clock size={20} />}>
            <InfoRow label="Bookings" value={recent_activity.bookings_last_30_days} />
            <InfoRow label="Earnings" value={`${recent_activity.earnings_last_30_days} ETB`} />
            <InfoRow label="Avg Booking Value" value={`${recent_activity.average_booking_value.toFixed(2)} ETB`} />
            <InfoRow label="Recent Reviews" value={recent_activity.recent_reviews_count} />
          </Section>
        </div>
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <Dialog
          title="Approve Withdrawal"
          onClose={() => setShowApprovalDialog(false)}
          onConfirm={handleApprove}
          confirmText="Confirm Approval"
          confirmColor="green"
          processing={processing}
        >
          <div className="space-y-4">
            <p className="text-admin-text">Are you sure you want to approve this withdrawal?</p>
            <div className="bg-admin-bg p-4 rounded-xl space-y-2">
              <InfoRow label="Provider" value={provider_identity.fullname} />
              <InfoRow label="Amount" value={`${withdrawal.amount} ${withdrawal.currency}`} />
              <InfoRow label="Payment Method" value={withdrawal.payment_method} />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-xs text-yellow-800">⚠️ This action cannot be undone. Funds will be transferred to the provider.</p>
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

const Dialog = ({ title, children, onClose, onConfirm, confirmText, confirmColor, processing }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
      <h3 className="text-xl font-bold text-admin-text mb-4">{title}</h3>
      {children}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          disabled={processing}
          className="flex-1 px-4 py-2 bg-admin-bg text-admin-text rounded-xl font-semibold hover:bg-admin-border transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={processing}
          className={`flex-1 px-4 py-2 bg-${confirmColor}-500 text-white rounded-xl font-semibold hover:bg-${confirmColor}-600 transition-colors disabled:opacity-50`}
        >
          {processing ? 'Processing...' : confirmText}
        </button>
      </div>
    </div>
  </div>
);

const RejectionDialog = ({ onClose, onConfirm, processing, withdrawal, provider }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');

  const suggestedReasons = [
    'Insufficient verification documents',
    'Account holder name mismatch',
    'Suspicious activity detected',
    'Active disputes pending resolution',
    'Compliance violation',
    'Other'
  ];

  const handleConfirm = () => {
    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason || finalReason.length < 5) {
      setError('Please provide a reason (minimum 5 characters)');
      return;
    }
    setError('');
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-admin-text mb-4">Reject Withdrawal</h3>
        <div className="space-y-4">
          <div className="bg-admin-bg p-4 rounded-xl space-y-2">
            <InfoRow label="Provider" value={provider.fullname} />
            <InfoRow label="Amount" value={`${withdrawal.amount} ${withdrawal.currency}`} />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-admin-text mb-2">Rejection Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 bg-admin-bg border border-admin-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason...</option>
              {suggestedReasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {reason === 'Other' && (
            <div>
              <label className="block text-sm font-semibold text-admin-text mb-2">Custom Reason</label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter custom reason (minimum 5 characters)"
                className="w-full px-4 py-2 bg-admin-bg border border-admin-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
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
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalDetail;
