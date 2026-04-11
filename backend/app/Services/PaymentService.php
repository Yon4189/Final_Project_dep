<?php

namespace App\Services;

use App\Models\SystemSetting;
use App\Models\Payment;
use App\Models\Booking;
// Services in the same namespace do not need to be explicitly imported
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    protected $chapaService;
    protected $payoutProcessor;

    public function __construct(ChapaService $chapaService, PayoutProcessor $payoutProcessor)
    {
        $this->chapaService = $chapaService;
        $this->payoutProcessor = $payoutProcessor;
    }

    /**
     * Calculate deposit amount based on agreed price
     * 
     * @param float $agreedPrice
     * @return array
     */
    public function calculateDepositAmount(float $agreedPrice): array
    {
        // Get deposit percentage from system settings (default 20%)
        $depositPercentage = SystemSetting::get('deposit_percentage', 20);
        
        // Calculate deposit amount
        $depositAmount = round($agreedPrice * $depositPercentage / 100, 2);
        
        // Calculate remaining amount
        $remainingAmount = round($agreedPrice - $depositAmount, 2);
        
        return [
            'deposit_amount' => $depositAmount,
            'remaining_amount' => $remainingAmount,
            'deposit_percentage' => $depositPercentage,
            'agreed_price' => $agreedPrice
        ];
    }

    /**
     * Validate payment amount matches expected amount
     * 
     * @param int $bookingId
     * @param float $amount
     * @param string $paymentType
     * @return bool
     * @throws ValidationException
     */
    public function validatePaymentAmount(int $bookingId, float $amount, string $paymentType): bool
    {
        $booking = Booking::findOrFail($bookingId);
        
        if ($paymentType === 'deposit') {
            $calculation = $this->calculateDepositAmount((float) ($booking->agreed_price ?? 0));
            $expectedAmount = $calculation['deposit_amount'];
        } else {
            // For final payment, calculate remaining amount
            $depositPayment = $booking->depositPayment;
            if (!$depositPayment) {
                throw ValidationException::withMessages([
                    'payment' => ['Deposit payment not found for this booking']
                ]);
            }
            $expectedAmount = round((float) ($booking->agreed_price ?? 0) - (float) ($depositPayment->amount ?? 0), 2);
        }
        
        // Allow 0.01 tolerance for rounding differences
        $difference = abs($amount - $expectedAmount);
        if ($difference > 0.01) {
            throw ValidationException::withMessages([
                'amount' => ["Payment amount ({$amount}) does not match expected amount ({$expectedAmount})"]
            ]);
        }
        
        return true;
    }

    /**
     * Process deposit payment
     * 
     * @param int $bookingId
     * @param float $amount
     * @return Payment
     */
    public function processDepositPayment(int $bookingId, float $amount): Payment
    {
        // Validate amount
        $this->validatePaymentAmount($bookingId, $amount, 'deposit');
        
        $booking = Booking::with('customer', 'provider')->findOrFail($bookingId);
        
        // Generate unique transaction reference
        $txRef = 'DEP-' . $bookingId . '-' . time();
        
        // Create payment record
        $payment = Payment::create([
            'bookingID' => $bookingId,
            'customerID' => $booking->customerID,
            'providerID' => $booking->providerID,
            'tx_ref' => $txRef,
            'amount' => $amount,
            'payment_type' => 'deposit',
            'payment_status' => 'pending',
            'status' => 'pending',
            'currency' => 'ETB',
            'customer_email' => $booking->customer->email,
            'customer_first_name' => $booking->customer->firstName,
            'customer_last_name' => $booking->customer->lastName,
            'customer_phone' => $booking->customer->phoneNumber,
            'callback_url' => config('app.url') . '/api/payments/verify-callback',
            'return_url' => config('app.frontend_url') . '/bookings/' . $bookingId
        ]);
        
        // Initialize Chapa payment
        $chapaData = [
            'amount' => $amount,
            'currency' => 'ETB',
            'email' => $booking->customer->email,
            'first_name' => $booking->customer->firstName,
            'last_name' => $booking->customer->lastName,
            'phone_number' => $booking->customer->phoneNumber,
            'tx_ref' => $txRef,
            'callback_url' => $payment->callback_url,
            'return_url' => $payment->return_url,
            'customization' => [
                'title' => 'Deposit Payment',
                'description' => 'Deposit payment for booking #' . $bookingId
            ]
        ];
        
        $chapaResponse = $this->chapaService->initializePayment($chapaData);
        
        if ($chapaResponse['status'] === 'success' && isset($chapaResponse['data']['data']['checkout_url'])) {
            $payment->checkout_url = $chapaResponse['data']['data']['checkout_url'];
            $payment->save();
        } else {
            $payment->payment_status = 'failed';
            $payment->status = 'failed';
            $payment->failure_reason = $chapaResponse['message'] ?? 'Failed to initialize payment';
            $payment->save();
            
            throw new \Exception('Failed to initialize payment with Chapa');
        }
        
        return $payment;
    }

    /**
     * Process final payment
     * 
     * @param int $bookingId
     * @param float $amount
     * @return Payment
     */
    public function processFinalPayment(int $bookingId, float $amount): Payment
    {
        // Validate amount
        $this->validatePaymentAmount($bookingId, $amount, 'final');
        
        $booking = Booking::with('customer', 'provider')->findOrFail($bookingId);
        
        // Generate unique transaction reference
        $txRef = 'FINAL-' . $bookingId . '-' . time();
        
        // Create payment record
        $payment = Payment::create([
            'bookingID' => $bookingId,
            'customerID' => $booking->customerID,
            'providerID' => $booking->providerID,
            'tx_ref' => $txRef,
            'amount' => $amount,
            'payment_type' => 'final',
            'payment_status' => 'pending',
            'status' => 'pending',
            'currency' => 'ETB',
            'customer_email' => $booking->customer->email,
            'customer_first_name' => $booking->customer->firstName,
            'customer_last_name' => $booking->customer->lastName,
            'customer_phone' => $booking->customer->phoneNumber,
            'callback_url' => config('app.url') . '/api/payments/verify-callback',
            'return_url' => config('app.frontend_url') . '/bookings/' . $bookingId
        ]);
        
        // Initialize Chapa payment
        $chapaData = [
            'amount' => $amount,
            'currency' => 'ETB',
            'email' => $booking->customer->email,
            'first_name' => $booking->customer->firstName,
            'last_name' => $booking->customer->lastName,
            'phone_number' => $booking->customer->phoneNumber,
            'tx_ref' => $txRef,
            'callback_url' => $payment->callback_url,
            'return_url' => $payment->return_url,
            'customization' => [
                'title' => 'Final Payment',
                'description' => 'Final payment for booking #' . $bookingId
            ]
        ];
        
        $chapaResponse = $this->chapaService->initializePayment($chapaData);
        
        if ($chapaResponse['status'] === 'success' && isset($chapaResponse['data']['data']['checkout_url'])) {
            $payment->checkout_url = $chapaResponse['data']['data']['checkout_url'];
            $payment->save();
        } else {
            $payment->payment_status = 'failed';
            $payment->status = 'failed';
            $payment->failure_reason = $chapaResponse['message'] ?? 'Failed to initialize payment';
            $payment->save();
            
            throw new \Exception('Failed to initialize payment with Chapa');
        }
        
        return $payment;
    }

    /**
     * Verify and complete payment after Chapa callback
     * 
     * @param string $txRef
     * @return void
     */
    public function verifyAndCompletePayment(string $txRef): void
    {
        // Find payment by tx_ref
        $payment = Payment::where('tx_ref', $txRef)->firstOrFail();
        
        // Verify with Chapa
        $chapaResponse = $this->chapaService->verifyPayment($txRef);
        
        if ($chapaResponse['status'] === 'success' && 
            isset($chapaResponse['data']['status']) && 
            $chapaResponse['data']['status'] === 'success') {
            
            // Payment successful
            DB::transaction(function () use ($payment, $chapaResponse) {
                $payment->payment_status = 'completed';
                $payment->status = 'paid';
                $payment->paid_at = now();
                $payment->chapa_tx_id = $chapaResponse['data']['data']['tx_ref'] ?? null;
                $payment->save();
                
                $booking = $payment->booking;
                
                if ($payment->isDeposit()) {
                    // Update booking status after deposit payment
                    $booking->payment_status = 'deposit_paid';
                    $booking->paid_at = now();
                    $booking->save();
                    
                    // Send notification to provider
                    // TODO: Implement notification
                    Log::info('Deposit payment completed', [
                        'booking_id' => $booking->bookingID,
                        'amount' => $payment->amount
                    ]);
                    
                } elseif ($payment->isFinal()) {
                    // Update booking status after final payment
                    $booking->payment_status = 'completed';
                    $booking->save();
                    
                    // Trigger payout processor for hybrid payout
                    $this->payoutProcessor->processHybridPayout($booking->bookingID, $booking->agreed_price);
                    
                    Log::info('Final payment completed and payout processed', [
                        'booking_id' => $booking->bookingID,
                        'amount' => $payment->amount
                    ]);
                }
            });
            
        } else {
            // Payment failed
            $payment->payment_status = 'failed';
            $payment->status = 'failed';
            $payment->failure_reason = $chapaResponse['message'] ?? 'Payment verification failed';
            $payment->save();
            
            Log::error('Payment verification failed', [
                'tx_ref' => $txRef,
                'response' => $chapaResponse
            ]);
        }
    }

    /**
     * Process deposit refund (when provider cancels)
     * 
     * @param int $bookingId
     * @param string $reason
     * @return void
     */
    public function processDepositRefund(int $bookingId, string $reason): void
    {
        $booking = Booking::with('customer', 'depositPayment')->findOrFail($bookingId);
        
        // Validate booking has status 'deposit_paid'
        if ($booking->payment_status !== 'deposit_paid') {
            throw new \Exception('Booking is not in deposit_paid status');
        }
        
        $depositPayment = $booking->depositPayment;
        if (!$depositPayment) {
            throw new \Exception('Deposit payment not found');
        }
        
        $maxRetries = 3;
        $attempt = 0;
        $refunded = false;
        
        while ($attempt < $maxRetries && !$refunded) {
            $attempt++;
            
            try {
                DB::transaction(function () use ($depositPayment, $booking, $bookingId, $reason) {
                    // Update payment status to refunded
                    $depositPayment->payment_status = 'refunded';
                    $depositPayment->refunded_at = now();
                    $depositPayment->save();
                    
                    // Credit customer wallet/account
                    $customer = $booking->customer;
                    $customer->walletBalance = ($customer->walletBalance ?? 0) + $depositPayment->amount;
                    $customer->save();
                    
                    // Update booking status
                    $booking->payment_status = 'refunded';
                    $booking->save();
                    
                    Log::info('Deposit refund processed', [
                        'booking_id' => $bookingId,
                        'payment_id' => $depositPayment->paymentID,
                        'amount' => $depositPayment->amount,
                        'reason' => $reason
                    ]);
                });
                
                // Send notification to customer
                $notificationService = app(NotificationService::class);
                $notificationService->toCustomer(
                    $booking->customerID,
                    'deposit_refund_processed',
                    'Deposit Refunded',
                    'Your deposit of ' . number_format((float) ($depositPayment->amount ?? 0), 2) . ' ETB for booking #' . $bookingId . ' has been refunded to your wallet.',
                    [
                        'booking_id' => $bookingId,
                        'amount' => $depositPayment->amount,
                        'reason' => $reason
                    ],
                    $bookingId
                );
                
                $refunded = true;
                
            } catch (\Exception $e) {
                Log::error('Deposit refund attempt failed', [
                    'booking_id' => $bookingId,
                    'attempt' => $attempt,
                    'error' => $e->getMessage()
                ]);
                
                if ($attempt >= $maxRetries) {
                    // Notify admin if all retries fail
                    $notificationService = app(NotificationService::class);
                    $notificationService->toAdmins(
                        'refund_failed',
                        'Deposit Refund Failed',
                        'Failed to process deposit refund for booking #' . $bookingId . ' after ' . $maxRetries . ' attempts.',
                        [
                            'booking_id' => $bookingId,
                            'payment_id' => $depositPayment->paymentID,
                            'amount' => $depositPayment->amount,
                            'error' => $e->getMessage()
                        ]
                    );
                    
                    throw $e;
                }
                
                // Wait before retry
                sleep(2);
            }
        }
    }

    /**
     * Process final payment refund (when dispute resolved in customer favor)
     * 
     * @param int $bookingId
     * @param string $reason
     * @return void
     */
    public function processFinalPaymentRefund(int $bookingId, string $reason): void
    {
        $booking = Booking::with('customer', 'provider', 'finalPayment')->findOrFail($bookingId);
        
        $finalPayment = $booking->finalPayment;
        if (!$finalPayment || $finalPayment->payment_status !== 'completed') {
            throw new \Exception('Final payment not found or not completed');
        }
        
        DB::transaction(function () use ($finalPayment, $booking, $bookingId, $reason) {
            // Reverse provider payouts first
            $this->payoutProcessor->reversePayoutForRefund($bookingId);
            
            // Update payment status to refunded
            $finalPayment->payment_status = 'refunded';
            $finalPayment->refunded_at = now();
            $finalPayment->save();
            
            // Credit customer wallet/account
            $customer = $booking->customer;
            $customer->walletBalance = ($customer->walletBalance ?? 0) + $finalPayment->amount;
            $customer->save();
            
            // Update booking status
            $booking->payment_status = 'refunded';
            $booking->save();
            
            Log::info('Final payment refund processed', [
                'booking_id' => $bookingId,
                'payment_id' => $finalPayment->paymentID,
                'amount' => $finalPayment->amount,
                'reason' => $reason
            ]);
        });
        
        // Send notifications
        $notificationService = app(NotificationService::class);
        
        $notificationService->toCustomer(
            $booking->customerID,
            'final_payment_refund_processed',
            'Payment Refunded',
            'Your payment of ' . number_format((float) ($finalPayment->amount ?? 0), 2) . ' ETB for booking #' . $bookingId . ' has been refunded to your wallet.',
            [
                'booking_id' => $bookingId,
                'amount' => $finalPayment->amount,
                'reason' => $reason
            ],
            $bookingId
        );
        
        $notificationService->toProvider(
            $booking->providerID,
            'payout_reversed',
            'Payout Reversed',
            'Payout for booking #' . $bookingId . ' has been reversed due to refund.',
            [
                'booking_id' => $bookingId,
                'reason' => $reason
            ],
            $bookingId
        );
    }
}
