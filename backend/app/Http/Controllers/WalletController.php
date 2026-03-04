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

class WalletController extends Controller
{
    protected $walletService;

    public function __construct(WalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    /**
     * Get wallet dashboard
     */
    public function dashboard(Request $request)
    {
        $provider = $request->user();
        
        $wallet = Wallet::firstOrCreate(
            ['providerID' => $provider->providerID],
            [
                'pending_balance' => 0,
                'available_balance' => 0,
                'total_earned' => 0,
                'total_withdrawn' => 0,
                'commission_held' => 0,
                'currency' => 'ETB'
            ]
        );

        // Calculate balances
        $pendingBalance = Payment::where('providerID', $provider->providerID)
            ->where('status', 'held')
            ->sum('provider_amount');

        $availableBalance = Payment::where('providerID', $provider->providerID)
            ->where('status', 'released')
            ->where('is_withdrawn', false)
            ->sum('provider_amount');

        $wallet->pending_balance = $pendingBalance;
        $wallet->available_balance = $availableBalance;
        $wallet->save();

        $recentTransactions = WalletTransaction::where('walletID', $wallet->walletID)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        $pendingWithdrawals = Withdrawal::where('providerID', $provider->providerID)
            ->where('status', 'pending')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'wallet' => [
                    'pending_balance' => $wallet->pending_balance,
                    'available_balance' => $wallet->available_balance,
                    'total_earned' => $wallet->total_earned,
                    'total_withdrawn' => $wallet->total_withdrawn
                ],
                'pending_withdrawals' => $pendingWithdrawals,
                'recent_transactions' => $recentTransactions
            ]
        ]);
    }

    /**
     * Request withdrawal
     */
    public function requestWithdrawal(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:50',
            'bank_name' => 'required|string|max:255',
            'account_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:255'
        ]);

        $provider = $request->user();
        
        $wallet = Wallet::where('providerID', $provider->providerID)->first();
        
        if (!$wallet || $wallet->available_balance < $request->amount) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient available balance'
            ], 400);
        }

        return DB::transaction(function () use ($provider, $wallet, $request) {
            $fee = 5; // Fixed fee
            $netAmount = $request->amount - $fee;
            $withdrawalRef = 'WDR-' . Str::random(12) . '-' . time();

            $withdrawal = Withdrawal::create([
                'withdrawal_ref' => $withdrawalRef,
                'providerID' => $provider->providerID,
                'walletID' => $wallet->walletID,
                'amount' => $request->amount,
                'fee' => $fee,
                'net_amount' => $netAmount,
                'bank_name' => $request->bank_name,
                'account_name' => $request->account_name,
                'account_number' => $request->account_number,
                'status' => 'pending'
            ]);

            $balanceBefore = $wallet->available_balance;
            $wallet->available_balance -= $request->amount;
            $wallet->save();

            WalletTransaction::create([
                'reference' => 'TXN-' . Str::random(12),
                'walletID' => $wallet->walletID,
                'type' => 'withdrawal_requested',
                'amount' => -$request->amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $wallet->available_balance,
                'description' => "Withdrawal request #{$withdrawalRef}"
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Withdrawal request submitted',
                'data' => $withdrawal
            ]);
        });
    }

    /**
     * Get withdrawal history
     */
    public function withdrawals(Request $request)
    {
        $provider = $request->user();
        
        $withdrawals = Withdrawal::where('providerID', $provider->providerID)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $withdrawals
        ]);
    }

    /**
     * Get transaction history
     */
    public function transactions(Request $request)
    {
        $provider = $request->user();
        $wallet = Wallet::where('providerID', $provider->providerID)->first();

        if (!$wallet) {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }

        $transactions = WalletTransaction::where('walletID', $wallet->walletID)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $transactions
        ]);
    }
}