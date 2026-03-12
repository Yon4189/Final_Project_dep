<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Withdrawal;
use App\Models\ServiceProvider;
use Illuminate\Support\Str;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class WithdrawalController extends Controller
{
    protected $notificationService;

    public function __construct(\App\Services\NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Create a withdrawal request
     */
    public function create(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'provider_id' => 'required|exists:service_providers,providerID',
            'amount' => 'required|numeric|min:50', // Minimum withdrawal amount
            'bank_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:255',
            'account_holder_name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $provider = ServiceProvider::find($request->provider_id);
            
            // Check if provider has sufficient balance
            if ($provider->total_earned < $request->amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient balance. Available balance: ' . $provider->total_earned . ' ETB'
                ], 400);
            }

            // Calculate platform fee (e.g., 5%)
            $platformFeeRate = config('payment.platform_fee_rate', 0.05); // 5% default
            $platformFee = $request->amount * $platformFeeRate;
            $netAmount = $request->amount - $platformFee;

            // Generate unique withdrawal reference
            $withdrawalRef = 'WDR_' . Str::random(8) . '_' . time();

            // Create withdrawal record
            $withdrawal = Withdrawal::create([
                'withdrawal_ref' => $withdrawalRef,
                'amount' => $request->amount,
                'currency' => 'ETB',
                'status' => 'pending',
                'provider_id' => $request->provider_id,
                'provider_bank_name' => $request->bank_name,
                'provider_account_number' => $request->account_number,
                'provider_account_holder_name' => $request->account_holder_name,
                'platform_fee' => $platformFee,
                'net_amount' => $netAmount,
            ]);

            // Notify admins about withdrawal request
            $this->notificationService->toAdmins(
                \App\Services\NotificationService::TYPE_WITHDRAWAL_REQUEST,
                'New Withdrawal Request',
                "Provider {$provider->fullname} has requested a withdrawal of {$withdrawal->amount} ETB.",
                [
                    'withdrawal_id' => $withdrawal->withdrawalID,
                    'provider_name' => $provider->fullname,
                    'amount' => $withdrawal->amount
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Withdrawal request created successfully',
                'data' => [
                    'withdrawal_id' => $withdrawal->id,
                    'withdrawal_ref' => $withdrawalRef,
                    'amount' => $request->amount,
                    'platform_fee' => $platformFee,
                    'net_amount' => $netAmount,
                    'status' => 'pending',
                    'estimated_processing_time' => '24-48 hours'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Withdrawal creation error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process withdrawal (transfer to provider bank account)
     */
    public function process($withdrawal_id)
    {
        try {
            $withdrawal = Withdrawal::find($withdrawal_id);
            
            if (!$withdrawal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Withdrawal not found'
                ], 404);
            }

            if ($withdrawal->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Withdrawal cannot be processed. Current status: ' . $withdrawal->status
                ], 400);
            }

            // Update status to processing
            $withdrawal->status = 'processing';
            $withdrawal->processed_at = now();
            $withdrawal->save();

            // Initiate transfer using Chapa API
            $transferResult = $this->initiateBankTransfer($withdrawal);

            if ($transferResult['success']) {
                $withdrawal->chapa_transfer_id = $transferResult['transfer_id'];
                $withdrawal->chapa_transfer_status = $transferResult['status'];
                $withdrawal->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Withdrawal processing initiated',
                    'data' => [
                        'withdrawal_ref' => $withdrawal->withdrawal_ref,
                        'chapa_transfer_id' => $transferResult['transfer_id'],
                        'status' => 'processing'
                    ]
                ]);
            } else {
                // Mark as failed if transfer initiation fails
                $withdrawal->status = 'failed';
                $withdrawal->failure_reason = $transferResult['message'];
                $withdrawal->save();

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to initiate transfer: ' . $transferResult['message']
                ], 400);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Withdrawal processing error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Initiate bank transfer using Chapa API
     */
    private function initiateBankTransfer(Withdrawal $withdrawal)
    {
        try {
            $client = new Client();
            $secretKey = config('services.chapa.secret_key');

            $transferData = [
                'account_number' => $withdrawal->provider_account_number,
                'account_name' => $withdrawal->provider_account_holder_name,
                'bank_code' => $this->getBankCode($withdrawal->provider_bank_name),
                'amount' => $withdrawal->net_amount,
                'currency' => $withdrawal->currency,
                'reference' => $withdrawal->withdrawal_ref,
                'reason' => 'Home Service Provider Withdrawal'
            ];

            $response = $client->post('https://api.chapa.co/v1/transfers', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $secretKey,
                    'Content-Type' => 'application/json'
                ],
                'json' => $transferData
            ]);

            $responseData = json_decode($response->getBody()->getContents(), true);

            if ($responseData['status'] === 'success') {
                return [
                    'success' => true,
                    'transfer_id' => $responseData['data']['transfer_id'],
                    'status' => $responseData['data']['status']
                ];
            } else {
                return [
                    'success' => false,
                    'message' => $responseData['message'] ?? 'Transfer initiation failed'
                ];
            }

        } catch (\Exception $e) {
            Log::error('Chapa transfer error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Transfer initiation error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get bank code from bank name (simplified mapping)
     */
    private function getBankCode($bankName)
    {
        $bankCodes = [
            'Commercial Bank of Ethiopia' => 'CBE',
            'Awash Bank' => 'AWASH',
            'Dashen Bank' => 'DASHEN',
            'Wegagen Bank' => 'WEGAGEN',
            'Nib International Bank' => 'NIB',
            'United Bank' => 'UB',
            'Abay Bank' => 'ABAY',
            'Buna Bank' => 'BUNA',
            'Cooperative Bank of Oromia' => 'COOP',
            'Berhan Bank' => 'BERHAN',
            'Hibret Bank' => 'HIBRET',
            'Lemmi Bank' => 'LEMMI',
            'Omo Microfinance' => 'OMO',
            'Amhara Bank' => 'AMHARA',
            'Goh Bet Bank' => 'GOHBET',
            'Rimini Bank' => 'RIMINI',
            'Siddis Bank' => 'SIDDIS',
            'Tsehay Bank' => 'TSEHAY',
            'Zemen Bank' => 'ZEMEN'
        ];

        return $bankCodes[$bankName] ?? 'CBE'; // Default to CBE if not found
    }

    /**
     * Check withdrawal status
     */
    public function status($withdrawal_ref)
    {
        $withdrawal = Withdrawal::where('withdrawal_ref', $withdrawal_ref)
            ->with('provider')
            ->first();

        if (!$withdrawal) {
            return response()->json([
                'success' => false,
                'message' => 'Withdrawal not found'
            ], 404);
        }

        // If withdrawal is processing, check status with Chapa
        if ($withdrawal->status === 'processing' && $withdrawal->chapa_transfer_id) {
            $this->checkTransferStatus($withdrawal);
        }

        return response()->json([
            'success' => true,
            'data' => $withdrawal
        ]);
    }

    /**
     * Check transfer status with Chapa API
     */
    private function checkTransferStatus(Withdrawal $withdrawal)
    {
        try {
            $client = new Client();
            $secretKey = config('services.chapa.secret_key');

            $response = $client->get("https://api.chapa.co/v1/transfers/{$withdrawal->chapa_transfer_id}", [
                'headers' => [
                    'Authorization' => 'Bearer ' . $secretKey,
                    'Content-Type' => 'application/json'
                ]
            ]);

            $responseData = json_decode($response->getBody()->getContents(), true);

            if (isset($responseData['data']['status'])) {
                $withdrawal->chapa_transfer_status = $responseData['data']['status'];
                
                // Update withdrawal status based on transfer status
                switch ($responseData['data']['status']) {
                    case 'successful':
                        $withdrawal->status = 'completed';
                        $withdrawal->completed_at = now();
                        // Update provider's total earned
                        $provider = $withdrawal->provider;
                        if ($provider) {
                            $provider->total_earned -= $withdrawal->amount;
                            $provider->save();
                        }
                        break;
                    case 'failed':
                        $withdrawal->status = 'failed';
                        $withdrawal->failure_reason = $responseData['message'] ?? 'Transfer failed';
                        break;
                }
                
                $withdrawal->save();
            }

        } catch (\Exception $e) {
            Log::error('Transfer status check error: ' . $e->getMessage());
        }
    }

    /**
     * Get provider withdrawal history
     */
    public function providerHistory($provider_id)
    {
        $withdrawals = Withdrawal::where('provider_id', $provider_id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $withdrawals
        ]);
    }

    /**
     * Get all withdrawals (admin only)
     */
    public function index(Request $request)
    {
        $query = Withdrawal::with('provider');

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

        $withdrawals = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $withdrawals
        ]);
    }

    /**
     * Cancel withdrawal (admin only)
     */
    public function cancel($withdrawal_id)
    {
        $withdrawal = Withdrawal::find($withdrawal_id);

        if (!$withdrawal) {
            return response()->json([
                'success' => false,
                'message' => 'Withdrawal not found'
            ], 404);
        }

        if ($withdrawal->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending withdrawals can be cancelled'
            ], 400);
        }

        $withdrawal->status = 'cancelled';
        $withdrawal->failure_reason = 'Cancelled by admin';
        $withdrawal->save();

        return response()->json([
            'success' => true,
            'message' => 'Withdrawal cancelled successfully'
        ]);
    }

    /**
     * Get withdrawal statistics (admin only)
     */
    public function getWithdrawalStats()
    {
        $stats = [
            'total_withdrawals' => Withdrawal::count(),
            'pending_withdrawals' => Withdrawal::where('status', 'pending')->count(),
            'processing_withdrawals' => Withdrawal::where('status', 'processing')->count(),
            'completed_withdrawals' => Withdrawal::where('status', 'completed')->count(),
            'failed_withdrawals' => Withdrawal::where('status', 'failed')->count(),
            'total_withdrawn_amount' => Withdrawal::where('status', 'completed')->sum('amount'),
            'total_platform_fees' => Withdrawal::where('status', 'completed')->sum('platform_fee'),
            'today_withdrawals' => Withdrawal::whereDate('created_at', today())->count(),
            'monthly_withdrawals' => Withdrawal::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
}
