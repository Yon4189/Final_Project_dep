import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { paymentAPI } from '../api/payment';

const Payment = () => {
  const { txRef } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (txRef) {
      fetchPaymentDetails();
    }
  }, [txRef]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getPaymentDetails(txRef);
      
      if (response.success) {
        setPayment(response.data);
      } else {
        setError(response.message || 'Payment not found');
      }
    } catch (err) {
      setError('Failed to fetch payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    try {
      const response = await paymentAPI.verifyPayment(txRef);
      
      if (response.success) {
        setPayment(response.data);
      } else {
        setError(response.message || 'Payment verification failed');
      }
    } catch (err) {
      setError('Failed to verify payment');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'failed':
        return <XCircle className="w-8 h-8 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-8 h-8 text-gray-500" />;
      default:
        return <AlertCircle className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Payment Details</h1>
                <p className="text-blue-100">Transaction Reference: {txRef}</p>
              </div>
              <CreditCard className="w-10 h-10 text-blue-200" />
            </div>
          </div>

          {/* Payment Status */}
          <div className="p-6">
            <div className={`flex items-center p-4 rounded-lg border ${getStatusColor(payment.status)}`}>
              {getStatusIcon(payment.status)}
              <div className="ml-3">
                <h3 className="font-semibold capitalize">{payment.status}</h3>
                <p className="text-sm opacity-75">
                  {payment.status === 'success' && 'Payment completed successfully'}
                  {payment.status === 'failed' && 'Payment failed'}
                  {payment.status === 'cancelled' && 'Payment was cancelled'}
                  {payment.status === 'pending' && 'Payment is being processed'}
                </p>
              </div>
            </div>

            {/* Payment Information */}
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Amount</p>
                  <p className="text-xl font-bold text-gray-900">
                    ETB {payment.amount?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="text-xl font-bold text-gray-900 capitalize">
                    {payment.payment_method || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-medium">
                      {payment.customer_first_name} {payment.customer_last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium">{payment.customer_email}</p>
                  </div>
                  {payment.customer_phone && (
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p className="font-medium">{payment.customer_phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Information */}
              {payment.booking && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Booking Information</h4>
                  <div className="text-sm">
                    <p className="text-gray-600">Booking ID</p>
                    <p className="font-medium">#{payment.booking.bookingID}</p>
                  </div>
                </div>
              )}

              {/* Failure Reason */}
              {payment.failure_reason && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">Failure Reason</h4>
                  <p className="text-red-700 text-sm">{payment.failure_reason}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Timestamps</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-medium">
                      {new Date(payment.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Last Updated</p>
                    <p className="font-medium">
                      {new Date(payment.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              {payment.status === 'pending' && (
                <button
                  onClick={handleVerifyPayment}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Verify Payment
                </button>
              )}
              
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
