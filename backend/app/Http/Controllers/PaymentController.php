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
     * Initialize payment for booking
     */
    public function initialize(Request $request, $bookingId)
    {
        $customer = $request->user();
        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Not authenticated'
            ], 401);
        }
        
        $booking = Booking::where('bookingID', $bookingId)
            ->where('customerID', $customer->customerID)
            ->whereIn('status', ['pending', 'accepted'])
            ->first();
            
        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found or not ready for payment'
            ], 404);
        }
        
        // Check if payment already exists
        $existingPayment = Payment::where('bookingID', $booking->bookingID)
            ->whereIn('status', ['pending'])
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
        
        // Generate unique tx_ref
        $txRef = 'BOOKING-' . $bookingId . '-' . time() . '-' . uniqid();
        
        // Calculate commission (10%)
        $commission = $booking->agreed_price * 0.10;
        $providerAmount = $booking->agreed_price - $commission;
        
        // Create payment record in database
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
            'customer_email' => $customer->email,
            'customer_first_name' => $customer->fullname,
            'customer_last_name' => '', // or split fullname if needed
            'customer_phone' => $customer->phone ?? '',
            'meta_data' => json_encode([
                'booking_reference' => $booking->bookingID,
                'customer_name' => $customer->fullname,
                'customer_email' => $customer->email
            ])
        ]);
        
        // Prepare Chapa payment data
        $paymentData = [
            'amount' => (string) $booking->agreed_price,
            'currency' => 'ETB',
            'email' => $customer->email,
            'first_name' => $customer->fullname,
            'last_name' => '',
            'tx_ref' => $txRef,
            'callback_url' => 'https://squiggly-raven-concussant.ngrok-free.dev/api/webhook/chapa',
            // later replace the above url with the link from 'Forwarding' while ruiing ngrok online. if not installed install ngrok and run `ngrok http 8000` and copy the https url and paste it above and add /api/webhook/chapa at the end of the url
            'return_url' => $request->return_url ?? 'https://www.google.com',
            'customization' => [
                'title' => 'Home Service',  //  Short (max 16 chars)
                'description' => 'Payment for booking'  //  Short (max 30 chars)
            ]
        ];

        // Call Chapa API
        // Workaround: If keys are still placeholders, provide a mock response for testing navigation
        $chapaSecretKey = config('services.chapa.secret_key');
        if ($chapaSecretKey === 'your_chapa_secret_key_here' || empty($chapaSecretKey)) {
            Log::info('Using mock payment response for placeholder keys', ['tx_ref' => $txRef]);
            $chapaResponse = [
                'status' => 'success',
                'data' => [
                    'data' => [
                        'checkout_url' => 'https://mock-payment-url.com/pay/' . $txRef
                    ]
                ]
            ];
        } else {
            $chapaResponse = $this->chapaService->initializePayment($paymentData);
        }
        

        // Check if Chapa responded with error
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

        // Update payment with checkout URL from Chapa
        $payment->status = 'pending';
        $payment->checkout_url = $chapaResponse['data']['data']['checkout_url'];  // Adjust based on actual response structure
        $payment->save();

        // Log success
        Log::info('Payment initialized successfully', [
            'tx_ref' => $txRef,
            'booking_id' => $booking->bookingID
        ]);

        // Return success response
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
    }

    /**
     * Handle Chapa callback
     */
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
            Log::error('No transaction reference in webhook');
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
            DB::transaction(function () use ($payment, $payload) {
                // Update payment record
                $payment->status = 'held';
                $payment->chapa_tx_id = $payload['ref_id'] ?? null;
                $payment->paid_at = now();
                $payment->save();
                
                // Update booking record
                $booking = Booking::find($payment->bookingID);
                if ($booking) {
                    $booking->payment_status = 'held';
                    $booking->save();
                    
                    Log::info('Payment confirmed and booking updated', [
                        'booking_id' => $booking->bookingID,
                        'payment_id' => $payment->paymentID,
                        'tx_ref' => $payment->tx_ref
                    ]);
                }
            });
            
            return response()->json(['success' => true, 'message' => 'Webhook processed successfully']);
        }
        
        // Handle failed payment
        Log::warning('Payment not successful', ['status' => $status, 'tx_ref' => $tx_ref]);
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

        return response()->json([
            'success' => true,
            'data' => [
                'payment_id' => $payment->paymentID,
                'tx_ref' => $payment->tx_ref,
                'status' => $payment->status,
                'amount' => $payment->amount,
                'booking_id' => $payment->bookingID,
                'booking_status' => $payment->booking->status ?? null,
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
            ->where('status', 'waiting_customer_confirmation')
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found or not awaiting confirmation'
            ], 404);
        }

        DB::transaction(function () use ($booking) {
            $payment = Payment::where('bookingID', $booking->bookingID)->first();
            
            if (!$payment || $payment->status !== 'held') {
                throw new \Exception('Payment not in held state');
            }

            $payment->status = 'releasable';
            $payment->save();

            $booking->status = 'completed';
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
                    'released_by' => Auth::id(), // 👈 Change to Auth::id()
                    'released_at' => now()->toDateTimeString(),
                    'reason' => $request->reason
                ]
            ]);
            $payment->save();

            $booking = Booking::find($payment->bookingID);
            if ($booking) {
                $booking->status = 'completed';
                $booking->customer_confirmed_at = now();
                $booking->save();
            }

            // Call release method
            $this->releasePayment($payment); //  Call internal method instead
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
                    'refunded_by' => Auth::id(),
                    'refunded_at' => now()->toDateTimeString(),
                    'reason' => $request->reason
                ]
            ]);
            $payment->save();

            // Update booking
            $booking = Booking::find($payment->bookingID);
            if ($booking) {
                $booking->status = 'cancelled';
                $booking->save();
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Payment refunded successfully'
        ]);
    }

    /**
     * Release payment to provider wallet
     */
    protected function releasePayment($payment)
    {
        // Find provider's wallet
        $wallet = Wallet::firstOrCreate(
            ['providerID' => $payment->providerID],
            ['available_balance' => 0, 'pending_balance' => 0]
        );

        // Add to available balance
        $wallet->available_balance += $payment->provider_amount;
        $wallet->save();

        // Create transaction record
        WalletTransaction::create([
            'walletID' => $wallet->walletID,
            'type' => 'credit',
            'amount' => $payment->provider_amount,
            'description' => 'Payment released for booking #' . $payment->bookingID,
            'bookingID' => $payment->bookingID,
            'withdrawalID' => null
        ]);

        // Update payment status
        $payment->status = 'released';
        $payment->released_at = now();
        $payment->save();

        Log::info('Payment released', [
            'payment_id' => $payment->paymentID,
            'booking_id' => $payment->bookingID,
            'amount' => $payment->provider_amount
        ]);
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
        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    } catch (RequestException $e) {
        Log::error('Chapa banks error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch banks from Chapa'
        ], 500);
    }
}

