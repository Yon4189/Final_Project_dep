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
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { usePaymentMethods, useInitializeChapaPayment, useVerifyChapaPayment } from '../../hooks/usePayment';
import { useBookingDetails } from '../../hooks/useCustomerBookings';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { PriceText } from '../../components/common/PriceText';
import { ReviewModal } from '../../components/customer/ReviewModal';
import { useQueryClient } from '@tanstack/react-query';
export default function PaymentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  // 1. Hooks
  const bookingId = params.bookingId as string;
  const { data: booking, isLoading: bookingLoading, refetch: refetchBooking } = useBookingDetails(bookingId || '');
  const { data: paymentMethods, isLoading: loadingMethods } = usePaymentMethods();
  const initializeChapaPayment = useInitializeChapaPayment();
  const verifyChapaPayment = useVerifyChapaPayment();

  // Refetch booking data when screen is focused to get latest payment_status
  useFocusEffect(
    React.useCallback(() => {
      if (bookingId) {
        console.log('Payment screen focused - refetching booking data');
        refetchBooking();
      }
    }, [bookingId, refetchBooking])
  );

  // 2. State
  const [paymentMethod, setPaymentMethod] = useState<string>('chapa');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh handler
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetchBooking();
    setRefreshing(false);
  }, [refetchBooking]);

  // 3. Derived values & Calculations
  const checkoutUrl = (params.checkoutUrl || params.url) as string;
  const rawAmount = parseFloat(params.amount as string || '0');
  const amount = Number.isFinite(rawAmount) ? rawAmount : 0;

  const bookingStatus = (booking?.status ?? '').toLowerCase();
  const acceptedStatuses = ['accepted', 'in_progress', 'completed', 'service_confirmed', 'deposit_paid', 'arrived', 'waiting_customer_confirmation'];
  const hasAccepted = acceptedStatuses.includes(bookingStatus);
  const paymentStatusFromDB = (booking?.payment?.status ?? '').toLowerCase();
  const paymentAlreadyDone = ['paid', 'held', 'releasable', 'released'].includes(paymentStatusFromDB);

  // Get agreed price from booking (using database column name)
  const agreedPrice = Number(booking?.agreed_price ?? 0);
  
  console.log('=== PAYMENT SCREEN DEBUG ===');
  console.log('bookingId:', bookingId);
  console.log('booking?.agreed_price:', booking?.agreed_price);
  console.log('booking?.payment_status:', booking?.payment_status);
  console.log('agreedPrice (final):', agreedPrice);
  console.log('========================');
  
  // Determine payment type based on booking payment_status (database column name)
  const bookingPaymentStatus = (booking?.payment_status ?? '').toLowerCase();
  const isPaymentCompleted = bookingPaymentStatus === 'completed';
  const isDepositPayment = bookingPaymentStatus === 'pending_deposit' || bookingPaymentStatus === 'pending' || bookingPaymentStatus === '' || !bookingPaymentStatus;
  const isFinalPayment = bookingPaymentStatus === 'pending_final' || bookingPaymentStatus === 'deposit_paid';
  
  // Calculate deposit (20%) and final payment (80%)
  const depositPercentage = 0.20;
  const finalPercentage = 0.80;
  const depositAmount = Math.round(agreedPrice * depositPercentage * 100) / 100;
  const finalPaymentAmount = Math.round(agreedPrice * finalPercentage * 100) / 100;
  
  // Determine what customer is paying now
  const effectiveAmount = isFinalPayment ? finalPaymentAmount : depositAmount;
  
  // Platform fee is 10% of the current payment amount
  const platformFeePercentage = 0.10;
  const currentPlatformFee = Math.round(effectiveAmount * platformFeePercentage * 100) / 100;
  
  const totalAmount = effectiveAmount;
  const displayPaymentStatus = paymentAlreadyDone ? 'completed' : paymentStatus;
  const providerName = booking?.provider?.businessName || booking?.provider?.fullname || 'the provider';
  const serviceTitle = booking?.service?.title || 'your service';

  // Debug logging
  console.log('Payment Screen Debug:', {
    bookingStatus,
    bookingPaymentStatus,
    isPaymentCompleted,
    isDepositPayment,
    isFinalPayment,
    depositAmount,
    finalPaymentAmount,
    effectiveAmount,
    currentPlatformFee,
    totalAmount,
    paymentAlreadyDone,
    displayPaymentStatus,
    hasAccepted
  });

  // 4. Handlers (hoisted or defined before effects)
  async function handlePaymentCallback(url: string) {
    try {
      setIsPaying(true);
      console.log('Processing payment callback URL:', url);
      
      const parsed = Linking.parse(url);
      const queryParams = parsed.queryParams || {};
      
      let txRef = queryParams?.tx_ref as string || queryParams?.txRef as string || queryParams?.trx_ref as string;
      let status = queryParams?.status as string;

      if (!txRef) {
        const matchTxRef = url.match(/[?&]t(?:rx?_ref|xRef)=([^&]+)/i);
        if (matchTxRef) txRef = decodeURIComponent(matchTxRef[1]);
        
        const matchStatus = url.match(/[?&]status=([^&]+)/i);
        if (matchStatus) status = decodeURIComponent(matchStatus[1]);
      }

      if (!txRef) {
        const matchBooking = url.match(/BOOKING-[A-Za-z0-9-]+/i);
        if (matchBooking) txRef = matchBooking[0];
      }

      if (txRef) {
        setPaymentStatus('processing');
        const verification = await verifyChapaPayment.mutateAsync(txRef);

        if (verification.is_successful) {
          setPaymentStatus('completed');
          
          // Invalidate bookings cache so the list refreshes with updated payment_status
          queryClient.invalidateQueries({ queryKey: ['requests'] });
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          queryClient.invalidateQueries({ queryKey: ['myRequests'] });
          
          // Check if this was a final payment - if so, show review modal
          if (isFinalPayment) {
            setShowReviewModal(true);
          } else {
            // Deposit payment - just show success message
            Alert.alert(t('payment.statusSuccess', 'Payment Successful!'), t('payment.paymentProcessed', 'Your payment has been processed successfully.'), [
              { text: t('bookings.viewBookings', 'View Bookings'), onPress: () => router.push('/(customer)/bookings') },
              { text: t('common.ok', 'OK'), onPress: () => router.back() },
            ]);
          }
        } else if (status === 'cancel') {
          setPaymentStatus('pending');
          Alert.alert(t('payment.paymentCancelled', 'Payment Cancelled'), t('payment.cancelMsg', 'You cancelled the payment process.'));
        } else {
          setPaymentStatus('failed');
          Alert.alert(t('payment.statusFailed', 'Payment Failed'), verification.message || t('payment.verificationFailed', 'Payment verification failed.'));
        }
      } else {
        setPaymentStatus('failed');
        Alert.alert(t('common.error', 'Payment Error'), `${t('payment.noTxRef', 'No transaction reference found.')}\nURL: ${url}`);
      }
    } catch (error: any) {
      setPaymentStatus('failed');
      Alert.alert(t('common.error', 'Error'), error?.message || t('common.unknownError', 'Unknown error'));
    } finally {
      setIsPaying(false);
    }
  }

  async function openCheckoutUrl(url: string, txRef?: string) {
    setIsPaying(true);
    setPaymentStatus('processing');

    if (url.includes('mock-payment-url.com')) {
      setTimeout(() => {
        setIsPaying(false);
        setPaymentStatus('completed');
        Alert.alert('Development Mode', 'This is a mock payment for testing.', [
          { text: t('bookings.viewBookings', 'View Bookings'), onPress: () => router.push('/(customer)/bookings') },
          { text: t('common.ok', 'OK'), onPress: () => router.back() },
        ]);
      }, 1500);
      return;
    }

    try {
      const returnUrl = Linking.createURL('payment');
      const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);

      if (result.type === 'success' && result.url) {
        handlePaymentCallback(result.url);
        return;
      }

      if (txRef) {
        try {
          const verification = await verifyChapaPayment.mutateAsync(txRef);
          if (verification.is_successful) {
            setPaymentStatus('completed');
            
            // Check if this was a final payment - if so, show review modal
            if (isFinalPayment) {
              setShowReviewModal(true);
            } else {
              Alert.alert(t('payment.statusSuccess', 'Payment Successful!'), t('payment.processedSuccessfully', 'Processed successfully.'), [
                { text: t('bookings.viewBookings', 'View Bookings'), onPress: () => router.push('/(customer)/bookings') },
                { text: t('common.ok', 'OK'), onPress: () => router.back() },
              ]);
            }
            return;
          }
        } catch (vErr) {}
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        setPaymentStatus('pending');
      }
    } catch (error) {
      setPaymentStatus('failed');
      Alert.alert(t('common.error', 'Error'), t('payment.openError', 'Failed to open payment page.'));
    } finally {
      setIsPaying(false);
    }
  }

  // 5. Effects
  useEffect(() => {
    if (paymentAlreadyDone) {
      setPaymentStatus('completed');
      setIsPaying(false);
    }
  }, [paymentAlreadyDone]);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (
        event.url.includes('payment') && 
        (event.url.includes('tx_ref=') || event.url.includes('txRef=') || event.url.includes('trx_ref='))
      ) {
        handlePaymentCallback(event.url);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    Linking.parseInitialURLAsync().then(url => {
      if (url && url.path?.includes('payment')) {
        const query = url.queryParams || {};
        if (query.tx_ref || query.txRef || query.trx_ref) {
          handlePaymentCallback(url.toString());
        }
      }
    });
  }, []);

  useEffect(() => {
    const txRefParam = params.tx_ref || params.trx_ref || params.txRef;
    if (txRefParam && params.status === 'success' && paymentStatus !== 'completed') {
      const simulatedUrl = `mobileapp://payment?tx_ref=${txRefParam}&status=${params.status}`;
      handlePaymentCallback(simulatedUrl);
    }
  }, [params.tx_ref, params.status, paymentStatus]);

  useEffect(() => {
    if (checkoutUrl && paymentStatus === 'pending') {
      openCheckoutUrl(checkoutUrl);
    }
  }, [checkoutUrl]);

  if (bookingId && bookingLoading) {
    return <LoadingSpinner fullScreen />;
  }

  const handleChapaPayment = async () => {
    if (!hasAccepted) {
      Alert.alert(
        t('payment.awaitingConfirmation', 'Awaiting provider confirmation'),
        t('payment.awaitingAlertMsg', { provider: providerName, service: serviceTitle, defaultValue: `${providerName} still needs to accept your ${serviceTitle} request. You will be notified once the request is approved.` }),
        [
          { text: t('notifications.title', 'View Notifications'), onPress: () => router.push('/(customer)/notifications') },
          { text: t('common.ok', 'OK'), style: 'default' },
        ],
      );
      return;
    }

    if (paymentAlreadyDone) {
      Alert.alert(t('payment.alreadyPaid', 'Already paid'), t('payment.alreadyPaidMsg', 'This booking already shows a completed payment.'), [
        { text: t('bookings.viewBookings', 'View Bookings'), onPress: () => router.push('/(customer)/bookings') },
        { text: t('common.ok', 'OK'), style: 'default' },
      ]);
      return;
    }

    if (!paymentMethods || paymentMethods.length === 0) {
      if (!loadingMethods) Alert.alert(t('common.error', 'Error'), t('payment.methodsError', 'Payment methods could not be loaded.'));
      return;
    }

    setIsPaying(true);
    setPaymentStatus('processing');

    try {
      const chapaMethod = paymentMethods.find(m => m.id === 'chapa');
      if (!chapaMethod) throw new Error('Chapa payment method not available');

      const paymentData = {
        amount: totalAmount,
        currency: 'ETB',
        email: booking?.customer?.email || 'customer@example.com',
        firstName: (booking?.customer?.fullname || 'Customer').split(' ')[0],
        lastName: (booking?.customer?.fullname || 'User').split(' ').slice(1).join(' ') || 'User',
        title: 'Service Booking Payment',
        description: `Payment for booking #${bookingId}`,
        bookingId: bookingId,
        return_url: Linking.createURL('payment'),
        metadata: {
          providerId: params.providerId,
          serviceId: params.serviceId,
        },
      };

      const paymentIntent = await initializeChapaPayment.mutateAsync(paymentData);
      if (paymentIntent.checkout_url) {
        await openCheckoutUrl(paymentIntent.checkout_url, paymentIntent.tx_ref);
      } else {
        throw new Error('Server did not return a checkout URL');
      }
    } catch (error: any) {
      setPaymentStatus('failed');
      setIsPaying(false);
      Alert.alert(t('common.error', 'Payment Error'), error.response?.data?.message || error.message || t('payment.initiateError', 'Failed to initiate payment.'));
    }
  };


  const renderPaymentMethods = () => {
    if (loadingMethods) return <ActivityIndicator size="large" color={Colors.primary} />;
    return (
      <View style={styles.paymentMethodsContainer}>
        {paymentMethods?.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[styles.paymentMethodCard, paymentMethod === method.id && styles.paymentMethodCardSelected]}
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

  const renderPaymentSummary = () => {
    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        
        {/* Show payment type info */}
        {isDepositPayment && (
          <View style={styles.paymentTypeInfo}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
            <Text style={styles.paymentTypeText}>Deposit Payment (20% of total)</Text>
          </View>
        )}
        {isFinalPayment && (
          <View style={styles.paymentTypeInfo}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
            <Text style={styles.paymentTypeText}>Final Payment (80% of total)</Text>
          </View>
        )}
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {isFinalPayment ? 'Final Payment (80%)' : 'Deposit Amount (20%)'}
          </Text>
          <PriceText style={styles.summaryValue} amount={effectiveAmount} />
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service Fee (10%)</Text>
          <PriceText style={styles.summaryValue} amount={currentPlatformFee} />
        </View>
        
        <View style={styles.summaryDivider} />
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Pay Now {isFinalPayment ? '(80%)' : '(20%)'}</Text>
          <PriceText style={styles.totalValue} amount={totalAmount} />
        </View>
        
        {/* Show full service price for reference */}
        <View style={styles.summaryNote}>
          <Text style={styles.summaryNoteText}>
            Full service price: ETB {agreedPrice.toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  const renderPaymentStatus = () => {
    if (displayPaymentStatus === 'completed') {
      return (
        <View style={[styles.statusContainer, styles.statusSuccess]}>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          <Text style={[styles.statusText, styles.statusSuccessText]}>{t('payment.statusSuccess', 'Payment Successful')}</Text>
        </View>
      );
    } else if (displayPaymentStatus === 'failed') {
      return (
        <View style={[styles.statusContainer, styles.statusError]}>
          <Ionicons name="close-circle" size={24} color="#ef4444" />
          <Text style={[styles.statusText, styles.statusErrorText]}>{t('payment.statusFailed', 'Payment Failed')}</Text>
        </View>
      );
    } else if (displayPaymentStatus === 'processing') {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.statusText}>{t('payment.statusProcessing', 'Processing Payment...')}</Text>
        </View>
      );
    }
    return null;
  };

  const renderAwaitingAcceptance = () => (
    <View style={styles.awaitingCard}>
      <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
      <View style={styles.awaitingBody}>
        <Text style={styles.awaitingTitle}>{t('payment.awaitingConfirmation', 'Waiting for provider confirmation')}</Text>
        <Text style={styles.awaitingMessage}>
          {t('payment.awaitingMsg', { provider: providerName, service: serviceTitle, defaultValue: `${providerName} still needs to accept your ${serviceTitle} request. You will receive a notification as soon as the request is approved.` })}
        </Text>
        <View style={styles.awaitingActions}>
          <TouchableOpacity
            style={styles.awaitingActionButton}
            onPress={() => router.push('/(customer)/notifications')}
          >
            <Text style={styles.awaitingActionText}>{t('notifications.title', 'View Notifications')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.awaitingActionButtonSecondary}
            onPress={() => router.push('/(customer)/requests')}
          >
            <Text style={styles.awaitingActionTextSecondary}>{t('requests.title', 'View My Requests')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('payment.title', 'Payment')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Payment Methods - only show if no checkoutUrl */}
        {!checkoutUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('payment.selectMethod', 'Select Payment Method')}</Text>
            {renderPaymentMethods()}
          </View>
        )}

        {/* Payment Summary */}
        <View style={styles.section}>
          {renderPaymentSummary()}
        </View>

        {/* Payment Status */}
        {renderPaymentStatus()}

        {/* Payment Actions */}
        <View style={styles.section}>
          {!hasAccepted ? (
            renderAwaitingAcceptance()
          ) : isPaymentCompleted ? (
            // Payment is completed - show completion message and button to view bookings
            <View>
              <View style={[styles.statusContainer, styles.statusSuccess]}>
                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                <Text style={[styles.statusText, styles.statusSuccessText]}>
                  All payments completed! Thank you for your business.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => router.push('/(customer)/bookings')}
              >
                <Text style={styles.doneButtonText}>{t('bookings.viewMyBookings', 'View My Bookings')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {displayPaymentStatus === 'pending' && (
                <>
                  {checkoutUrl ? (
                    <TouchableOpacity
                      style={[styles.payButton, isPaying && styles.payButtonDisabled]}
                      onPress={() => openCheckoutUrl(checkoutUrl)}
                      disabled={isPaying}
                    >
                      {isPaying ? (
                        <ActivityIndicator size="small" color={Colors.surface} />
                      ) : (
                        <>
                          <Ionicons name="card" size={20} color={Colors.surface} />
                          <Text style={styles.payButtonText}>{t('payment.completePayment', 'Complete Payment')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <>
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
                            <Text style={styles.payButtonText}>
                              {isFinalPayment 
                                ? `Pay Final 80% (ETB ${finalPaymentAmount.toFixed(2)})`
                                : `Pay Deposit 20% (ETB ${depositAmount.toFixed(2)})`
                              }
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.cancelButton, isPaying && styles.cancelButtonDisabled]}
                    onPress={() => router.back()}
                    disabled={isPaying}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {displayPaymentStatus === 'completed' && (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => router.push('/(customer)/bookings')}
                >
                  <Text style={styles.doneButtonText}>{t('bookings.viewMyBookings', 'View My Bookings')}</Text>
                </TouchableOpacity>
              )}

              {displayPaymentStatus === 'failed' && (
                <>
                  <TouchableOpacity
                    style={[styles.retryButton, isPaying && styles.retryButtonDisabled]}
                    onPress={() => setPaymentStatus('pending')}
                    disabled={isPaying}
                  >
                    <Text style={styles.retryButtonText}>{t('payment.tryAgain', 'Try Again')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelButton, isPaying && styles.cancelButtonDisabled]}
                    onPress={() => router.back()}
                    disabled={isPaying}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
      
      {/* Review Modal - shown after final payment */}
      <ReviewModal
        visible={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          router.push('/(customer)/bookings');
        }}
        bookingId={bookingId}
        providerName={providerName}
        serviceName={serviceTitle}
        onSuccess={() => {
          setShowReviewModal(false);
          router.push('/(customer)/bookings');
        }}
      />
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
    paddingTop: 100,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
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
  paymentTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.info + '10',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  paymentTypeText: {
    fontSize: 13,
    color: Colors.info,
    fontWeight: '500',
  },
  summaryNote: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryNoteText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
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
  awaitingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  awaitingBody: {
    flex: 1,
  },
  awaitingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  awaitingMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  awaitingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  awaitingActionButton: {
    backgroundColor: Colors.primary + '15',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  awaitingActionText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  awaitingActionButtonSecondary: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  awaitingActionTextSecondary: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
