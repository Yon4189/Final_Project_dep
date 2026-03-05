<?php
// app/Http/Controllers/WalletController.php

namespace App\Http\Controllers;

use App\Models\Wallet;
use App\Models\Payment;
use App\Models\Withdrawal;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class WalletController extends Controller
{
    protected $walletService;

    public function __construct(WalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    /**
     * Get provider wallet info (dashboard view)
     * GET /api/provider/wallet
     */
    public function dashboard(Request $request)
    {
        try {
            $provider = $request->user();
            $wallet = $provider->wallet;
            
            if (!$wallet) {
                $wallet = Wallet::create([
                    'providerID' => $provider->providerID,
                    'available_balance' => 0,
                    'pending_balance' => 0,
                ]);
            }
            
            // Get recent transactions
            $recentTransactions = $wallet->transactions()
                ->latest()
                ->limit(10)
                ->get();
            
            // Get pending withdrawals
            $pendingWithdrawals = Withdrawal::where('providerID', $provider->providerID)
                ->where('status', 'pending')
                ->get();
            
            // Get approved/rejected withdrawals for reference
            $recentWithdrawals = Withdrawal::where('providerID', $provider->providerID)
                ->whereIn('status', ['approved', 'rejected'])
                ->latest()
                ->limit(5)
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'wallet' => [
                        'walletID' => $wallet->walletID,
                        'available_balance' => (float) $wallet->available_balance,
                        'pending_balance' => (float) $wallet->pending_balance,
                        'total_balance' => (float) ($wallet->available_balance + $wallet->pending_balance),
                        'created_at' => $wallet->created_at,
                        'updated_at' => $wallet->updated_at
                    ],
                    'pending_withdrawals' => $pendingWithdrawals,
                    'recent_withdrawals' => $recentWithdrawals,
                    'recent_transactions' => $recentTransactions
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Wallet dashboard error: ' . $e->getMessage(), [
                'provider_id' => $request->user()->providerID ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load wallet data'
            ], 500);
        }
    }

    /**
     * Get wallet summary (simplified version for quick access)
     * GET /api/provider/wallet/summary
     */
    public function summary(Request $request)
    {
        try {
            $provider = $request->user();
            $wallet = $provider->wallet;
            
            if (!$wallet) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'available_balance' => 0,
                        'pending_balance' => 0,
                        'total_balance' => 0
                    ]
                ]);
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'available_balance' => (float) $wallet->available_balance,
                    'pending_balance' => (float) $wallet->pending_balance,
                    'total_balance' => (float) ($wallet->available_balance + $wallet->pending_balance)
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load wallet summary'
            ], 500);
        }
    }

    /**
     * Request withdrawal
     * POST /api/provider/withdrawals
     */
    public function requestWithdrawal(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:50', // Minimum 50 ETB
        ]);
        
        try {
            $provider = $request->user();
            $wallet = $provider->wallet;
            $amount = $request->amount;
            
            if (!$wallet) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet not found'
                ], 404);
            }
            
            if ($wallet->available_balance < $amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient balance',
                    'data' => [
                        'available_balance' => (float) $wallet->available_balance,
                        'requested' => (float) $amount
                    ]
                ], 422);
            }
            
            // Check if there's already a pending withdrawal
            $pendingExists = Withdrawal::where('providerID', $provider->providerID)
                ->where('status', 'pending')
                ->exists();
                
            if ($pendingExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a pending withdrawal request. Please wait for it to be processed.'
                ], 422);
            }
            
            // Declare variable outside the closure
            $withdrawal = null;
            
            DB::transaction(function () use ($wallet, $amount, $provider, &$withdrawal) {
                // Deduct from available balance
                $wallet->available_balance -= $amount;
                $wallet->save();
                
                // Create withdrawal record
                $withdrawal = Withdrawal::create([
                    'providerID' => $provider->providerID,
                    'amount' => $amount,
                    'status' => 'pending',
                    'processed_at' => null,
                    'admin_notes' => null
                ]);
                
                if (!$withdrawal) {
                    throw new \Exception('Failed to create withdrawal record');
                }
                
                // Create transaction record
                WalletTransaction::create([
                    'walletID' => $wallet->walletID,
                    'type' => 'debit',
                    'amount' => $amount,
                    'description' => 'Withdrawal request #' . $withdrawal->withdrawalID . ' (pending)',
                    'bookingID' => null,
                    'withdrawalID' => $withdrawal->withdrawalID
                ]);
            });
            
            if (!$withdrawal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to process withdrawal request'
                ], 500);
            }
            
            // TODO: Send notification to admin about new withdrawal request
            
            return response()->json([
                'success' => true,
                'message' => 'Withdrawal request submitted successfully',
                'data' => [
                    'withdrawal' => [
                        'withdrawalID' => $withdrawal->withdrawalID,
                        'amount' => (float) $withdrawal->amount,
                        'status' => $withdrawal->status,
                        'created_at' => $withdrawal->created_at
                    ],
                    'new_balance' => (float) $wallet->fresh()->available_balance
                ]
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Withdrawal request error: ' . $e->getMessage(), [
                'provider_id' => $request->user()->providerID ?? null,
                'amount' => $request->amount,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to process withdrawal request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get withdrawal history
     * GET /api/provider/withdrawals
     */
    public function withdrawals(Request $request)
    {
        try {
            $provider = $request->user();
            
            $withdrawals = Withdrawal::where('providerID', $provider->providerID)
                ->orderBy('created_at', 'desc')
                ->paginate(20);
            
            return response()->json([
                'success' => true,
                'data' => $withdrawals
            ]);
            
        } catch (\Exception $e) {
            Log::error('Withdrawal history error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load withdrawal history'
            ], 500);
        }
    }

    /**
     * Get single withdrawal details
     * GET /api/provider/withdrawals/{id}
     */
    public function showWithdrawal(Request $request, $id)
    {
        try {
            $provider = $request->user();
            
            $withdrawal = Withdrawal::where('withdrawalID', $id)
                ->where('providerID', $provider->providerID)
                ->first();
            
            if (!$withdrawal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Withdrawal not found'
                ], 404);
            }
            
            // Get associated transaction
            $transaction = WalletTransaction::where('withdrawalID', $withdrawal->withdrawalID)->first();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'withdrawal' => $withdrawal,
                    'transaction' => $transaction
                ]
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load withdrawal details'
            ], 500);
        }
    }

    /**
     * Get transaction history
     * GET /api/provider/transactions
     */
    public function transactions(Request $request)
    {
        try {
            $provider = $request->user();
            $wallet = $provider->wallet;
            
            if (!$wallet) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }
            
            $transactions = $wallet->transactions()
                ->with(['booking', 'withdrawal'])
                ->latest()
                ->paginate(20);
            
            return response()->json([
                'success' => true,
                'data' => $transactions
            ]);
            
        } catch (\Exception $e) {
            Log::error('Transaction history error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load transaction history'
            ], 500);
        }
    }

    /**
     * Cancel a pending withdrawal request
     * POST /api/provider/withdrawals/{id}/cancel
     */
    public function cancelWithdrawal(Request $request, $id)
    {
        try {
            $provider = $request->user();
            
            $withdrawal = Withdrawal::where('withdrawalID', $id)
                ->where('providerID', $provider->providerID)
                ->where('status', 'pending')
                ->first();
            
            if (!$withdrawal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pending withdrawal not found'
                ], 404);
            }
            
            DB::transaction(function () use ($withdrawal, $provider) {
                // Get wallet
                $wallet = Wallet::where('providerID', $provider->providerID)->first();
                
                if ($wallet) {
                    // Return amount to available balance
                    $wallet->available_balance += $withdrawal->amount;
                    $wallet->save();
                    
                    // Create transaction record for reversal
                    WalletTransaction::create([
                        'walletID' => $wallet->walletID,
                        'type' => 'credit',
                        'amount' => $withdrawal->amount,
                        'description' => 'Cancelled withdrawal #' . $withdrawal->withdrawalID,
                        'bookingID' => null,
                        'withdrawalID' => $withdrawal->withdrawalID
                    ]);
                }
                
                // Update withdrawal status
                $withdrawal->status = 'cancelled';
                $withdrawal->admin_notes = 'Cancelled by provider';
                $withdrawal->processed_at = now();
                $withdrawal->save();
            });
            
            return response()->json([
                'success' => true,
                'message' => 'Withdrawal request cancelled successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Cancel withdrawal error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel withdrawal request'
            ], 500);
        }
    }
}