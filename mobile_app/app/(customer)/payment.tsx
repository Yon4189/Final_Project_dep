// app/(customer)/payment.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { usePaymentMethods, useInitializeChapaPayment, useVerifyChapaPayment } from '../../hooks/usePayment';
import { useCreateServiceRequest } from '../../hooks/useCustomerQueries';
import { paymentService } from '../../app/services/payment.service';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [paymentMethod, setPaymentMethod] = useState<string>('chapa');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

  // Parse amount from string to number
  const amount = parseFloat(params.amount as string || '0');

  // Calculate total with platform fee
  const platformFee = amount * 0.05;
  const totalAmount = amount + platformFee;

  const { data: paymentMethods, isLoading: loadingMethods } = usePaymentMethods();
  const initializeChapaPayment = useInitializeChapaPayment();
  const verifyChapaPayment = useVerifyChapaPayment();
  const createRequest = useCreateServiceRequest();

  useEffect(() => {
    // Handle deep link callback from Chapa
    const handleDeepLink = (event: { url: string }) => {
      if (event.url.includes('homelink://payment/callback')) {
        handlePaymentCallback(event.url);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Check if there's a callback URL in the initial URL
    const initialUrl = Linking.parseInitialURLAsync();
    initialUrl.then(url => {
      if (url && url.path?.includes('payment/callback')) {
        handlePaymentCallback(url.toString());
      }
    });
  }, []);

  const handlePaymentCallback = async (url: string) => {
    try {
      setIsPaying(true);
      const parsedUrl = new URL(url);
      const params = new URLSearchParams(parsedUrl.search);
      const txRef = params.get('tx_ref');
      const status = params.get('status');

      if (status === 'success' && txRef) {
        // Verify payment with backend
        const verification = await verifyChapaPayment.mutateAsync(txRef);
        
        if (verification.status === 'success') {
          setPaymentStatus('completed');
          await createServiceRequest(verification.transactionId);
        } else {
          setPaymentStatus('failed');
          Alert.alert('Payment Failed', 'Payment verification failed. Please try again.');
        }
      } else {
        setPaymentStatus('failed');
        Alert.alert('Payment Failed', 'Payment was not completed successfully.');
      }
    } catch (error) {
      console.error('Payment callback error:', error);
      setPaymentStatus('failed');
      Alert.alert('Error', 'An error occurred while processing your payment.');
    } finally {
      setIsPaying(false);
    }
  };

  const createServiceRequest = async (transactionId?: string) => {
    try {
      await createRequest.mutateAsync({
        providerId: params.providerId,
        serviceId: params.serviceId,
        scheduledDate: params.scheduledDate,
        scheduledTime: params.scheduledTime,
        address: params.address,
        description: params.description || '',
        specialInstructions: params.specialInstructions || '',
        paymentMethod: 'chapa',
        transactionId: transactionId,
      });

      Alert.alert(
        'Booking Confirmed!',
        'Your service has been booked and payment has been processed successfully.',
        [
          {
            text: 'View Bookings',
            onPress: () => router.push('/customer/bookings'),
          },
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to create service request:', error);
      Alert.alert('Error', 'Failed to create service request. Please contact support.');
    }
  };

  const handleChapaPayment = async () => {
    if (!paymentMethods) return;

    setIsPaying(true);
    setPaymentStatus('processing');

    try {
      const chapaMethod = paymentMethods.find(m => m.id === 'chapa');
      if (!chapaMethod) {
        throw new Error('Chapa payment method not available');
      }

      const paymentData = {
        amount: totalAmount,
        currency: 'ETB',
        email: 'customer@example.com', // This should come from user profile
        firstName: 'Customer', // This should come from user profile
        lastName: 'User', // This should come from user profile
        title: 'Service Booking Payment',
        description: `Payment for ${params.serviceId} service`,
        bookingId: `${params.providerId}_${Date.now()}`,
        metadata: {
          providerId: params.providerId,
          serviceId: params.serviceId,
          scheduledDate: params.scheduledDate,
          scheduledTime: params.scheduledTime,
        },
      };

      const paymentIntent = await initializeChapaPayment.mutateAsync(paymentData);

      if (paymentIntent.checkoutUrl) {
        // Open Chapa payment page
        const result = await WebBrowser.openBrowserAsync(paymentIntent.checkoutUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          controlsColor: Colors.primary,
        });

        if (result.type === 'cancel') {
          setPaymentStatus('pending');
          setIsPaying(false);
        }
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error) {
      console.error('Chapa payment error:', error);
      setPaymentStatus('failed');
      setIsPaying(false);
      Alert.alert('Payment Error', 'Failed to initiate payment. Please try again.');
    }
  };

  const handleCashPayment = async () => {
    try {
      setIsPaying(true);
      setPaymentStatus('completed');
      await createServiceRequest();
    } catch (error) {
      console.error('Cash payment error:', error);
      setPaymentStatus('failed');
      Alert.alert('Error', 'Failed to create service request.');
    } finally {
      setIsPaying(false);
    }
  };

  const renderPaymentMethods = () => {
    if (loadingMethods) {
      return <ActivityIndicator size="large" color={Colors.primary} />;
    }

    return (
      <View style={styles.paymentMethodsContainer}>
        {paymentMethods?.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethodCard,
              paymentMethod === method.id && styles.paymentMethodCardSelected,
            ]}
            onPress={() => setPaymentMethod(method.id)}
            disabled={isPaying}
          >
            <View style={styles.paymentMethodLeft}>
              <Ionicons name={method.icon as any} size={24} color={Colors.primary} />
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>{method.name}</Text>
                <Text style={styles.paymentMethodDescription}>{method.description}</Text>
              </View>
            </View>
            <View style={styles.radioButton}>
              {paymentMethod === method.id && <View style={styles.radioSelected} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPaymentSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Payment Summary</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Service Fee</Text>
        <Text style={styles.summaryValue}>ETB {amount.toFixed(2)}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Platform Fee (5%)</Text>
        <Text style={styles.summaryValue}>ETB {platformFee.toFixed(2)}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalValue}>ETB {totalAmount.toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderPaymentStatus = () => {
    if (paymentStatus === 'completed') {
      return (
        <View style={[styles.statusContainer, styles.statusSuccess]}>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          <Text style={[styles.statusText, styles.statusSuccessText]}>Payment Successful</Text>
        </View>
      );
    } else if (paymentStatus === 'failed') {
      return (
        <View style={[styles.statusContainer, styles.statusError]}>
          <Ionicons name="close-circle" size={24} color="#ef4444" />
          <Text style={[styles.statusText, styles.statusErrorText]}>Payment Failed</Text>
        </View>
      );
    } else if (paymentStatus === 'processing') {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.statusText}>Processing Payment...</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          {renderPaymentMethods()}
        </View>

        {/* Payment Summary */}
        <View style={styles.section}>
          {renderPaymentSummary()}
        </View>

        {/* Payment Status */}
        {renderPaymentStatus()}

        {/* Payment Actions */}
        <View style={styles.section}>
          {paymentStatus === 'pending' && (
            <>
              {paymentMethod === 'chapa' ? (
                <TouchableOpacity
                  style={[styles.payButton, isPaying && styles.payButtonDisabled]}
                  onPress={handleChapaPayment}
                  disabled={isPaying}
                >
                  {isPaying ? (
                    <ActivityIndicator size="small" color={Colors.surface} />
                  ) : (
                    <>
                      <Ionicons name="card" size={20} color={Colors.surface} />
                      <Text style={styles.payButtonText}>Pay with Chapa</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.payButton, isPaying && styles.payButtonDisabled]}
                  onPress={handleCashPayment}
                  disabled={isPaying}
                >
                  {isPaying ? (
                    <ActivityIndicator size="small" color={Colors.surface} />
                  ) : (
                    <>
                      <Ionicons name="cash" size={20} color={Colors.surface} />
                      <Text style={styles.payButtonText}>Pay Cash on Service</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.cancelButton, isPaying && styles.cancelButtonDisabled]}
                onPress={() => router.back()}
                disabled={isPaying}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {paymentStatus === 'completed' && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => router.push('/customer/bookings')}
            >
              <Text style={styles.doneButtonText}>View My Bookings</Text>
            </TouchableOpacity>
          )}

          {paymentStatus === 'failed' && (
            <>
              <TouchableOpacity
                style={[styles.retryButton, isPaying && styles.retryButtonDisabled]}
                onPress={() => setPaymentStatus('pending')}
                disabled={isPaying}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, isPaying && styles.cancelButtonDisabled]}
                onPress={() => router.back()}
                disabled={isPaying}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  paymentMethodsContainer: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodInfo: {
    marginLeft: 12,
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  summaryContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  totalRow: {
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 20,
    marginVertical: 12,
    gap: 8,
  },
  statusSuccess: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  statusError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusSuccessText: {
    color: '#166534',
  },
  statusErrorText: {
    color: '#991b1b',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: Colors.warning,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  retryButtonDisabled: {
    opacity: 0.5,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#78350f',
    fontWeight: '600',
  },
});