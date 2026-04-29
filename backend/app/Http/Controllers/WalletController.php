<?php
// app/Http/Controllers/WalletController.php

namespace App\Http\Controllers;

use App\Models\Wallet;
use App\Models\Payment;
use App\Models\Withdrawal;
use App\Models\WalletTransaction;
use App\Models\BankAccount;
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
            
        }  catch (\Exception $e) {
                Log::error('Wallet dashboard error: ' . $e->getMessage(), [
                    'provider_id' => $request->user()->providerID ?? null,
                    'trace' => $e->getTraceAsString()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to load wallet data',
                    'error' => $e->getMessage(), // ADD THIS LINE
                    'file' => $e->getFile(),      // ADD THIS LINE
                    'line' => $e->getLine()        // ADD THIS LINE
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
            'amount' => 'required|numeric|min:50|max:50000', // Min 50 ETB, Max 50,000 ETB per request
            'payment_method' => 'required|in:bank,telebir',
            'bank_name' => 'required_if:payment_method,bank|string|nullable',
            'account_number' => 'required_if:payment_method,bank|string|nullable',
            'account_holder_name' => 'required_if:payment_method,bank|string|nullable',
            'telebir_number' => 'required_if:payment_method,telebir|string|nullable',
            'telebir_holder_name' => 'required_if:payment_method,telebir|string|nullable'
        ]);
        
        try {
            $provider = $request->user();
            $wallet = $provider->wallet;
            $amount = $request->amount;

            // ── Daily withdrawal limit check ──────────────────────────────────
            $dailyLimit = \App\Models\SystemSetting::get('max_daily_withdrawal', 100000); // 100,000 ETB/day
            $todayWithdrawn = \App\Models\Withdrawal::where('providerID', $provider->providerID)
                ->whereDate('created_at', today())
                ->whereIn('status', ['pending', 'approved', 'processed'])
                ->sum('amount');

            if (($todayWithdrawn + $amount) > $dailyLimit) {
                $remaining = max(0, $dailyLimit - $todayWithdrawn);
                return response()->json([
                    'success' => false,
                    'message' => "Daily withdrawal limit is {$dailyLimit} ETB. You have already withdrawn {$todayWithdrawn} ETB today. Remaining: {$remaining} ETB.",
                ], 422);
            }
            // ── End daily limit check ─────────────────────────────────────────
        
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
        
        DB::transaction(function () use ($wallet, $amount, $provider, $request, &$withdrawal) {
            // Deduct from available balance
            $wallet->available_balance -= $amount;
            $wallet->save();
            
            // Generate unique withdrawal reference
            $withdrawalRef = 'WDR_' . strtoupper(Str::random(8)) . '_' . time();
            
            // Base withdrawal data
            $withdrawalData = [
                'providerID' => $provider->providerID,
                'withdrawal_ref' => $withdrawalRef,
                'amount' => $amount,
                'currency' => 'ETB',
                'status' => 'pending',
                'payment_method' => $request->payment_method,
                'platform_fee' => 0,
                'net_amount' => $amount,
                'processed_at' => null,
                'admin_notes' => null
            ];
            
            // Add bank fields if payment method is bank
            if ($request->payment_method === 'bank') {
                $withdrawalData['provider_bank_name'] = $request->bank_name;
                $withdrawalData['provider_account_number'] = $request->account_number;
                $withdrawalData['provider_account_holder_name'] = $request->account_holder_name;
            }
            
            // Add telebir fields if payment method is telebir
            if ($request->payment_method === 'telebir') {
                $withdrawalData['telebir_number'] = $request->telebir_number;
                $withdrawalData['telebir_holder_name'] = $request->telebir_holder_name;
            }
            
            // Create withdrawal record
            $withdrawal = Withdrawal::create($withdrawalData);
            
            if (!$withdrawal) {
                throw new \Exception('Failed to create withdrawal record');
            }
            
            // Create transaction record
            WalletTransaction::create([
                'walletID' => $wallet->walletID,
                'type' => 'debit',
                'amount' => $amount,
                'description' => 'Withdrawal request #' . $withdrawalRef . ' (' . $request->payment_method . ')',
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
        
        // Notify admins about new withdrawal request
        $notificationService = app(\App\Services\NotificationService::class);
        $notificationService->notifyAdminsWithdrawalRequest($withdrawal, $provider);
        
        return response()->json([
            'success' => true,
            'message' => 'Withdrawal request submitted successfully',
            'data' => [
                'withdrawal' => [
                    'withdrawalID' => $withdrawal->withdrawalID,
                    'amount' => (float) $withdrawal->amount,
                    'status' => $withdrawal->status,
                    'payment_method' => $withdrawal->payment_method,
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
                ->with(['booking.customer', 'booking.service', 'withdrawal'])
                ->latest()
                ->paginate(20);
            
            // Map the transactions to match the mobile app's Transaction interface
            $formattedTransactions = collect($transactions->items())->map(function($t) {
                // Determine transaction type for the frontend
                $type = 'payment'; // default
                if ($t->withdrawalID) $type = 'withdrawal';
                if ($t->type === 'refund') $type = 'refund';
                
                // Determine status for frontend
                $status = 'completed';
                if ($t->withdrawalID) {
                    $status = $t->withdrawal->status ?? 'pending';
                } elseif ($t->type === 'pending_credit') {
                    $status = 'pending';
                }
                
                return [
                    'id' => (string)$t->id,
                    'transactionId' => (string)($t->withdrawalID ? 'WDR-' . $t->withdrawalID : 'TXN-' . $t->id),
                    'bookingId' => (string)$t->bookingID,
                    'customerName' => $t->booking->customer->fullname ?? $t->booking->customer->name ?? 'N/A',
                    'serviceName' => $t->booking->service->title ?? ($t->withdrawalID ? 'Withdrawal' : 'N/A'),
                    'amount' => (float)$t->amount,
                    'fee' => (float)($t->booking->platform_commission ?? 0),
                    'netAmount' => (float)$t->amount,
                    'status' => $status,
                    'TransactionType' => $type,
                    'paymentMethod' => $t->withdrawalID ? ($t->withdrawal->payment_method ?? 'bank') : 'chapa',
                    'createdAt' => $t->created_at->toIso8601String(),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'transactions' => $formattedTransactions,
                    'total' => $transactions->total(),
                    'hasMore' => $transactions->hasMorePages(),
                    'currentPage' => $transactions->currentPage(),
                ]
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

    /**
     * Get wallet transactions with split payment filtering
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTransactions(Request $request)
    {
        try {
            $provider = $request->user();
            $wallet = $provider->wallet;
            
            if (!$wallet) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'transactions' => [],
                        'balance_summary' => [
                            'available_balance' => 0,
                            'pending_balance' => 0,
                            'total_balance' => 0
                        ]
                    ]
                ]);
            }
            
            // Build query with optional filters
            $query = $wallet->transactions()
                ->with(['booking.customer', 'booking.service', 'relatedPayment']);
            
            // Filter by transaction_type if provided
            if ($request->has('transaction_type')) {
                $query->where('transaction_type', $request->transaction_type);
            }
            
            // Filter by transaction_status if provided
            if ($request->has('transaction_status')) {
                $query->where('transaction_status', $request->transaction_status);
            }
            
            $transactions = $query->latest()->paginate(20);
            
            // Format transactions
            $formattedTransactions = collect($transactions->items())->map(function($t) {
                return [
                    'transaction_id' => $t->transactionID,
                    'type' => $t->type,
                    'transaction_type' => $t->transaction_type,
                    'transaction_status' => $t->transaction_status,
                    'amount' => (float) $t->amount,
                    'description' => $t->description,
                    'booking_id' => $t->bookingID,
                    'booking' => $t->booking ? [
                        'booking_id' => $t->booking->bookingID,
                        'customer_name' => $t->booking->customer->fullname ?? 'N/A',
                        'service_name' => $t->booking->service->title ?? 'N/A'
                    ] : null,
                    'release_date' => $t->release_date,
                    'created_at' => $t->created_at->toIso8601String()
                ];
            });
            
            // Balance summary
            $balanceSummary = [
                'available_balance' => (float) $wallet->available_balance,
                'pending_balance' => (float) $wallet->pending_balance,
                'total_balance' => (float) ($wallet->available_balance + $wallet->pending_balance)
            ];
            
            return response()->json([
                'success' => true,
                'data' => [
                    'transactions' => $formattedTransactions,
                    'balance_summary' => $balanceSummary,
                    'pagination' => [
                        'total' => $transactions->total(),
                        'current_page' => $transactions->currentPage(),
                        'last_page' => $transactions->lastPage(),
                        'per_page' => $transactions->perPage(),
                        'has_more' => $transactions->hasMorePages()
                    ]
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to get wallet transactions', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load transactions'
            ], 500);
        }
    }

    /**
     * Get all bank accounts for the authenticated provider
     * GET /api/provider/bank-accounts
     */
    public function getBankAccounts(Request $request)
    {
        try {
            $provider = $request->user();
            
            $bankAccounts = BankAccount::where('user_type', 'provider')
                ->where('user_id', $provider->providerID)
                ->orderBy('is_default', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $bankAccounts
            ]);
            
        } catch (\Exception $e) {
            Log::error('Get bank accounts error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load bank accounts'
            ], 500);
        }
    }

    /**
     * Save a new bank account
     * POST /api/provider/bank-accounts
     */
    public function saveBankAccount(Request $request)
    {
        $request->validate([
            'bankName' => 'required|string|max:255',
            'accountName' => 'required|string|max:255',
            'accountNumber' => 'required|string|max:50|unique:bank_accounts,account_number',
            'branch' => 'nullable|string|max:255',
            'swiftCode' => 'nullable|string|max:20'
        ]);
        
        try {
            $provider = $request->user();
            
            // Check if this is the first bank account for this provider
            $existingCount = BankAccount::where('user_type', 'provider')
                ->where('user_id', $provider->providerID)
                ->count();
            $isDefault = $existingCount === 0; // First account is automatically default
            
            // If user wants to set this as default, unset other default accounts
            if ($request->has('is_default') && $request->is_default) {
                BankAccount::where('user_type', 'provider')
                    ->where('user_id', $provider->providerID)
                    ->update(['is_default' => false]);
                $isDefault = true;
            }
            
            $bankAccount = BankAccount::create([
                'user_type' => 'provider',
                'user_id' => $provider->providerID,
                'bank_name' => $request->bankName,
                'account_name' => $request->accountName,
                'account_number' => $request->accountNumber,
                'branch' => $request->branch,
                'swift_code' => $request->swiftCode,
                'is_default' => $isDefault
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Bank account saved successfully',
                'data' => $bankAccount
            ], 201);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Save bank account error: ' . $e->getMessage(), [
                'provider_id' => $request->user()->providerID ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to save bank account: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an existing bank account
     * PUT /api/provider/bank-accounts/{id}
     */
    public function updateBankAccount(Request $request, $id)
    {
        $request->validate([
            'bankName' => 'required|string|max:255',
            'accountName' => 'required|string|max:255',
            'accountNumber' => 'required|string|max:50|unique:bank_accounts,account_number,' . $id . ',id',
            'branch' => 'nullable|string|max:255',
            'swiftCode' => 'nullable|string|max:20'
        ]);
        
        try {
            $provider = $request->user();
            
            $bankAccount = BankAccount::where('id', $id)
                ->where('user_type', 'provider')
                ->where('user_id', $provider->providerID)
                ->first();
            
            if (!$bankAccount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bank account not found'
                ], 404);
            }
            
            // If user wants to set this as default, unset other default accounts
            if ($request->has('is_default') && $request->is_default) {
                BankAccount::where('user_type', 'provider')
                    ->where('user_id', $provider->providerID)
                    ->where('id', '!=', $id)
                    ->update(['is_default' => false]);
            }
            
            $bankAccount->update([
                'bank_name' => $request->bankName,
                'account_name' => $request->accountName,
                'account_number' => $request->accountNumber,
                'branch' => $request->branch,
                'swift_code' => $request->swiftCode,
                'is_default' => $request->has('is_default') ? $request->is_default : $bankAccount->is_default
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Bank account updated successfully',
                'data' => $bankAccount
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Update bank account error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update bank account'
            ], 500);
        }
    }

    /**
     * Delete a bank account
     * DELETE /api/provider/bank-accounts/{id}
     */
    public function deleteBankAccount(Request $request, $id)
    {
        try {
            $provider = $request->user();
            
            $bankAccount = BankAccount::where('id', $id)
                ->where('user_type', 'provider')
                ->where('user_id', $provider->providerID)
                ->first();
            
            if (!$bankAccount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bank account not found'
                ], 404);
            }
            
            // If deleting default account, set another account as default
            if ($bankAccount->is_default) {
                $nextAccount = BankAccount::where('user_type', 'provider')
                    ->where('user_id', $provider->providerID)
                    ->where('id', '!=', $id)
                    ->first();
                
                if ($nextAccount) {
                    $nextAccount->update(['is_default' => true]);
                }
            }
            
            $bankAccount->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Bank account deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Delete bank account error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete bank account'
            ], 500);
        }
    }
}
