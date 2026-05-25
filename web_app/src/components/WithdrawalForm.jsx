import React, { useState } from 'react';
import { BanknoteIcon, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { paymentAPI } from '../api/payment';

const WithdrawalForm = ({ 
  providerData, 
  onWithdrawalSuccess, 
  onWithdrawalFailed 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_holder_name: ''
  });

  const ethiopianBanks = [
    'Commercial Bank of Ethiopia',
    'Awash Bank',
    'Dashen Bank',
    'Wegagen Bank',
    'Nib International Bank',
    'United Bank',
    'Abay Bank',
    'Buna Bank',
    'Cooperative Bank of Oromia',
    'Berhan Bank',
    'Hibret Bank',
    'Lemmi Bank',
    'Omo Microfinance',
    'Amhara Bank',
    'Goh Bet Bank',
    'Rimini Bank',
    'Siddis Bank',
    'Tsehay Bank',
    'Zemen Bank'
  ];

  const platformFeeRate = 0.05; // 5% platform fee
  const calculateFees = (amount) => {
    const platformFee = amount * platformFeeRate;
    const netAmount = amount - platformFee;
    return { platformFee, netAmount };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setWithdrawalData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const amount = parseFloat(withdrawalData.amount);
      
      if (amount < 50) {
        throw new Error('Minimum withdrawal amount is ETB 50');
      }

      if (amount > (providerData?.total_earned || 0)) {
        throw new Error(`Insufficient balance. Available: ETB ${providerData?.total_earned || 0}`);
      }

      const withdrawalRequest = {
        provider_id: providerData.providerID,
        amount: amount,
        bank_name: withdrawalData.bank_name,
        account_number: withdrawalData.account_number,
        account_holder_name: withdrawalData.account_holder_name
      };

      const response = await paymentAPI.createWithdrawal(withdrawalRequest);

      if (response.success) {
        setSuccess(true);
        onWithdrawalSuccess && onWithdrawalSuccess(response.data);
      } else {
        throw new Error(response.message || 'Withdrawal request failed');
      }

    } catch (err) {
      setError(err.message || 'Withdrawal request failed. Please try again.');
      onWithdrawalFailed && onWithdrawalFailed(err);
    } finally {
      setLoading(false);
    }
  };

  const { platformFee, netAmount } = calculateFees(parseFloat(withdrawalData.amount) || 0);

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 text-admin-text mb-2">Withdrawal Request Submitted!</h3>
        <p className="text-gray-600 text-admin-text-muted mb-4">
          Your withdrawal request has been submitted and is being processed.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center text-blue-700 dark:text-blue-400 mb-2">
            <Clock className="w-5 h-5 mr-2" />
            <span className="font-medium">Processing Time: 24-48 hours</span>
          </div>
          <p className="text-sm text-blue-600">
            You will receive a notification when your withdrawal is processed.
          </p>
        </div>
        <button
          onClick={() => {
            setSuccess(false);
            setWithdrawalData({
              amount: '',
              bank_name: '',
              account_number: '',
              account_holder_name: ''
            });
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Make Another Withdrawal
        </button>
      </div>
    );
  }

  return (
    <div className="bg-admin-card rounded-lg shadow-md p-6 max-w-md mx-auto border border-admin-border">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 text-admin-text mb-2">Request Withdrawal</h2>
        <div className="text-sm text-gray-600 text-admin-text-muted">
          Available Balance: <span className="font-semibold text-blue-600 dark:text-blue-400">
            ETB {providerData?.total_earned?.toLocaleString() || 0}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Withdrawal Amount (ETB)
          </label>
          <input
            type="number"
            name="amount"
            value={withdrawalData.amount}
            onChange={handleInputChange}
            min="50"
            max={providerData?.total_earned || 0}
            step="0.01"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-admin-card text-gray-900 dark:text-white"
            placeholder="Enter amount"
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum withdrawal: ETB 50
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Bank Name
          </label>
          <select
            name="bank_name"
            value={withdrawalData.bank_name}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-admin-card text-gray-900 dark:text-white"
          >
            <option value="">Select your bank</option>
            {ethiopianBanks.map(bank => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Account Number
          </label>
          <input
            type="text"
            name="account_number"
            value={withdrawalData.account_number}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-admin-card text-gray-900 dark:text-white"
            placeholder="Enter your account number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Account Holder Name
          </label>
          <input
            type="text"
            name="account_holder_name"
            value={withdrawalData.account_holder_name}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-admin-card text-gray-900 dark:text-white"
            placeholder="Name as it appears on the account"
          />
        </div>

        {withdrawalData.amount && parseFloat(withdrawalData.amount) > 0 && (
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-admin-border">
            <h4 className="font-medium text-gray-900 text-admin-text mb-2">Withdrawal Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 text-admin-text-muted">Requested Amount:</span>
                <span className="font-medium dark:text-white">ETB {parseFloat(withdrawalData.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 text-admin-text-muted">Platform Fee (5%):</span>
                <span className="font-medium text-red-600 dark:text-red-400">-ETB {platformFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-slate-700">
                <span className="text-gray-900 text-admin-text font-medium">Net Amount:</span>
                <span className="font-bold text-green-600 dark:text-green-400">ETB {netAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium
                   hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing...
            </>
          ) : (
            <>
              <BanknoteIcon className="w-5 h-5 mr-2" />
              Request Withdrawal
            </>
          )}
        </button>
      </form>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Withdrawals are processed within 24-48 hours</p>
        <p>Platform fee of 5% applies to all withdrawals</p>
      </div>
    </div>
  );
};

export default WithdrawalForm;
