<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use App\Services\ChapaService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\Http;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

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
     * Get available payment methods
     */
    public function methods()
    {
        return response()->json([
            'success' => true,
            'data' => [
                [
                    'id' => 'chapa',
                    'type' => 'chapa',
                    'name' => 'Chapa (Card/Mobile Money)',
                    'description' => 'Pay securely with Chapa',
                    'icon' => 'card-outline',
                    'enabled' => true
                ]
            ]
        ]);
    }

    /**
     * Initialize payment
     */
    public function initialize(Request $request, $bookingId)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $booking = Booking::where('bookingID', $bookingId)
            ->where('customerID', $customer->customerID)
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found'
            ], 404);
        }

        // ── IDEMPOTENCY CHECK ──────────────────────────────────────────────────
        // If a pending payment already exists for this booking+type, return it
        // instead of creating a duplicate. Prevents double-charges on retry taps.
        $paymentType = ($booking->payment_status === 'pending_final' || $booking->payment_status === 'deposit_paid')
            ? 'final'
            : 'deposit';

        $existingPayment = Payment::where('bookingID', $bookingId)
            ->where('payment_type', $paymentType)
            ->where('status', 'pending')
            ->whereNotNull('checkout_url')
            ->where('created_at', '>=', now()->subMinutes(30)) // only reuse if < 30 min old
            ->first();

        if ($existingPayment) {
            Log::info('Returning existing pending payment (idempotency)', [
                'payment_id' => $existingPayment->paymentID,
                'tx_ref'     => $existingPayment->tx_ref,
                'booking_id' => $bookingId,
            ]);
            return response()->json([
                'success' => true,
                'data' => [
                    'checkout_url' => $existingPayment->checkout_url,
                    'tx_ref'       => $existingPayment->tx_ref,
                ]
            ]);
        }
        // ── END IDEMPOTENCY CHECK ───────────────────────────────────────────────

        // Generate tx_ref
        $txRef = 'BOOKING-' . $bookingId . '-' . time();

        // Encode mobile deep link
        $appRedirect = $request->return_url ?? 'mobileapp://payment';
        $encoded = base64_encode($appRedirect);
        $safe = str_replace(['+', '/', '='], ['-', '_', ''], $encoded);

        $baseUrl = $request->getSchemeAndHttpHost();

        // MAIN FIX: ALWAYS INCLUDE tx_ref
        $backendReturnUrl = $baseUrl . '/api/payment/return/' . $safe . '?tx_ref=' . $txRef;

        // Determine payment type based on booking payment_status
        $agreedPrice = (float)$booking->agreed_price;

        if ($paymentType === 'final') {
            $totalAmount = $agreedPrice * 0.80;
        } else {
            $totalAmount = $agreedPrice * 0.20;
        }
        
        // Commission Calculation (10% of payment amount)
        $commission = $totalAmount * 0.10;
        $providerAmount = $totalAmount - $commission;

        // Split Name
        $nameParts = explode(' ', trim($customer->fullname), 2);
        $firstName = $nameParts[0] ?? $customer->fullname ?? 'Customer';
        $lastName = $nameParts[1] ?? 'User';

        // Save payment
        $payment = Payment::create([
            'tx_ref' => $txRef,
            'bookingID' => $booking->bookingID,
            'customerID' => $customer->customerID,
            'providerID' => $booking->providerID,
            'amount' => $totalAmount,
            'platform_commission' => $commission,
            'provider_amount' => $providerAmount,
            'status' => 'pending',
            'currency' => 'ETB',
            'payment_type' => $paymentType, // Add payment_type field

            // FIXED
            'return_url' => $backendReturnUrl,
            'callback_url' => route('payment.callback', ['tx_ref' => $txRef]),

            'customer_email' => $customer->email,
            'customer_first_name' => $firstName,
            'customer_last_name' => $lastName,
        ]);

        // Chapa request
        $paymentData = [
            'amount' => (string)$totalAmount, // Use calculated amount (20% or 80%)
            'currency' => 'ETB',
            'email' => $customer->email,
            'first_name' => $customer->fullname,
            'tx_ref' => $txRef,
            'callback_url' => route('payment.callback', ['tx_ref' => $txRef]),
            'return_url' => $backendReturnUrl,
        ];

        Log::info('Chapa initialization intent', $paymentData);

        $response = $this->chapaService->initializePayment($paymentData);

        if ($response['status'] !== 'success') {
            return response()->json([
                'success' => false,
                'message' => 'Payment init failed'
            ], 400);
        }

        $payment->checkout_url = $response['data']['data']['checkout_url'];
        $payment->save();

        return response()->json([
            'success' => true,
            'data' => [
                'checkout_url' => $payment->checkout_url,
                'tx_ref' => $txRef
            ]
        ]);
    }

    /**
     * Handle return from Chapa
     */
    public function handleReturn(Request $request, $encoded_redirect = null)
    {
        Log::info('RETURN HIT', [
            'full_url' => $request->fullUrl(),
            'query' => $request->all()
        ]);

        // Decode app deep link
        $appRedirect = 'mobileapp://payment';

        if ($encoded_redirect) {
            $base64 = str_replace(['-', '_'], ['+', '/'], $encoded_redirect);
            $padding = strlen($base64) % 4;
            if ($padding > 0) {
                $base64 .= str_repeat('=', 4 - $padding);
            }
            $appRedirect = base64_decode($base64);
        }

        // Extract tx_ref (STRONG VERSION)
        $txRef = $request->query('tx_ref') ?? $request->query('trx_ref') ?? '';

        // FALLBACK (CRITICAL)
        if (!$txRef) {
            $url = $request->fullUrl();
            if (preg_match('/BOOKING-[A-Za-z0-9\-]+/', $url, $match)) {
                $txRef = $match[0];
                Log::info('Recovered tx_ref via regex', ['tx_ref' => $txRef]);
            }
        }

        $status = $request->query('status', '');

        // Check DB if needed
        if ($txRef && $status !== 'success') {
            $payment = Payment::where('tx_ref', $txRef)->first();
            if ($payment && in_array($payment->status, ['held', 'paid', 'releasable', 'released'])) {
                $status = 'success';
            }
        }

        // Build redirect URL
        $redirectUrl = $appRedirect;

        if ($txRef) {
            $separator = str_contains($redirectUrl, '?') ? '&' : '?';
            $redirectUrl .= "{$separator}tx_ref={$txRef}&status={$status}";
        }

        Log::info('FINAL REDIRECT', [
            'tx_ref' => $txRef,
            'status' => $status,
            'redirect' => $redirectUrl
        ]);

        // Return HTML redirect (reliable for mobile)
        return response("
        <html>
            <head>
                <meta http-equiv='refresh' content='0;url={$redirectUrl}'>
            </head>
            <body>
                <a href='{$redirectUrl}'>Return to app</a>
                <script>
                    window.location.href = '{$redirectUrl}';
                </script>
            </body>
        </html>
        ");
    }

    /**
     * Handle Chapa webhook/callback (tx_ref is the key)
     */
    public function callback(Request $request)
    {
        // Get the raw payload from Chapa
        $payload = $request->all();
        
        Log::info('Chapa webhook received', ['payload' => $payload]);
        
        // Get transaction reference from payload (Chapa sends 'trx_ref')
        $tx_ref = $payload['trx_ref'] ?? $payload['tx_ref'] ?? null;
        
        if (!$tx_ref) {
            Log::error('No transaction reference in Chapa webhook/callback', ['payload' => $payload]);
            return response()->json(['success' => false, 'message' => 'No transaction reference'], 400);
        }
        
        // Find payment by tx_ref
        $payment = Payment::where('tx_ref', $tx_ref)->first();
        
        if (!$payment) {
            Log::error('Payment not found', ['tx_ref' => $tx_ref]);
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }
        
        // Check if payment was successful
        $status = $payload['status'] ?? '';
        
        if ($status === 'success') {
            try {
                DB::transaction(function () use ($payment, $payload) {
                    // Lock the payment row to prevent race conditions
                    $lockedPayment = Payment::where('paymentID', $payment->paymentID)
                        ->lockForUpdate()
                        ->first();
                    
                    // Check again after lock - prevent duplicate processing
                    if (in_array($lockedPayment->status, ['held', 'paid', 'releasable', 'released'])) {
                        Log::info('Payment already processed (after lock), skipping', [
                            'payment_id' => $lockedPayment->paymentID,
                            'status' => $lockedPayment->status
                        ]);
                        return;
                    }
                    
                    $this->walletService->handlePaymentSuccess($lockedPayment, $payload);
                    
                    Log::info('Payment processed via callback (webhook)', [
                        'payment_id' => $lockedPayment->paymentID,
                        'tx_ref' => $lockedPayment->tx_ref
                    ]);
                });
                
                return response()->json(['success' => true, 'message' => 'Webhook processed successfully']);
                
            } catch (\Exception $e) {
                Log::error('Webhook processing failed', [
                    'tx_ref' => $tx_ref,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json(['success' => false, 'message' => 'Processing failed'], 500);
            }
        }
        
        // Handle failed payment
        Log::warning('Payment not successful in webhook', ['status' => $status, 'tx_ref' => $tx_ref]);
        return response()->json(['success' => false, 'message' => 'Payment not successful'], 400);
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
        
        // Fallback: If status is still pending (e.g. webhook failed or was delayed), verify directly with Chapa
        if ($payment->status === 'pending') {
            $chapaResponse = $this->chapaService->verifyPayment($payment->tx_ref);
            
            if ($chapaResponse['status'] === 'success' && isset($chapaResponse['data']['status']) && $chapaResponse['data']['status'] === 'success') {
                $this->walletService->handlePaymentSuccess($payment, $chapaResponse['data']);
                
                // Refresh payment after update
                $payment->refresh();
            }
        }
        
        $isSuccess = in_array($payment->status, ['held', 'paid', 'releasable', 'released']);

        return response()->json([
            'success' => $isSuccess,
            'message' => $isSuccess ? 'Payment verified successfully' : 'Payment is still pending or failed',
            'data' => [
                'payment_id' => $payment->paymentID,
                'tx_ref' => $payment->tx_ref,
                'status' => $payment->status,
                'amount' => $payment->amount,
                'booking_id' => $payment->bookingID,
                'booking_status' => $payment->booking->status ?? null,
                'paid_at' => $payment->paid_at,
                'is_successful' => $isSuccess
            ]
        ]);
    }

    /**
     * Customer confirms work completed
     * This marks the service as confirmed and prompts customer to pay the final 80%
     */
    public function confirmCompletion(Request $request, $bookingId)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            Log::error('Confirmation failed: Customer not authenticated');
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }
        
        $booking = Booking::where('bookingID', $bookingId)
            ->where('customerID', $customer->customerID)
            ->where('status', 'waiting_customer_confirmation')
            ->first();

        if (!$booking) {
            Log::error('Confirmation failed: Booking not found', [
                'booking_id' => $bookingId,
                'customer_id' => $customer->customerID,
                'booking_exists' => Booking::where('bookingID', $bookingId)->exists(),
                'booking_status' => Booking::where('bookingID', $bookingId)->value('status')
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Booking not found or not awaiting confirmation'
            ], 404);
        }

        try {
            // Update booking to service_confirmed status
            // Customer will then be prompted to pay the final 80%
            $booking->status = 'service_confirmed';
            $booking->payment_status = 'pending_final';
            $booking->service_confirmed_at = now();
            $booking->payment_deadline = now()->addHours(48); // 48 hours to pay final amount
            $booking->save();
            
            Log::info('Service confirmed - Customer needs to pay final amount', [
                'booking_id' => $bookingId,
                'payment_deadline' => $booking->payment_deadline
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Service confirmed successfully. Please proceed to pay the remaining amount.',
                'data' => [
                    'booking_id' => $booking->bookingID,
                    'status' => 'service_confirmed',
                    'payment_status' => 'pending_final',
                    'payment_deadline' => $booking->payment_deadline,
                    'requires_final_payment' => true
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Service confirmation failed', [
                'booking_id' => $bookingId,
                'customer_id' => $customer->customerID,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to confirm service. Please try again.'
            ], 500);
        }
    }

    /**
     * Get customer payment history
     */
    public function history(Request $request)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }
        
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
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }
        
        $payment = Payment::where('tx_ref', $tx_ref)
            ->whereIn('status', ['pending', 'processing'])
            ->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found or cannot be cancelled'
            ], 404);
        }

        if ($customer->customerID !== $payment->customerID) {
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
        $query = Payment::with(['customer', 'booking', 'provider']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = $request->input('per_page', 10);
        $payments = $query->orderBy('created_at', 'desc')->paginate($perPage);

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
            'platform_revenue' => Payment::whereIn('status', ['held', 'releasable', 'released'])->sum('platform_commission'),
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
     * Manual payment release (admin only)
     */
    public function manualRelease(Request $request, $paymentId)
    {
        $request->validate(['reason' => 'required|string|max:500']);

        $payment = Payment::where('paymentID', $paymentId)
            ->where('status', 'held')
            ->first();

        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }

        try {
            DB::transaction(function () use ($payment, $request) {
                $payment->status = 'releasable';
                $payment->save();

                $booking = Booking::find($payment->bookingID);
                if ($booking) {
                    $booking->status = 'completed';
                    $booking->customer_confirmed_at = now();
                    $booking->save();
                }

                // Use WalletService instead of duplicate logic
                $this->walletService->releasePayment($payment);
            });

            return response()->json(['success' => true, 'message' => 'Payment released manually']);
        } catch (\Exception $e) {
            Log::error('Manual payment release failed', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to release payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Refund payment (admin only)
     */
    public function refund(Request $request, $paymentId)
    {
        $request->validate(['reason' => 'required|string|max:500']);

        $payment = Payment::where('paymentID', $paymentId)
            ->whereIn('status', ['held', 'releasable', 'released'])
            ->first();

        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }

        DB::transaction(function () use ($payment, $request) {
            $payment->status = 'refunded';
            $payment->refunded_at = now();
            $payment->save();

            $booking = Booking::find($payment->bookingID);
            if ($booking) {
                $booking->status = 'cancelled';
                $booking->save();
            }
        });

        return response()->json(['success' => true, 'message' => 'Payment refunded successfully']);
    }

    /**
     * Get list of banks from Chapa
     */
    public function getBanks()
    {
        $client = new Client();
        try {
            $response = $client->get('https://api.chapa.co/v1/banks', [
                'headers' => [
                    'Authorization' => 'Bearer ' . config('services.chapa.secret_key'),
                    'Accept' => 'application/json',
                ]
            ]);

            $data = json_decode($response->getBody(), true);
            return response()->json(['success' => true, 'data' => $data]);
        } catch (RequestException $e) {
            return response()->json(['success' => false, 'message' => 'Failed to fetch banks'], 500);
        }
    }

    /**
     * Initiate a transfer for withdrawal (called by AdminWithdrawalController)
     * 
     * @param \App\Models\Withdrawal $withdrawal
     * @return array|null
     */
    public function initiateTransfer($withdrawal)
    {
        $transferData = [
            'account_name' => $withdrawal->provider_account_holder_name,
            'account_number' => $withdrawal->provider_account_number,
            'amount' => (string)$withdrawal->amount,
            'currency' => 'ETB',
            'reference' => 'WITHDRAWAL-' . $withdrawal->withdrawalID . '-' . time(),
            'bank_code' => $withdrawal->provider_bank_name, // Assuming this is the bank code
        ];

        Log::info('Initiating Chapa Transfer', $transferData);

        $response = $this->chapaService->initiateTransfer($transferData);

        if ($response['status'] === 'success') {
            // Chapa returns transfer ID in response
            // Adjust based on actual Chapa response structure
            return [
                'success' => true,
                'data' => $response['data']['data']['id'] ?? $response['data']['id'] ?? null
            ];
        }

        return null;
    }

    /**
     * Calculate deposit amount for a booking
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function calculateDeposit(Request $request)
    {
        $request->validate([
            'booking_id' => 'required|integer|exists:bookings,bookingID',
            'agreed_price' => 'required|numeric|min:10|max:500000'
        ]);
        
        $paymentService = app(\App\Services\PaymentService::class);
        
        $calculation = $paymentService->calculateDepositAmount($request->agreed_price);
        
        return response()->json([
            'success' => true,
            'data' => $calculation
        ]);
    }

    /**
     * Process deposit payment
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function processDeposit(Request $request)
    {
        $request->validate([
            'booking_id' => 'required|integer|exists:bookings,bookingID',
            'amount' => 'required|numeric|min:0'
        ]);
        
        try {
            $paymentService = app(\App\Services\PaymentService::class);
            
            $payment = $paymentService->processDepositPayment(
                $request->booking_id,
                $request->amount
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Deposit payment initialized successfully',
                'data' => [
                    'payment_id' => $payment->paymentID,
                    'tx_ref' => $payment->tx_ref,
                    'checkout_url' => $payment->checkout_url,
                    'amount' => $payment->amount,
                    'payment_type' => $payment->payment_type
                ]
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
            
        } catch (\Exception $e) {
            Log::error('Deposit payment processing failed', [
                'booking_id' => $request->booking_id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to process deposit payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process final payment
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function processFinal(Request $request)
    {
        $request->validate([
            'booking_id' => 'required|integer|exists:bookings,bookingID',
            'amount' => 'required|numeric|min:0'
        ]);
        
        try {
            $paymentService = app(\App\Services\PaymentService::class);
            
            $payment = $paymentService->processFinalPayment(
                $request->booking_id,
                $request->amount
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Final payment initialized successfully',
                'data' => [
                    'payment_id' => $payment->paymentID,
                    'tx_ref' => $payment->tx_ref,
                    'checkout_url' => $payment->checkout_url,
                    'amount' => $payment->amount,
                    'payment_type' => $payment->payment_type
                ]
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
            
        } catch (\Exception $e) {
            Log::error('Final payment processing failed', [
                'booking_id' => $request->booking_id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to process final payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment status for a booking
     * 
     * @param int $bookingId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPaymentStatus($bookingId)
    {
        try {
            $booking = Booking::with(['depositPayment', 'finalPayment'])->findOrFail($bookingId);
            
            $depositPayment = $booking->depositPayment;
            $finalPayment = $booking->finalPayment;
            
            return response()->json([
                'success' => true,
                'data' => [
                    'booking_id' => $booking->bookingID,
                    'payment_status' => $booking->payment_status,
                    'agreed_price' => $booking->agreed_price,
                    'deposit_payment' => $depositPayment ? [
                        'payment_id' => $depositPayment->paymentID,
                        'amount' => $depositPayment->amount,
                        'status' => $depositPayment->payment_status,
                        'paid_at' => $depositPayment->paid_at
                    ] : null,
                    'final_payment' => $finalPayment ? [
                        'payment_id' => $finalPayment->paymentID,
                        'amount' => $finalPayment->amount,
                        'status' => $finalPayment->payment_status,
                        'paid_at' => $finalPayment->paid_at
                    ] : null,
                    'payment_deadline' => $booking->payment_deadline,
                    'service_confirmed_at' => $booking->service_confirmed_at
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get payment status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify payment callback from Chapa
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function verifyCallback(Request $request)
    {
        $request->validate([
            'tx_ref' => 'required|string'
        ]);
        
        try {
            $paymentService = app(\App\Services\PaymentService::class);
            
            $paymentService->verifyAndCompletePayment($request->tx_ref);
            
            return response()->json([
                'success' => true,
                'message' => 'Payment verified successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Payment verification failed', [
                'tx_ref' => $request->tx_ref,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Payment verification failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
