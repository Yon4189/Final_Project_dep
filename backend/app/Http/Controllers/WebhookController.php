<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Payment;
use App\Models\Withdrawal;
use App\Models\Booking;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Support\Str;

class WebhookController extends Controller
{
    protected $walletService;

    public function __construct(WalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    /**
     * Handle Chapa payment webhook
     * This is the most reliable way to get payment confirmation
     */
public function handleChapaWebhook(Request $request)
{
    // Log everything for debugging
    Log::info('Webhook received', [
        'method' => $request->method(),
        'headers' => $request->headers->all(),
        'content' => $request->getContent()
    ]);

    // Get signature from header (may be null)
    $signature = $request->header('chapa-signature');

    // For testing in local environment, skip verification if no signature
    if (app()->environment('local') && !$signature) {
        Log::info('Local test: skipping signature verification');
    } else {
        // Verify signature if present
        if (!$signature) {
            Log::error('Missing signature header');
            return response()->json(['error' => 'Missing signature'], 401);
        }

        $payload = $request->getContent();
        $secret = config('services.chapa.webhook_secret');
        if (!$this->verifyWebhookSignature($payload, $signature, $secret)) {
            Log::error('Invalid webhook signature');
            return response()->json(['error' => 'Invalid signature'], 401);
        }
    }

    // Process the webhook payload
    $payload = $request->all();
    $txRef = $payload['trx_ref'] ?? $payload['tx_ref'] ?? null;
    if (!$txRef) {
        Log::error('No transaction reference');
        return response()->json(['error' => 'Missing tx_ref'], 400);
    }

    // Find payment and update as before
    $payment = Payment::where('tx_ref', $txRef)->first();
    if (!$payment) {
        Log::error('Payment not found', ['tx_ref' => $txRef]);
        return response()->json(['error' => 'Payment not found'], 404);
    }

    if (($payload['status'] ?? '') === 'success') {
        DB::transaction(function () use ($payment) {
            $payment->status = 'held';
            $payment->paid_at = now();
            $payment->save();

            $booking = Booking::find($payment->bookingID);
            if ($booking) {
                $booking->payment_status = 'held';
                $booking->save();
            }
        });
        return response()->json(['success' => true]);
    }

    return response()->json(['error' => 'Unhandled status'], 400);
}



    /**
     * Handle successful payment webhook
     */
    private function handlePaymentSuccess($data)
    {
        $txRef = $data['tx_ref'] ?? null;
        $chapaTxId = $data['id'] ?? null;
        $amount = $data['amount'] ?? 0;
        $currency = $data['currency'] ?? 'ETB';

        if (!$txRef) {
            Log::error('Payment success webhook missing tx_ref', $data);
            return response()->json(['error' => 'Missing transaction reference'], 400);
        }

        // Find payment by tx_ref
        $payment = Payment::where('tx_ref', $txRef)->first();
        
        if (!$payment) {
            Log::warning('Payment not found for webhook', ['tx_ref' => $txRef]);
            return response()->json(['error' => 'Payment not found'], 404);
        }

        // Verify amount matches
        if (abs($amount - $payment->amount) > 0.01) {
            Log::error('Payment amount mismatch in webhook', [
                'tx_ref' => $txRef,
                'expected' => $payment->amount,
                'received' => $amount
            ]);
            $payment->status = 'failed';
            $payment->failure_reason = 'Amount mismatch in webhook';
            $payment->save();
            return response()->json(['error' => 'Amount mismatch'], 400);
        }

        // Only process if payment is in pending/processing state
        if (!in_array($payment->status, ['pending', 'processing'])) {
            Log::info('Payment already processed', [
                'tx_ref' => $txRef,
                'status' => $payment->status
            ]);
            return response()->json(['status' => 'already_processed']);
        }

        // Use database transaction to ensure data consistency
        DB::transaction(function () use ($payment, $chapaTxId, $data) {
            // Update payment status to held (in escrow)
            $payment->status = 'held';
            $payment->chapa_tx_id = $chapaTxId;
            $payment->payment_method = $data['payment_method'] ?? 'chapa';
            $payment->chapa_response = $data;
            $payment->paid_at = now();
            $payment->held_until = now()->addHours(48); // Auto-release after 48 hours
            $payment->save();

            // Update booking status if linked
            if ($payment->bookingID) {
                $booking = Booking::find($payment->bookingID);
                if ($booking) {
                    $booking->booking_status = 'paid';
                    $booking->paymentID = $payment->paymentID;
                    $booking->customer_confirmation_deadline = now()->addHours(48);
                    $booking->save();
                    
                    Log::info('Booking status updated to paid', [
                        'booking_id' => $booking->bookingID,
                        'payment_id' => $payment->paymentID
                    ]);
                }
            }

            // Trigger any additional business logic
            $this->triggerPaymentSuccessActions($payment);
        });

        Log::info('Payment success processed via webhook', [
            'payment_id' => $payment->paymentID,
            'tx_ref' => $txRef,
            'amount' => $payment->amount
        ]);

        return response()->json(['status' => 'success']);
    }

    /**
     * Handle failed payment webhook
     */
    private function handlePaymentFailed($data)
    {
        $txRef = $data['tx_ref'] ?? null;
        $failureReason = $data['message'] ?? $data['failure_reason'] ?? 'Payment failed';

        if (!$txRef) {
            Log::error('Payment failed webhook missing tx_ref', $data);
            return response()->json(['error' => 'Missing transaction reference'], 400);
        }

        $payment = Payment::where('tx_ref', $txRef)->first();
        
        if (!$payment) {
            Log::warning('Payment not found for failed webhook', ['tx_ref' => $txRef]);
            return response()->json(['error' => 'Payment not found'], 404);
        }

        DB::transaction(function () use ($payment, $failureReason, $data) {
            $payment->status = 'failed';
            $payment->failure_reason = $failureReason;
            $payment->chapa_response = $data;
            $payment->save();

            // Update booking status if linked
            if ($payment->bookingID) {
                $booking = Booking::find($payment->bookingID);
                if ($booking) {
                    $booking->booking_status = 'payment_failed';
                    $booking->save();
                }
            }

            // Trigger failure notifications
            $this->triggerPaymentFailureActions($payment);
        });

        Log::info('Payment failure processed via webhook', [
            'payment_id' => $payment->paymentID,
            'tx_ref' => $txRef,
            'reason' => $failureReason
        ]);

        return response()->json(['status' => 'processed']);
    }

    /**
     * Handle successful transfer webhook (for withdrawals)
     */
    private function handleTransferSuccess($data)
    {
        $reference = $data['reference'] ?? $data['tx_ref'] ?? null;
        $transferId = $data['id'] ?? null;

        if (!$reference) {
            Log::error('Transfer success webhook missing reference', $data);
            return response()->json(['error' => 'Missing transfer reference'], 400);
        }

        $withdrawal = Withdrawal::where('withdrawal_ref', $reference)->first();
        
        if (!$withdrawal) {
            Log::warning('Withdrawal not found for transfer webhook', ['reference' => $reference]);
            return response()->json(['error' => 'Withdrawal not found'], 404);
        }

        DB::transaction(function () use ($withdrawal, $transferId, $data) {
            $withdrawal->status = 'processed';
            $withdrawal->chapa_transfer_id = $transferId;
            $withdrawal->processed_at = now();
            $withdrawal->metadata = array_merge($withdrawal->metadata ?? [], [
                'chapa_response' => $data
            ]);
            $withdrawal->save();

            // Mark associated payments as withdrawn
            Payment::where('providerID', $withdrawal->providerID)
                ->where('status', 'released')
                ->where('is_withdrawn', false)
                ->update([
                    'is_withdrawn' => true,
                    'withdrawn_at' => now()
                ]);

            // Trigger success notifications
            $this->triggerTransferSuccessActions($withdrawal);
        });

        Log::info('Transfer success processed', [
            'withdrawal_id' => $withdrawal->withdrawalID,
            'reference' => $reference,
            'amount' => $withdrawal->amount
        ]);

        return response()->json(['status' => 'processed']);
    }

    /**
     * Handle failed transfer webhook
     */
    private function handleTransferFailed($data)
    {
        $reference = $data['reference'] ?? $data['tx_ref'] ?? null;
        $failureReason = $data['message'] ?? $data['failure_reason'] ?? 'Transfer failed';

        if (!$reference) {
            Log::error('Transfer failed webhook missing reference', $data);
            return response()->json(['error' => 'Missing transfer reference'], 400);
        }

        $withdrawal = Withdrawal::where('withdrawal_ref', $reference)->first();
        
        if (!$withdrawal) {
            Log::warning('Withdrawal not found for failed transfer webhook', ['reference' => $reference]);
            return response()->json(['error' => 'Withdrawal not found'], 404);
        }

        DB::transaction(function () use ($withdrawal, $failureReason, $data) {
            $withdrawal->status = 'failed';
            $withdrawal->failure_reason = $failureReason;
            $withdrawal->metadata = array_merge($withdrawal->metadata ?? [], [
                'chapa_response' => $data
            ]);
            $withdrawal->save();

            // Return funds to wallet
            $wallet = Wallet::where('providerID', $withdrawal->providerID)->first();
            if ($wallet) {
                $balanceBefore = $wallet->available_balance;
                $wallet->available_balance += $withdrawal->amount;
                $wallet->save();

                // Create transaction record
                WalletTransaction::create([
                    'reference' => 'TXN-' . Str::random(12),
                    'walletID' => $wallet->walletID,
                    'type' => 'withdrawal_failed',
                    'amount' => $withdrawal->amount,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $wallet->available_balance,
                    'description' => "Withdrawal #{$withdrawal->withdrawal_ref} failed - funds returned",
                    'metadata' => [
                        'withdrawal_id' => $withdrawal->withdrawalID,
                        'failure_reason' => $failureReason
                    ]
                ]);
            }

            // Trigger failure notifications
            $this->triggerTransferFailureActions($withdrawal);
        });

        Log::info('Transfer failure processed', [
            'withdrawal_id' => $withdrawal->withdrawalID,
            'reference' => $reference,
            'reason' => $failureReason
        ]);

        return response()->json(['status' => 'processed']);
    }

    /**
     * Verify webhook signature
     */
private function verifyWebhookSignature($payload, $signature, $secret)
{
    $expected = hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, $signature);
}

