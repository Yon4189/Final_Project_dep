<?php
// app/Http/Controllers/AdminWithdrawalController.php

namespace App\Http\Controllers;

use App\Models\Withdrawal;
use App\Models\Payment;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminWithdrawalController extends Controller
{
    /**
     * List all withdrawals
     */
    /**
     * List all pending withdrawals (new schema)
     */
    public function index()
    {
        $withdrawals = Withdrawal::where('status', 'pending')->with('wallet.serviceProvider')->latest()->get();
        return response()->json(['data' => $withdrawals]);
    }

    /**
     * Approve withdrawal
     */
    /**
     * Approve a withdrawal (new schema)
     */
    public function approve(Request $request, $id)
    {
        $withdrawal = Withdrawal::findOrFail($id);
        if ($withdrawal->status !== 'pending') {
            return response()->json(['error' => 'Withdrawal not pending'], 422);
        }
        DB::transaction(function () use ($withdrawal) {
            $withdrawal->status = 'approved';
            $withdrawal->processed_at = now();
            $withdrawal->save();
            WalletTransaction::create([
                'wallet_id' => $withdrawal->wallet_id,
                'type' => 'debit',
                'amount' => $withdrawal->amount,
                'description' => 'Withdrawal approved',
                'withdrawal_id' => $withdrawal->id,
            ]);
            // TODO: Send notification to provider
        });
        return response()->json(['message' => 'Withdrawal approved']);
    }

    /**
     * Reject withdrawal
     */
    /**
     * Reject a withdrawal (new schema)
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'admin_notes' => 'required|string',
        ]);
        $withdrawal = Withdrawal::findOrFail($id);
        if ($withdrawal->status !== 'pending') {
            return response()->json(['error' => 'Withdrawal not pending'], 422);
        }
        DB::transaction(function () use ($withdrawal, $request) {
            $wallet = $withdrawal->wallet;
            $wallet->available_balance += $withdrawal->amount;
            $wallet->save();
            $withdrawal->status = 'rejected';
            $withdrawal->admin_notes = $request->admin_notes;
            $withdrawal->processed_at = now();
            $withdrawal->save();
            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'type' => 'credit',
                'amount' => $withdrawal->amount,
                'description' => 'Withdrawal rejected, funds returned',
                'withdrawal_id' => $withdrawal->id,
            ]);
            // TODO: Send notification to provider
        });
        return response()->json(['message' => 'Withdrawal rejected and funds returned']);
    }

    /**
     * Get withdrawal statistics
     */
    public function stats()
    {
        $stats = [
            'pending' => [
                'count' => Withdrawal::where('status', 'pending')->count(),
                'total' => Withdrawal::where('status', 'pending')->sum('amount')
            ],
            'approved_today' => [
                'count' => Withdrawal::where('status', 'approved')
                    ->whereDate('approved_at', today())
                    ->count(),
                'total' => Withdrawal::where('status', 'approved')
                    ->whereDate('approved_at', today())
                    ->sum('amount')
            ],
            'total_processed' => [
                'count' => Withdrawal::whereIn('status', ['approved', 'processed'])->count(),
                'total' => Withdrawal::whereIn('status', ['approved', 'processed'])->sum('amount')
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
}