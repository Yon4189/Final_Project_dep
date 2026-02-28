import React, { useState } from 'react';
import { CreditCard, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import { paymentAPI } from '../api/payment';

const PaymentForm = ({ 
  amount, 
  customerData, 
  bookingId = null, 
  onPaymentSuccess, 
  onPaymentFailed,
  onPaymentCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, failed

  const paymentMethods = [
    {
      id: 'telebirr',
      name: 'Telebirr',
      icon: <Smartphone className="w-5 h-5" />,
      description: 'Pay with Telebirr mobile money'
    },
    {
      id: 'cbe-birr',
      name: 'CBE Birr',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Pay with Commercial Bank of Ethiopia mobile'
    },
    {
      id: 'awash-birr',
      name: 'Awash Birr',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Pay with Awash Bank mobile'
    }
  ];

  const [selectedMethod, setSelectedMethod] = useState(paymentMethods[0].id);

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    setPaymentStatus('processing');

    try {
      const paymentData = {
        amount: amount,
        customer_id: customerData.customerID,
        customer_email: customerData.email,
        customer_first_name: customerData.firstName,
        customer_last_name: customerData.lastName,
        customer_phone: customerData.phoneNumber,
        payment_method: selectedMethod,
        booking_id: bookingId,
        callback_url: `${window.location.origin}/payment/callback`,
        return_url: `${window.location.origin}/payment/return`
      };

      const response = await paymentAPI.initializePayment(paymentData);

      if (response.success) {
        // Redirect to Chapa checkout
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error(response.message || 'Payment initialization failed');
      }

    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setPaymentStatus('failed');
      onPaymentFailed && onPaymentFailed(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPaymentStatus('idle');
    setError('');
    onPaymentCancel && onPaymentCancel();
  };

  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600 mb-4">Your payment has been processed successfully.</p>
        <button
          onClick={() => setPaymentStatus('idle')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Make Another Payment
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Payment</h2>
        <div className="text-3xl font-bold text-blue-600">
          ETB {amount?.toLocaleString()}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Payment Method
        </label>
        <div className="space-y-2">
          {paymentMethods.map((method) => (
            <label
              key={method.id}
              className={`
                flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                ${selectedMethod === method.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={selectedMethod === method.id}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="sr-only"
              />
              <div className="flex items-center flex-1">
                <div className="mr-3 text-blue-600">
                  {method.icon}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{method.name}</div>
                  <div className="text-sm text-gray-500">{method.description}</div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedMethod === method.id 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-gray-300'
              }`}>
                {selectedMethod === method.id && (
                  <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium">ETB {amount?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Method:</span>
            <span className="font-medium">
              {paymentMethods.find(m => m.id === selectedMethod)?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Customer:</span>
            <span className="font-medium">
              {customerData?.firstName} {customerData?.lastName}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handlePayment}
          disabled={loading || paymentStatus === 'processing'}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium
                   hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center"
        >
          {loading || paymentStatus === 'processing' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </button>
        
        {paymentStatus === 'processing' && (
          <button
            onClick={handleCancel}
            className="px-4 py-3 border border-gray-300 rounded-lg font-medium
                     hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Secure payment powered by Chapa</p>
        <p>Your payment information is encrypted and secure</p>
      </div>
    </div>
  );
};

export default PaymentForm;
