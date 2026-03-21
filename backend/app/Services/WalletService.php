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

        DB::transaction(function () use ($wallet, $payment) {
            // Deduct from pending balance
            $wallet->pending_balance = max(0, $wallet->pending_balance - $payment->provider_amount);
            $wallet->available_balance += $payment->provider_amount;
            $wallet->save();

            // Update payment status to 'released'
            $payment->status = 'released';
            $payment->released_at = now();
            $payment->save();

            // Update booking
            $booking = Booking::find($payment->bookingID);
            if ($booking) {
                $booking->payment_status = 'released';
                $booking->released_at = now();
                $booking->save();
            }

            WalletTransaction::create([
                'walletID' => $wallet->walletID,
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

        return $wallet;
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

        return DB::transaction(function () use ($payment, $chapaResponse) {
            Log::info('Updating payment status to held', [
                'tx_ref' => $payment->tx_ref,
                'chapa_response_keys' => $chapaResponse ? array_keys($chapaResponse) : 'none'
            ]);

            // 1. Update Payment
            $payment->status = 'held';
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
                $booking->payment_status = 'held';
                $booking->paid_at = now();
                // If it was accepted, it stays accepted or moves to paid status if you use that
                // Many parts of the app expect 'accepted' or 'in_progress', but 'paid' might be a new intermediate
                // For now, keep its current status to avoid breaking flow, just update payment_status
                $booking->save();

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

                // 4. Update Wallet pending balance
                $wallet = Wallet::firstOrCreate(
                    ['providerID' => $payment->providerID],
                    ['available_balance' => 0, 'pending_balance' => 0]
                );
                $wallet->pending_balance += $payment->provider_amount;
                $wallet->save();

                // 5. Create WalletTransaction record
                WalletTransaction::create([
                    'walletID' => $wallet->walletID,
                    'type' => 'pending_credit',
                    'amount' => $payment->provider_amount,
                    'description' => 'Payment held for booking #' . $booking->bookingID,
                    'bookingID' => $booking->bookingID
                ]);

            // 6. Send Notifications
            $notificationService = app(NotificationService::class);
            
            // Notify Customer
            $notificationService->toCustomer(
                $booking->customerID,
                'payment_success',
                'Payment Successful',
                'Your payment for ' . ($booking->service->title ?? 'service') . ' has been received.',
                ['booking_id' => $booking->bookingID],
                $booking->bookingID
            );
            
            // Notify Provider
            $notificationService->toProvider(
                $booking->providerID,
                'payment_received',
                'Payment Received',
                'You have received a payment for ' . ($booking->service->title ?? 'service') . '. You can now start the service. Funds are held in escrow.',
                [
                    'booking_id' => $booking->bookingID,
                    'customer_name' => $booking->customer->fullname ?? 'Customer',
                    'amount' => $payment->amount
                ],
                $booking->bookingID
            );
                
                Log::info('Payment success processed for booking: ' . $booking->bookingID);
                return true;
            }

            return false;
        });
    }
}