/**
 * Initialize transfer to provider
 */
public function initiateTransfer($withdrawal)
{
    Log::info('initiateTransfer CALLED', ['withdrawal_id' => $withdrawal->withdrawalID]);
    $accountName = preg_replace('/[^\x20-\x7E]/', '', $withdrawal->provider_account_holder_name ?? 'User');
    $accountName = trim($accountName);

    // Ensure at least 3 characters
    if (strlen($accountName) < 3) {
        $accountName = 'User'; // Fallback
}
    // Validate required fields based on payment method
if ($withdrawal->payment_method === 'bank') {
    if (!$withdrawal->provider_account_number) {
        Log::error('Missing account number for bank transfer', ['withdrawal_id' => $withdrawal->withdrawalID]);
        return null;
    }
    if (!$withdrawal->provider_bank_name) {
        Log::error('Missing bank name', ['withdrawal_id' => $withdrawal->withdrawalID]);
        return null;
    }
    if (!$withdrawal->provider_account_holder_name) {
        Log::error('Missing account holder name', ['withdrawal_id' => $withdrawal->withdrawalID]);
        return null;
    }
    
    // Check if it's CBEBirr (mobile money)
    $bankName = $withdrawal->provider_bank_name;
    if ($bankName === 'Commercial Bank of Ethiopia' || $bankName === 'CBEBirr') {
        // CBEBirr uses phone number, not bank account
        $payload['phone_number'] = $withdrawal->provider_account_number; // Treat account_number as phone
        $payload['account_name'] = $accountName;
        $payload['bank_code'] = $this->getBankCode($bankName);
        Log::info('CBEBirr transfer detected', [
            'phone' => $withdrawal->provider_account_number,
            'bank_code' => $payload['bank_code']
        ]);
    } else {
        // Regular bank transfer
        $payload['account_name'] = $accountName;
        $payload['account_number'] = $withdrawal->provider_account_number;
        $payload['bank_code'] = $this->getBankCode($bankName);
    }
    
} elseif ($withdrawal->payment_method === 'telebir') {
    if (!$withdrawal->telebir_number) {
        Log::error('Missing telebir number', ['withdrawal_id' => $withdrawal->withdrawalID]);
        return null;
    }
    
    // Telebir transfer
    $payload['phone_number'] = $withdrawal->telebir_number;
    $payload['account_name'] = $withdrawal->telebir_holder_name ?? 'User';
    // No bank_code for telebir
}

    $client = new Client([
        'verify' => app()->environment('local') ? false : true,
    ]);
    
    $reference = 'TXF_' . uniqid() . '_' . time();

    // Clean the account name - remove non-English characters
    $accountName = preg_replace('/[^\x20-\x7E]/', '', $withdrawal->provider_account_holder_name ?? 'User');
    $accountName = trim($accountName);
    
    // Ensure at least 3 characters
    if (strlen($accountName) < 3) {
        $accountName = 'User'; // Fallback
    }

    $payload = [
        'amount' => (float) $withdrawal->amount,
        'currency' => $withdrawal->currency ?? 'ETB',
        'reference' => $reference,
    ];

    // Bank transfer
    if ($withdrawal->payment_method === 'bank') {
        $payload['account_name'] = $accountName;
        $payload['account_number'] = $withdrawal->provider_account_number;
        $payload['bank_code'] = $this->getBankCode($withdrawal->provider_bank_name);
    }
    // Telebir transfer
    elseif ($withdrawal->payment_method === 'telebir') {
        $payload['phone_number'] = $withdrawal->telebir_number;
        // Telebir might need account_name as well
        $payload['account_name'] = $accountName;
    }

    Log::info('Chapa transfer payload', $payload);

    try {
        $response = $client->post('https://api.chapa.co/v1/transfers', [
            'headers' => [
                'Authorization' => 'Bearer ' . config('services.chapa.secret_key'),
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
            'json' => $payload
        ]);

        $responseData = json_decode($response->getBody(), true);
        Log::info('Chapa transfer response', $responseData);

        if ($response->getStatusCode() === 200) {
            $withdrawal->chapa_transfer_id = $responseData['data']['transfer_id'] ?? null;
            $withdrawal->chapa_transfer_status = 'pending';
            $withdrawal->save();
            return $responseData;
        }

        Log::error('Chapa transfer failed', ['status' => $response->getStatusCode()]);
        return null;

    } catch (RequestException $e) {
        Log::error('Chapa transfer exception: ' . $e->getMessage());
        if ($e->hasResponse()) {
            $errorBody = $e->getResponse()->getBody()->getContents();
            Log::error('Chapa error response body: ' . $errorBody);
            
            $errorJson = json_decode($errorBody, true);
            if ($errorJson) {
                Log::error('Chapa error details', $errorJson);
            }
        }
        return null;
    }

    if ($response->getStatusCode() === 200) {
    $responseData = json_decode($response->getBody(), true);
    
    // The transfer ID is directly in 'data' as a string, not an array
    $withdrawal->chapa_transfer_id = $responseData['data'] ?? null;  // Changed this line
    $withdrawal->chapa_transfer_status = 'pending';
    $withdrawal->save();
    
    Log::info('Chapa transfer saved', [
        'withdrawal_id' => $withdrawal->withdrawalID,
        'chapa_transfer_id' => $withdrawal->chapa_transfer_id
    ]);
    
    return $responseData;
}

if ($response->getStatusCode() === 200) {
    $responseData = json_decode($response->getBody(), true);
    
    // The transfer ID is directly in 'data' as a string, not an array
    $withdrawal->chapa_transfer_id = $responseData['data'] ?? null;
    $withdrawal->chapa_transfer_status = 'pending';
    $withdrawal->save();
    
    Log::info('Chapa transfer saved', [
        'withdrawal_id' => $withdrawal->withdrawalID,
        'chapa_transfer_id' => $withdrawal->chapa_transfer_id,
        'response' => $responseData
    ]);
    
    return $responseData;
}
if ($response->getStatusCode() === 200) {
    $responseData = json_decode($response->getBody(), true);
    
    // Save the transfer ID (it's a string in 'data')
    $withdrawal->chapa_transfer_id = $responseData['data'] ?? null;
    $withdrawal->chapa_transfer_status = 'pending';
    $withdrawal->save();
    
    Log::info('Chapa transfer saved', [
        'withdrawal_id' => $withdrawal->withdrawalID,
        'chapa_transfer_id' => $withdrawal->chapa_transfer_id
    ]);
    
    return $responseData;
}
}

/**
 * Helper to get bank code from bank name
 */
private function getBankCode($bankName)
{
    $banks = [
        'Wegagen Bank' => 472,
        'Enat Bank' => 1,
        'Commercial Bank of Ethiopia' => 128,
        'CBEBirr' => 128,
        'telebirr' => 855,
        'M-Pesa' => 266,
        'Ahadu Bank' => 207,
        'Berhan Bank' => 571,
        'YaYaWallet' => 867,
    ];
    
    // For banks not in the list, log and return null
    if (!isset($banks[$bankName])) {
        Log::warning('Bank code not found', ['bank_name' => $bankName]);
        return null;
    }
    
    $code = $banks[$bankName];
    Log::info('Bank code mapping', ['bank_name' => $bankName, 'code' => $code]);
    return $code;
}

public function debugBankCodes()
{
    $client = new Client(['verify' => false]);
    $response = $client->get('https://api.chapa.co/v1/banks', [
        'headers' => [
            'Authorization' => 'Bearer ' . config('services.chapa.secret_key')
        ]
    ]);
    
    $data = json_decode($response->getBody(), true);
    Log::info('Chapa banks list:', $data);
    return $data;
}
}