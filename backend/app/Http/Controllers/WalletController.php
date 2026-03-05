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
    /**
     * Get provider wallet info (new schema)
     */
    public function dashboard(Request $request)
    {
        $provider = $request->user();
        $wallet = $provider->wallet;
        if (!$wallet) {
            $wallet = Wallet::create([
                'service_provider_id' => $provider->providerID,
                'available_balance' => 0,
                'pending_balance' => 0,
            ]);
        }
        $recentTransactions = $wallet->transactions()->latest()->limit(10)->get();
        $pendingWithdrawals = $wallet->withdrawals()->where('status', 'pending')->get();
        return response()->json([
            'wallet' => $wallet,
            'pending_withdrawals' => $pendingWithdrawals,
            'recent_transactions' => $recentTransactions
        ]);
    }

    /**
     * Request withdrawal
     */
    /**
     * Request withdrawal (new schema)
     */
    public function requestWithdrawal(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);
        $provider = $request->user();
        $wallet = $provider->wallet;
        $amount = $request->amount;
        if (!$wallet || $wallet->available_balance < $amount) {
            return response()->json(['error' => 'Insufficient balance'], 422);
        }
        DB::transaction(function () use ($wallet, $amount) {
            $wallet->available_balance -= $amount;
            $wallet->save();
            $withdrawal = Withdrawal::create([
                'wallet_id' => $wallet->id,
                'amount' => $amount,
                'status' => 'pending',
            ]);
            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'type' => 'debit',
                'amount' => $amount,
                'description' => 'Withdrawal request',
                'withdrawal_id' => $withdrawal->id,
            ]);
        });
        // TODO: Notify admin (queue/email)
        return response()->json(['message' => 'Withdrawal requested']);
    }

    /**
     * Get withdrawal history
     */
    /**
     * Get withdrawal history (new schema)
     */
    public function withdrawals(Request $request)
    {
        $provider = $request->user();
        $wallet = $provider->wallet;
        if (!$wallet) {
            return response()->json(['data' => []]);
        }
        $withdrawals = $wallet->withdrawals()->latest()->paginate(20);
        return response()->json(['data' => $withdrawals]);
    }

    /**
     * Get transaction history
     */
    /**
     * Get wallet transaction history (new schema)
     */
    public function transactions(Request $request)
    {
        $provider = $request->user();
        $wallet = $provider->wallet;
        if (!$wallet) {
            return response()->json(['data' => []]);
        }
        $transactions = $wallet->transactions()->latest()->paginate(20);
        return response()->json(['data' => $transactions]);
    }
}