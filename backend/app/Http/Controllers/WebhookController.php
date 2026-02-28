<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Payment;
use App\Models\Withdrawal;
use Illuminate\Support\Str;

class WebhookController extends Controller
{
    /**
     * Handle Chapa payment webhook
     */
    public function handleChapaWebhook(Request $request)
    {
        // Log incoming webhook for debugging
        Log::info('Chapa webhook received', [
            'payload' => $request->all(),
            'headers' => $request->header()
        ]);

        // Verify webhook signature (if configured)
        $webhookSecret = config('services.chapa.webhook_secret');
        if ($webhookSecret) {
            $signature = $request->header('X-Chapa-Signature');
            if (!$this->verifyWebhookSignature($request->getContent(), $signature, $webhookSecret)) {
                Log::warning('Invalid webhook signature received');
                return response()->json(['error' => 'Invalid signature'], 401);
            }
        }

        try {
            $event = $request->input('event');
            $data = $request->input('data');

            switch ($event) {
                case 'payment.success':
                    return $this->handlePaymentSuccess($data);
                
                case 'payment.failed':
                    return $this->handlePaymentFailed($data);
                
                case 'transfer.success':
                    return $this->handleTransferSuccess($data);
                
                case 'transfer.failed':
                    return $this->handleTransferFailed($data);
                
                default:
                    Log::info('Unhandled webhook event', ['event' => $event]);
                    return response()->json(['status' => 'ignored']);
            }

        } catch (\Exception $e) {
            Log::error('Webhook processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Webhook processing failed'
            ], 500);
        }
    }

    /**
     * Handle successful payment webhook
     */
    private function handlePaymentSuccess($data)
    {
        $txRef = $data['tx_ref'] ?? null;
        $chapaTxId = $data['id'] ?? null;

        if (!$txRef) {
            Log::error('Payment success webhook missing tx_ref', $data);
            return response()->json(['error' => 'Missing transaction reference'], 400);
        }

        // Find and update payment
        $payment = Payment::where('tx_ref', $txRef)->first();
        
        if (!$payment) {
            Log::warning('Payment not found for webhook', ['tx_ref' => $txRef]);
            return response()->json(['error' => 'Payment not found'], 404);
        }

        // Update payment status
        $payment->status = 'success';
        $payment->chapa_tx_id = $chapaTxId;
        $payment->payment_method = $data['payment_method'] ?? null;
        $payment->save();

        // Update booking status if linked
        if ($payment->booking_id) {
            $booking = $payment->booking;
            if ($booking) {
                $booking->status = 'paid';
                $booking->save();
                
                Log::info('Booking status updated to paid', [
                    'booking_id' => $booking->bookingID,
                    'payment_id' => $payment->id
                ]);
            }
        }

        // Trigger any additional business logic
        $this->triggerPaymentSuccessActions($payment);

        Log::info('Payment success processed', [
            'payment_id' => $payment->id,
            'tx_ref' => $txRef,
            'amount' => $payment->amount
        ]);

        return response()->json(['status' => 'processed']);
    }

    /**
     * Handle failed payment webhook
     */
    private function handlePaymentFailed($data)
    {
        $txRef = $data['tx_ref'] ?? null;
        $failureReason = $data['message'] ?? 'Payment failed';

        if (!$txRef) {
            Log::error('Payment failed webhook missing tx_ref', $data);
            return response()->json(['error' => 'Missing transaction reference'], 400);
        }

        $payment = Payment::where('tx_ref', $txRef)->first();
        
        if (!$payment) {
            Log::warning('Payment not found for failed webhook', ['tx_ref' => $txRef]);
            return response()->json(['error' => 'Payment not found'], 404);
        }

        $payment->status = 'failed';
        $payment->failure_reason = $failureReason;
        $payment->save();

        // Update booking status if linked
        if ($payment->booking_id) {
            $booking = $payment->booking;
            if ($booking) {
                $booking->status = 'payment_failed';
                $booking->save();
            }
        }

        // Trigger failure notifications
        $this->triggerPaymentFailureActions($payment);

        Log::info('Payment failure processed', [
            'payment_id' => $payment->id,
            'tx_ref' => $txRef,
            'reason' => $failureReason
        ]);

        return response()->json(['status' => 'processed']);
    }

    /**
     * Handle successful transfer webhook
     */
    private function handleTransferSuccess($data)
    {
        $transferId = $data['id'] ?? null;
        $reference = $data['reference'] ?? null;

        if (!$reference) {
            Log::error('Transfer success webhook missing reference', $data);
            return response()->json(['error' => 'Missing transfer reference'], 400);
        }

        $withdrawal = Withdrawal::where('withdrawal_ref', $reference)->first();
        
        if (!$withdrawal) {
            Log::warning('Withdrawal not found for transfer webhook', ['reference' => $reference]);
            return response()->json(['error' => 'Withdrawal not found'], 404);
        }

        $withdrawal->status = 'completed';
        $withdrawal->chapa_transfer_id = $transferId;
        $withdrawal->chapa_transfer_status = 'successful';
        $withdrawal->completed_at = now();
        $withdrawal->save();

        // Update provider's earned amount
        $provider = $withdrawal->provider;
        if ($provider) {
            $provider->total_earned -= $withdrawal->amount;
            $provider->save();
        }

        // Trigger success notifications
        $this->triggerTransferSuccessActions($withdrawal);

        Log::info('Transfer success processed', [
            'withdrawal_id' => $withdrawal->id,
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
        $transferId = $data['id'] ?? null;
        $reference = $data['reference'] ?? null;
        $failureReason = $data['message'] ?? 'Transfer failed';

        if (!$reference) {
            Log::error('Transfer failed webhook missing reference', $data);
            return response()->json(['error' => 'Missing transfer reference'], 400);
        }

        $withdrawal = Withdrawal::where('withdrawal_ref', $reference)->first();
        
        if (!$withdrawal) {
            Log::warning('Withdrawal not found for failed transfer webhook', ['reference' => $reference]);
            return response()->json(['error' => 'Withdrawal not found'], 404);
        }

        $withdrawal->status = 'failed';
        $withdrawal->chapa_transfer_id = $transferId;
        $withdrawal->chapa_transfer_status = 'failed';
        $withdrawal->failure_reason = $failureReason;
        $withdrawal->save();

        // Trigger failure notifications
        $this->triggerTransferFailureActions($withdrawal);

        Log::info('Transfer failure processed', [
            'withdrawal_id' => $withdrawal->id,
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
        $expectedSignature = hash_hmac('sha256', $payload, $secret);
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Trigger actions after successful payment
     */
    private function triggerPaymentSuccessActions(Payment $payment)
    {
        try {
            // Send confirmation email to customer
            if ($payment->customer) {
                // TODO: Implement email notification
                Log::info('Payment confirmation email would be sent', [
                    'customer_email' => $payment->customer_email,
                    'payment_id' => $payment->id
                ]);
            }

            // Send notification to service provider if booking exists
            if ($payment->booking) {
                // TODO: Implement provider notification
                Log::info('Provider payment notification would be sent', [
                    'booking_id' => $payment->booking_id,
                    'payment_id' => $payment->id
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error triggering payment success actions', [
                'payment_id' => $payment->id,
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
            if ($payment->customer) {
                // TODO: Implement email notification
                Log::info('Payment failure notification would be sent', [
                    'customer_email' => $payment->customer_email,
                    'payment_id' => $payment->id
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error triggering payment failure actions', [
                'payment_id' => $payment->id,
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
            // Send confirmation to provider
            if ($withdrawal->provider) {
                // TODO: Implement email notification
                Log::info('Transfer success notification would be sent', [
                    'provider_id' => $withdrawal->provider_id,
                    'withdrawal_id' => $withdrawal->id
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error triggering transfer success actions', [
                'withdrawal_id' => $withdrawal->id,
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
            if ($withdrawal->provider) {
                // TODO: Implement email notification
                Log::info('Transfer failure notification would be sent', [
                    'provider_id' => $withdrawal->provider_id,
                    'withdrawal_id' => $withdrawal->id
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error triggering transfer failure actions', [
                'withdrawal_id' => $withdrawal->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}
