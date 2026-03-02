<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Payment;
use App\Models\Customer;
use App\Models\Booking;
use App\Services\NotificationService;
use Chapa\Chapa\Facades\Chapa as Chapa;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;        
use Illuminate\Support\Facades\Log; 
class PaymentController extends Controller
{
    /**
     * Initialize a payment transaction
     */
    public function initialize(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1',
            'customer_id' => 'required|exists:customers,customerID',
            'booking_id' => 'nullable|exists:bookings,bookingID',
            'customer_email' => 'required|email',
            'customer_first_name' => 'required|string|max:255',
            'customer_last_name' => 'required|string|max:255',
            'customer_phone' => 'nullable|string|regex:/^09[0-9]{8}$/',
            'payment_method' => 'nullable|string',
            'callback_url' => 'nullable|url',
            'return_url' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Generate unique transaction reference
            $tx_ref = 'chapa_' . Str::random(12) . '_' . time();
            
            // Prepare payment data
            $paymentData = [
                'amount' => $request->amount,
                'email' => $request->customer_email,
                'tx_ref' => $tx_ref,
                'currency' => 'ETB',
                'callback_url' => $request->callback_url ?? route('payment.callback', $tx_ref),
                'return_url' => $request->return_url ?? config('app.url') . '/payment/return/' . $tx_ref,
                'first_name' => $request->customer_first_name,
                'last_name' => $request->customer_last_name,
                'phone_number' => $request->customer_phone,
                'customization' => [
                    'title' => 'Home Service Payment',
                    'description' => 'Payment for home service booking'
                ],
                'meta' => [
                    'customer_id' => $request->customer_id,
                    'booking_id' => $request->booking_id,
                    'platform' => 'home_service_app'
                ]
            ];

            // Initialize payment with Chapa
            $payment = Chapa::initializePayment($paymentData);

            if ($payment['status'] !== 'success') {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment initialization failed',
                    'data' => $payment
                ], 400);
            }

            // Save payment record to database
            $paymentRecord = Payment::create([
                'tx_ref' => $tx_ref,
                'amount' => $request->amount,
                'currency' => 'ETB',
                'status' => 'pending',
                'payment_method' => $request->payment_method,
                'customer_email' => $request->customer_email,
                'customer_first_name' => $request->customer_first_name,
                'customer_last_name' => $request->customer_last_name,
                'customer_phone' => $request->customer_phone,
                'customer_id' => $request->customer_id,
                'booking_id' => $request->booking_id,
                'checkout_url' => $payment['data']['checkout_url'],
                'callback_url' => $paymentData['callback_url'],
                'return_url' => $paymentData['return_url'],
                'meta_data' => $paymentData['meta']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment initialized successfully',
                'data' => [
                    'payment_id' => $paymentRecord->id,
                    'tx_ref' => $tx_ref,
                    'checkout_url' => $payment['data']['checkout_url'],
                    'amount' => $request->amount,
                    'currency' => 'ETB'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payment initialization error: ' . $e->getMessage()
            ], 500);
        }
    }


/**
 * NEW METHOD: Initialize payment for a specific booking (after provider accepts)
 * This is the one we just created for the booking flow
 */
    public function initializeBookingPayment(Request $request, $bookingId)
    {
        $customer = $request->user(); // Authenticated customer

        try {
            DB::beginTransaction();

            // Get the booking
            $booking = Booking::where('bookingID', $bookingId)
                        ->where('customerID', $customer->customerID)
                        ->where('status', 'accepted')
                        ->first();

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found or not ready for payment'
                ], 404);
            }

            // Check if payment deadline passed
            if ($booking->payment_due_at < now()) {
                $booking->status = 'expired';
                $booking->save();
                
                return response()->json([
                    'success' => false,
                    'message' => 'Payment deadline has passed. Please create a new booking.'
                ], 400);
            }

            // Check if payment already exists
            $existingPayment = Payment::where('bookingID', $bookingId)
                                ->whereIn('status', ['pending', 'paid', 'released'])
                                ->first();

            if ($existingPayment) {
                return response()->json([
                    'success' => true,
                    'message' => 'Payment already initialized',
                    'data' => [
                        'paymentID' => $existingPayment->paymentID,
                        'checkout_url' => $existingPayment->checkout_url,
                        'status' => $existingPayment->status
                    ]
                ]);
            }

            // Generate unique transaction reference
            $tx_ref = 'CHAPA_' . Str::random(12) . '_' . time();

            // Prepare payment data for Chapa
            $paymentData = [
                'amount' => $booking->agreed_price,
                'email' => $customer->email,
                'tx_ref' => $tx_ref,
                'currency' => 'ETB',
                'callback_url' => route('payment.callback', $tx_ref),
                'return_url' => config('app.frontend_url') . '/payment/return/' . $tx_ref,
                'first_name' => $customer->fullname,
                'last_name' => '',
                'phone_number' => $customer->phone,
                'customization' => [
                    'title' => 'Home Service Payment',
                    'description' => 'Payment for booking #' . $booking->bookingID
                ],
                'meta' => [
                    'booking_id' => $booking->bookingID,
                    'customer_id' => $customer->customerID,
                    'provider_id' => $booking->providerID,
                    'platform' => 'home_service_app'
                ]
            ];

            // Initialize payment with Chapa
            $payment = Chapa::initializePayment($paymentData);

            if ($payment['status'] !== 'success') {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Payment initialization failed',
                    'data' => $payment
                ], 400);
            }

            // Create payment record
            $paymentRecord = Payment::create([
                'bookingID' => $booking->bookingID,
                'customerID' => $customer->customerID,
                'providerID' => $booking->providerID,
                'tx_ref' => $tx_ref,
                'chapa_tx_id' => null,
                'amount' => $booking->agreed_price,
                'platform_commission' => $booking->platform_commission,
                'provider_amount' => $booking->provider_payout,
                'currency' => 'ETB',
                'status' => 'pending',
                'checkout_url' => $payment['data']['checkout_url'],
                'callback_url' => $paymentData['callback_url'],
                'return_url' => $paymentData['return_url'],
                'customer_email' => $customer->email,
                'customer_first_name' => $customer->fullname,
                'customer_last_name' => '',
                'customer_phone' => $customer->phone,
                'meta_data' => $paymentData['meta'],
                'failure_reason' => null,
                'paid_at' => null,
                'released_at' => null,
                'refunded_at' => null
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment initialized successfully',
                'data' => [
                    'paymentID' => $paymentRecord->paymentID,
                    'tx_ref' => $tx_ref,
                    'checkout_url' => $payment['data']['checkout_url'],
                    'amount' => $booking->agreed_price,
                    'currency' => 'ETB',
                    'status' => 'pending',
                    'expires_at' => $booking->payment_due_at
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Payment initialization error:', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Payment initialization failed: ' . $e->getMessage()
            ], 500);
        }
    }

