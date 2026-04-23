<?php

namespace App\Services;

use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Payment;
use App\Models\Booking;
use App\Models\Transaction;
use App\Services\NotificationService;

class WalletService
{
    public function releasePayment($payment)
    {
        // Check if already released
        if ($payment->status === 'released') {
            Log::warning('Payment already released', ['payment_id' => $payment->paymentID]);
            return null;
        }

        $wallet = Wallet::firstOrCreate(
            ['providerID' => $payment->providerID],
            [
                'providerID' => $payment->providerID,
                'available_balance' => 0, 
                'pending_balance' => 0
            ]
        );

        try {
            DB::transaction(function () use ($wallet, $payment) {
                // Lock wallet for update to prevent race conditions
                $lockedWallet = Wallet::where('walletID', $wallet->walletID)
                    ->lockForUpdate()
                    ->first();
                
                // Validate pending balance is sufficient
                if ($lockedWallet->pending_balance < $payment->provider_amount) {
                    Log::error('Insufficient pending balance for payment release', [
                        'wallet_id' => $lockedWallet->walletID,
                        'pending_balance' => $lockedWallet->pending_balance,
                        'required_amount' => $payment->provider_amount,
                        'payment_id' => $payment->paymentID
                    ]);
                    throw new \Exception('Insufficient pending balance');
                }
                
                // Deduct from pending balance and add to available
                $lockedWallet->pending_balance -= $payment->provider_amount;
                $lockedWallet->available_balance += $payment->provider_amount;
                $lockedWallet->save();

                // Update payment status to 'released'
                $payment->status = 'released';
                $payment->released_at = now();
                $payment->save();

                // Update booking
                $booking = Booking::find($payment->bookingID);
                if ($booking) {
                    $booking->payment_status = 'completed';
                    $booking->released_at = now();
                    $booking->save();
                }

                WalletTransaction::create([
                    'walletID' => $lockedWallet->walletID,
                    'type' => 'credit',
                    'amount' => $payment->provider_amount,
                    'description' => 'Payment released for booking #' . $payment->bookingID,
                    'bookingID' => $payment->bookingID
                ]);

                // Notify Provider that funds are released
                $notificationService = app(NotificationService::class);
                $notificationService->toProvider(
                    $payment->providerID,
                    'payment_released',
                    'Funds Released',
                    'Your payment for booking #' . $payment->bookingID . ' has been released and is now available for withdrawal.',
                    [
                        'booking_id' => $payment->bookingID,
                        'amount' => $payment->provider_amount,
                        'transaction_type' => 'release'
                    ],
                    $payment->bookingID
                );
            });
            
            return $wallet->fresh(); // Return refreshed wallet
            
        } catch (\Exception $e) {
            Log::error('Payment release failed', [
                'payment_id' => $payment->paymentID,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Handle successful payment (moves to escrow/held status)
     */
    public function handlePaymentSuccess(Payment $payment, $chapaResponse = null)
    {
        // Don't process if already handled
        if (in_array($payment->status, ['held', 'paid', 'releasable', 'released'])) {
            Log::info('Payment already processed', ['tx_ref' => $payment->tx_ref, 'status' => $payment->status]);
            return false;
        }

        try {
            return DB::transaction(function () use ($payment, $chapaResponse) {
                Log::info('Updating payment status to paid', [
                    'tx_ref' => $payment->tx_ref,
                    'payment_type' => $payment->payment_type,
                    'chapa_response_keys' => $chapaResponse ? array_keys($chapaResponse) : 'none'
                ]);

                // 1. Update Payment
                $payment->status = 'paid';
                $payment->paid_at = now();
                if ($chapaResponse) {
                    $payment->chapa_response = $chapaResponse;
                    $payment->chapa_tx_id = $chapaResponse['data']['data']['reference'] ?? $chapaResponse['ref_id'] ?? $payment->chapa_tx_id;
                }
                $payment->save();
                
                Log::info('Payment status updated successfully in DB', ['payment_id' => $payment->paymentID]);

                // 2. Update Booking
                $booking = Booking::with(['customer', 'service', 'provider'])->find($payment->bookingID);
                if ($booking) {
                    // Determine booking status based on payment type
                    if ($payment->payment_type === 'deposit') {
                        // Deposit payment: Update to deposit_paid
                        $booking->payment_status = 'deposit_paid';
                        $booking->status = 'accepted';
                        $booking->paid_at = now();
                        $booking->save();
                        
                        // Add to provider's pending balance (held in escrow)
                        $wallet = Wallet::firstOrCreate(
                            ['providerID' => $payment->providerID],
                            ['available_balance' => 0, 'pending_balance' => 0]
                        );
                        
                        $lockedWallet = Wallet::where('walletID', $wallet->walletID)
                            ->lockForUpdate()
                            ->first();
                        $lockedWallet->pending_balance += $payment->provider_amount;
                        $lockedWallet->save();

                        WalletTransaction::create([
                            'walletID' => $lockedWallet->walletID,
                            'type' => 'pending_credit',
                            'amount' => $payment->provider_amount,
                            'description' => 'Deposit payment held for booking #' . $booking->bookingID,
                            'bookingID' => $booking->bookingID
                        ]);
                        
                        // Notify Provider
                        $notificationService = app(NotificationService::class);
                        $notificationService->toProvider(
                            $booking->providerID,
                            'payment_received',
                            'Deposit Payment Received',
                            'You have received a deposit payment for ' . ($booking->service->title ?? 'service') . '. You can now start the service. Funds are held in escrow.',
                            [
                                'booking_id' => $booking->bookingID,
                                'customer_name' => $booking->customer->fullname ?? 'Customer',
                                'amount' => $payment->amount
                            ],
                            $booking->bookingID
                        );
                        
                    } else if ($payment->payment_type === 'final') {
                        // Final payment: Mark as completed and release ALL funds (deposit + final)
                        $booking->payment_status = 'completed';
                        $booking->status = 'completed';
                        $booking->paid_at = now();
                        $booking->save();
                        
                        // Get the deposit payment
                        $depositPayment = Payment::where('bookingID', $booking->bookingID)
                            ->where('payment_type', 'deposit')
                            ->where('status', 'paid')
                            ->first();
                        
                        if ($depositPayment) {
                            // Mark deposit as releasable
                            $depositPayment->status = 'releasable';
                            $depositPayment->save();
                            
                            // Release deposit funds
                            $this->releasePayment($depositPayment);
                        }
                        
                        // Mark final payment as releasable and release it
                        $payment->status = 'releasable';
                        $payment->save();
                        $this->releasePayment($payment);
                        
                        // Notify Provider
                        $notificationService = app(NotificationService::class);
                        $notificationService->toProvider(
                            $booking->providerID,
                            'payment_received',
                            'Final Payment Received',
                            'Final payment for ' . ($booking->service->title ?? 'service') . ' has been received. All funds have been released to your wallet.',
                            [
                                'booking_id' => $booking->bookingID,
                                'customer_name' => $booking->customer->fullname ?? 'Customer',
                                'amount' => $payment->amount
                            ],
                            $booking->bookingID
                        );
                    }

                    // 3. Create Transaction (for provider dashboard earnings)
                    Transaction::firstOrCreate(
                        ['bookingID' => $booking->bookingID],
                        [
                            'bookingID' => $booking->bookingID,
                            'netAmount' => $payment->provider_amount,
                            'platformFee' => $payment->platform_commission,
                            'releaseDate' => now()->addHours(48), // Default escrow period
                        ]
                    );

                    // 4. Notify Customer
                    $notificationService = app(NotificationService::class);
                    $notificationService->toCustomer(
                        $booking->customerID,
                        'payment_success',
                        'Payment Successful',
                        'Your payment for ' . ($booking->service->title ?? 'service') . ' has been received.',
                        ['booking_id' => $booking->bookingID],
                        $booking->bookingID
                    );
                        
                    Log::info('Payment success processed for booking: ' . $booking->bookingID);
                    return true;
                }

                return false;
            });
        } catch (\Exception $e) {
            Log::error('Payment success handling failed', [
                'payment_id' => $payment->paymentID,
                'tx_ref' => $payment->tx_ref,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}