    /**
     * Trigger actions after successful payment
     */
    private function triggerPaymentSuccessActions(Payment $payment)
    {
        try {
            // Send confirmation notification to customer
            // This would typically be done via NotificationService
            Log::info('Payment success actions triggered', [
                'payment_id' => $payment->paymentID,
                'customer_id' => $payment->customerID
            ]);

            // Notify provider about new paid booking
            if ($payment->bookingID) {
                // TODO: Implement provider notification via NotificationService
                Log::info('Provider notification would be sent', [
                    'provider_id' => $payment->providerID,
                    'booking_id' => $payment->bookingID
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error triggering payment success actions', [
                'payment_id' => $payment->paymentID,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Trigger actions after failed payment
     */
    private function triggerPaymentFailureActions(Payment $payment)
    {
        try {
            // Send failure notification to customer
            Log::info('Payment failure actions triggered', [
                'payment_id' => $payment->paymentID,
                'customer_id' => $payment->customerID
            ]);

        } catch (\Exception $e) {
            Log::error('Error triggering payment failure actions', [
                'payment_id' => $payment->paymentID,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Trigger actions after successful transfer
     */
    private function triggerTransferSuccessActions(Withdrawal $withdrawal)
    {
        try {
            // Send success notification to provider
            Log::info('Transfer success actions triggered', [
                'withdrawal_id' => $withdrawal->withdrawalID,
                'provider_id' => $withdrawal->providerID,
                'amount' => $withdrawal->amount
            ]);

        } catch (\Exception $e) {
            Log::error('Error triggering transfer success actions', [
                'withdrawal_id' => $withdrawal->withdrawalID,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Trigger actions after failed transfer
     */
    private function triggerTransferFailureActions(Withdrawal $withdrawal)
    {
        try {
            // Send failure notification to provider
            Log::info('Transfer failure actions triggered', [
                'withdrawal_id' => $withdrawal->withdrawalID,
                'provider_id' => $withdrawal->providerID,
                'reason' => $withdrawal->failure_reason
            ]);

        } catch (\Exception $e) {
            Log::error('Error triggering transfer failure actions', [
                'withdrawal_id' => $withdrawal->withdrawalID,
                'error' => $e->getMessage()
            ]);
        }
    }
}