// ... (rest of your existing methods: verify, callback, show, customerHistory, index, getPaymentStats, cancel)

    /**
     * Verify a payment transaction
     */
    public function verify($tx_ref)
    {
        try {
            // Verify transaction with Chapa
            $verification = Chapa::verifyTransaction($tx_ref);

            if (!$verification || !isset($verification['status'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed'
                ], 400);
            }

            // Update payment record
            $payment = Payment::where('tx_ref', $tx_ref)->first();
            
            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment record not found'
                ], 404);
            }

            // Update payment status based on verification
            $payment->status = $verification['status'] === 'success' ? 'success' : 'failed';
            $payment->chapa_tx_id = $verification['data']['tx_ref'] ?? null;
            $payment->payment_method = $verification['data']['payment_method'] ?? null;
            
            if ($verification['status'] !== 'success') {
                $payment->failure_reason = $verification['message'] ?? 'Payment failed';
            }

            $payment->save();

            // If payment is successful and linked to a booking, update booking status
            if ($payment->status === 'success' && $payment->booking_id) {
                $booking = Booking::find($payment->booking_id);
                if ($booking) {
                    $booking->status = 'paid';
                    $booking->save();
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Payment verified successfully',
                'data' => [
                    'payment_id' => $payment->id,
                    'tx_ref' => $tx_ref,
                    'status' => $payment->status,
                    'amount' => $payment->amount,
                    'currency' => $payment->currency,
                    'payment_method' => $payment->payment_method,
                    'verified_at' => now()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payment verification error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle payment callback from Chapa
     */
    public function callback(Request $request, $tx_ref)
    {
        try {
            // Get callback data from Chapa
            $callbackData = $request->only(['trx_ref', 'ref_id', 'status']);

            // Find payment record
            $payment = Payment::where('tx_ref', $tx_ref)->first();
            
            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment record not found'
                ], 404);
            }

            // Update payment status
            $payment->status = $callbackData['status'] === 'success' ? 'success' : 'failed';
            $payment->chapa_tx_id = $callbackData['ref_id'] ?? null;
            $payment->save();

            // If payment is successful, verify with Chapa API for complete details
            if ($callbackData['status'] === 'success') {
                $this->verify($tx_ref);
            }

            // Redirect to return URL with status
            $returnUrl = $payment->return_url . '?status=' . $callbackData['status'] . '&tx_ref=' . $tx_ref;
            return redirect($returnUrl);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Callback processing error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment details
     */
    public function show($tx_ref)
    {
        $payment = Payment::where('tx_ref', $tx_ref)
            ->with(['customer', 'booking'])
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $payment
        ]);
    }

    /**
     * Get customer payment history
     */
    public function customerHistory($customer_id)
    {
        $payments = Payment::where('customer_id', $customer_id)
            ->orderBy('created_at', 'desc')
            ->with(['booking'])
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $payments
        ]);
    }

    /**
     * Get all payments (admin only)
     */
    public function index(Request $request)
    {
        $query = Payment::with(['customer', 'booking']);

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

        // Filter by payment method
        if ($request->has('payment_method')) {
            $query->where('payment_method', $request->payment_method);
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
            'successful_payments' => Payment::where('status', 'success')->count(),
            'failed_payments' => Payment::where('status', 'failed')->count(),
            'pending_payments' => Payment::where('status', 'pending')->count(),
            'total_revenue' => Payment::where('status', 'success')->sum('amount'),
            'today_revenue' => Payment::where('status', 'success')
                ->whereDate('created_at', today())
                ->sum('amount'),
            'monthly_revenue' => Payment::where('status', 'success')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('amount'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Cancel a pending payment
     */
    public function cancel($tx_ref)
    {
        $payment = Payment::where('tx_ref', $tx_ref)
            ->where('status', 'pending')
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found or cannot be cancelled'
            ], 404);
        }

        $payment->status = 'cancelled';
        $payment->failure_reason = 'Cancelled by user';
        $payment->save();

        return response()->json([
            'success' => true,
            'message' => 'Payment cancelled successfully'
        ]);
    }


}
