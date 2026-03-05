<?php
// app/Http/Controllers/PaymentController.php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use App\Services\ChapaService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    protected $chapaService;
    protected $walletService;

    public function __construct(ChapaService $chapaService, WalletService $walletService)
    {
        $this->chapaService = $chapaService;
        $this->walletService = $walletService;
    }

    /**
     * Initialize payment for booking
     */
    public function initialize(Request $request)
    {
        $request->validate([
            'booking_id' => 'required|exists:bookings,bookingID',
            'return_url' => 'nullable|url'
        ]);

        $customer = $request->user();
        $booking = Booking::where('bookingID', $request->booking_id)
            ->where('customerID', $customer->customerID)
            ->where('booking_status', 'pending_payment')
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found or not ready for payment'
            ], 404);
        }

        // Check if payment already exists
        $existingPayment = Payment::where('bookingID', $booking->bookingID)
            ->whereIn('status', ['pending', 'processing', 'held'])
            ->first();

        if ($existingPayment) {
            return response()->json([
                'success' => true,
                'message' => 'Payment already initialized',
                'data' => [
                    'payment_id' => $existingPayment->paymentID,
                    'tx_ref' => $existingPayment->tx_ref,
                    'checkout_url' => $existingPayment->checkout_url,
                    'status' => $existingPayment->status
                ]
            ]);
        }

        return DB::transaction(function () use ($customer, $booking, $request) {
            // Calculate commission (10%)
            $commission = $booking->agreed_price * 0.10;
            $providerAmount = $booking->agreed_price - $commission;

            // Generate UNIQUE transaction reference
            $txRef = sprintf(
                'BOOKING-%d-CUST-%d-%s-%s',
                $booking->bookingID,
                $customer->customerID,
                now()->format('YmdHis'),
                Str::random(6)
            );

            // Create payment record with tx_ref BEFORE sending to Chapa
            $payment = Payment::create([
                'tx_ref' => $txRef,
                'bookingID' => $booking->bookingID,
                'customerID' => $customer->customerID,
                'providerID' => $booking->providerID,
                'amount' => $booking->agreed_price,
                'platform_commission' => $commission,
                'provider_amount' => $providerAmount,
                'status' => 'pending',
                'currency' => 'ETB',
                'callback_url' => route('payment.callback', ['tx_ref' => $txRef]),
                'return_url' => $request->return_url ?? config('app.frontend_url') . '/payment/return',
                'meta_data' => [
                    'booking_reference' => $booking->bookingID,
                    'customer_name' => $customer->fullname,
                    'customer_email' => $customer->email
                ]
            ]);

            // Prepare Chapa payment data with EXACT same tx_ref
            $paymentData = [
                'amount' => $booking->agreed_price,
                'currency' => 'ETB',
                'email' => $customer->email,
                'first_name' => $customer->fullname,
                'tx_ref' => $txRef,
                'callback_url' => $payment->callback_url,
                'return_url' => $payment->return_url,
                'customization' => [
                    'title' => 'Home Service Payment',
                    'description' => "Payment for booking #{$booking->bookingID}"
                ],
                'meta' => [
                    'booking_id' => $booking->bookingID,
                    'customer_id' => $customer->customerID,
                    'provider_id' => $booking->providerID,
                    'tx_ref' => $txRef
                ]
            ];

            // Initialize with Chapa
            $chapaResponse = $this->chapaService->initializePayment($paymentData);

            if ($chapaResponse['status'] !== 'success') {
                $payment->status = 'failed';
                $payment->failure_reason = $chapaResponse['message'] ?? 'Chapa initialization failed';
                $payment->save();
                
                return response()->json([
                    'success' => false,
                    'message' => 'Payment initialization failed',
                    'errors' => $chapaResponse
                ], 400);
            }

            // Update payment with checkout URL
            $payment->status = 'processing';
            $payment->checkout_url = $chapaResponse['data']['checkout_url'];
            $payment->chapa_response = $chapaResponse;
            $payment->save();

            Log::info('Payment initialized', [
                'tx_ref' => $txRef,
                'booking_id' => $booking->bookingID,
                'customer_id' => $customer->customerID
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment initialized successfully',
                'data' => [
                    'payment_id' => $payment->paymentID,
                    'tx_ref' => $txRef,
                    'checkout_url' => $payment->checkout_url,
                    'amount' => $payment->amount,
                    'status' => $payment->status
                ]
            ]);
        });
    }

    /**
     * Handle Chapa callback
     */
    /**
     * Handle Chapa webhook/callback (tx_ref is the key)
     */
    public function callback(Request $request, $tx_ref)
    {
        Log::info('Chapa webhook received', [
            'tx_ref' => $tx_ref,
            'payload' => $request->all()
        ]);

        // Find payment by tx_ref
        $payment = Payment::where('tx_ref', $tx_ref)->first();
        if (!$payment) {
            Log::error('Payment not found for webhook', ['tx_ref' => $tx_ref]);
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }

        // Verify signature if provided (best practice)
        $signature = $request->header('chapa-signature');
        if ($signature && !$this->chapaService->verifySignature($request->getContent(), $signature)) {
            Log::error('Chapa signature verification failed', ['tx_ref' => $tx_ref]);
            return response()->json(['success' => false, 'message' => 'Invalid signature'], 400);
        }

        // Verify with Chapa API
        $verification = $this->chapaService->verifyPayment($tx_ref);
        if ($verification['status'] !== 'success') {
            Log::error('Payment verification failed', ['tx_ref' => $tx_ref]);
            $payment->status = 'failed';
            $payment->failure_reason = 'Verification failed';
            $payment->save();
            return response()->json(['success' => false, 'message' => 'Verification failed'], 400);
        }

        // Verify amount matches
        if (abs($verification['data']['amount'] - $payment->amount) > 0.01) {
            Log::error('Payment amount mismatch', ['tx_ref' => $tx_ref]);
            $payment->status = 'failed';
            $payment->failure_reason = 'Amount mismatch';
            $payment->save();
            return response()->json(['success' => false, 'message' => 'Amount mismatch'], 400);
        }

        // Only process if payment is in pending/processing state
        if (!in_array($payment->status, ['pending', 'processing'])) {
            return response()->json([
                'success' => true,
                'message' => 'Payment already processed',
                'data' => ['status' => $payment->status]
            ]);
        }

        // Update payment as successful and held in escrow
        DB::transaction(function () use ($payment, $verification) {
            $payment->status = 'held';
            $payment->chapa_tx_id = $verification['data']['id'];
            $payment->paid_at = now();
            $payment->held_until = now()->addHours(48); // Auto-release after 48 hours
            $payment->save();

            // Update booking status and balances
            $booking = Booking::find($payment->bookingID);
            if ($booking) {
                $booking->payment_status = 'releasable';
                $booking->pending_balance = $payment->provider_amount;
                $booking->auto_release_at = now()->addHours(48);
                $booking->status = 'completed'; // or 'paid' if you want a separate status
                $booking->save();
                Log::info('Booking marked as paid and releasable', [
                    'booking_id' => $booking->bookingID,
                    'tx_ref' => $payment->tx_ref
                ]);
            }
        });

        // Respond with success
        return response()->json(['success' => true, 'message' => 'Payment processed']);
    }

    /**
     * Verify payment (called from frontend after return)
     */
    public function verify(Request $request)
    {
        $request->validate(['tx_ref' => 'required|string']);

        $payment = Payment::where('tx_ref', $request->tx_ref)
            ->with(['booking', 'booking.provider'])
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'payment_id' => $payment->paymentID,
                'tx_ref' => $payment->tx_ref,
                'status' => $payment->status,
                'amount' => $payment->amount,
                'booking_id' => $payment->bookingID,
                'booking_status' => $payment->booking->booking_status ?? null,
                'held_until' => $payment->held_until,
                'paid_at' => $payment->paid_at
            ]
        ]);
    }

    /**
     * Customer confirms work completed
     */
    public function confirmCompletion(Request $request, $bookingId)
    {
        $customer = $request->user();
        $booking = Booking::where('bookingID', $bookingId)
            ->where('customerID', $customer->customerID)
            ->where('booking_status', 'waiting_customer_confirmation')
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found or not awaiting confirmation'
            ], 404);
        }

        DB::transaction(function () use ($booking) {
            $payment = Payment::find($booking->paymentID);
            
            if (!$payment || $payment->status !== 'held') {
                throw new \Exception('Payment not in held state');
            }

            $payment->status = 'releasable';
            $payment->save();

            $booking->booking_status = 'completed';
            $booking->customer_confirmed_at = now();
            $booking->save();

            // Release payment to provider wallet
            $this->walletService->releasePayment($payment);
        });

        return response()->json([
            'success' => true,
            'message' => 'Service confirmed successfully',
            'data' => [
                'booking_id' => $booking->bookingID,
                'status' => 'completed'
            ]
        ]);
    }

    /**
     * Get customer payment history
     */
    public function history(Request $request)
    {
        $customer = $request->user();
        
        $payments = Payment::where('customerID', $customer->customerID)
            ->with(['booking', 'booking.provider'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $payments
        ]);
    }

    /**
     * Get single payment details by tx_ref
     */
    public function show($tx_ref)
    {
        $payment = Payment::where('tx_ref', $tx_ref)
            ->with(['booking', 'booking.provider', 'customer'])
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found'
            ], 404);
        }

        // Check authorization (customer or admin)
        $user = request()->user();
        if ($user && $user->customerID !== $payment->customerID && !$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $payment
        ]);
    }

    /**
     * Cancel a pending payment
     */
    public function cancel(Request $request, $tx_ref)
    {
        $payment = Payment::where('tx_ref', $tx_ref)
            ->whereIn('status', ['pending', 'processing'])
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found or cannot be cancelled'
            ], 404);
        }

        // Check authorization
        $user = $request->user();
        if ($user->customerID !== $payment->customerID) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $payment->status = 'cancelled';
        $payment->failure_reason = 'Cancelled by user';
        $payment->save();

        return response()->json([
            'success' => true,
            'message' => 'Payment cancelled successfully'
        ]);
    }

    /**
     * Get all payments (admin only)
     */
    public function index(Request $request)
    {
        // Admin authorization should be handled by middleware
        $query = Payment::with(['customer', 'booking', 'provider']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Filter by provider
        if ($request->has('provider_id')) {
            $query->where('providerID', $request->provider_id);
        }

        // Filter by customer
        if ($request->has('customer_id')) {
            $query->where('customerID', $request->customer_id);
        }

        $payments = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $payments
        ]);
    }

    /**
     * Get payment statistics (admin only)
     */
    public function getPaymentStats()
    {
        $stats = [
            'total_payments' => Payment::count(),
            'successful_payments' => Payment::whereIn('status', ['held', 'releasable', 'released'])->count(),
            'failed_payments' => Payment::where('status', 'failed')->count(),
            'pending_payments' => Payment::whereIn('status', ['pending', 'processing'])->count(),
            'held_payments' => Payment::where('status', 'held')->count(),
            'released_payments' => Payment::where('status', 'released')->count(),
            
            'total_revenue' => Payment::whereIn('status', ['held', 'releasable', 'released'])->sum('amount'),
            'total_commission' => Payment::whereIn('status', ['held', 'releasable', 'released'])->sum('platform_commission'),
            'total_provider_payout' => Payment::whereIn('status', ['held', 'releasable', 'released'])->sum('provider_amount'),
            
            'today_revenue' => Payment::whereIn('status', ['held', 'releasable', 'released'])
                ->whereDate('paid_at', today())
                ->sum('amount'),
            
            'monthly_revenue' => Payment::whereIn('status', ['held', 'releasable', 'released'])
                ->whereMonth('paid_at', now()->month)
                ->whereYear('paid_at', now()->year)
                ->sum('amount'),
            
            'released_this_month' => Payment::where('status', 'released')
                ->whereMonth('released_at', now()->month)
                ->whereYear('released_at', now()->year)
                ->sum('provider_amount'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get customer payment history by customer ID (for admin)
     */
    public function customerHistory($customerId)
    {
        $payments = Payment::where('customerID', $customerId)
            ->with(['booking', 'booking.provider'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $payments
        ]);
    }

    /**
     * Manual payment release (admin only - for disputes)
     */
    public function manualRelease(Request $request, $paymentId)
    {
        $request->validate([
            'reason' => 'required|string|max:500'
        ]);

        $payment = Payment::where('paymentID', $paymentId)
            ->where('status', 'held')
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found or not in held state'
            ], 404);
        }

        DB::transaction(function () use ($payment, $request) {
            $payment->status = 'releasable';
            $payment->meta_data = array_merge($payment->meta_data ?? [], [
                'manual_release' => [
                    'released_by' => auth()->id(),
                    'released_at' => now()->toDateTimeString(),
                    'reason' => $request->reason
                ]
            ]);
            $payment->save();

            $booking = Booking::find($payment->bookingID);
            if ($booking) {
                $booking->booking_status = 'completed';
                $booking->customer_confirmed_at = now();
                $booking->save();
            }

            $this->walletService->releasePayment($payment);
        });

        return response()->json([
            'success' => true,
            'message' => 'Payment released manually'
        ]);
    }

    /**
     * Refund payment (admin only)
     */
    public function refund(Request $request, $paymentId)
    {
        $request->validate([
            'reason' => 'required|string|max:500'
        ]);

        $payment = Payment::where('paymentID', $paymentId)
            ->whereIn('status', ['held', 'releasable', 'released'])
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found or cannot be refunded'
            ], 404);
        }

        DB::transaction(function () use ($payment, $request) {
            // If payment was already released, need to deduct from wallet
            if ($payment->status === 'released' && $payment->is_withdrawn === false) {
                // This would require deducting from wallet - complex
                // For now, just mark as refunded
            }

            $payment->status = 'refunded';
            $payment->refunded_at = now();
            $payment->meta_data = array_merge($payment->meta_data ?? [], [
                'refund' => [
                    'refunded_by' => auth()->id(),
                    'refunded_at' => now()->toDateTimeString(),
                    'reason' => $request->reason
                ]
            ]);
            $payment->save();

            // Update booking
            $booking = Booking::find($payment->bookingID);
            if ($booking) {
                $booking->booking_status = 'cancelled';
                $booking->save();
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Payment refunded successfully'
        ]);
    }
}