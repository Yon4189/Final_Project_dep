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
    public function index(Request $request)
    {
        $query = Withdrawal::with(['provider', 'provider.user']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('provider_id')) {
            $query->where('providerID', $request->provider_id);
        }

        $withdrawals = $query->orderBy('created_at', 'desc')->paginate(20);

        $stats = [
            'pending_total' => Withdrawal::where('status', 'pending')->sum('amount'),
            'pending_count' => Withdrawal::where('status', 'pending')->count(),
            'approved_today' => Withdrawal::where('status', 'approved')
                ->whereDate('approved_at', today())
                ->sum('amount')
        ];

        return response()->json([
            'success' => true,
            'data' => $withdrawals,
            'stats' => $stats
        ]);
    }

    /**
     * Approve withdrawal
     */
    public function approve(Request $request, $withdrawalId)
    {
        $request->validate([
            'admin_notes' => 'nullable|string|max:500'
        ]);

        $withdrawal = Withdrawal::where('withdrawalID', $withdrawalId)
            ->where('status', 'pending')
            ->first();

        if (!$withdrawal) {
            return response()->json([
                'success' => false,
                'message' => 'Withdrawal not found'
            ], 404);
        }

        return DB::transaction(function () use ($withdrawal, $request) {
            $withdrawal->status = 'approved';
            $withdrawal->admin_notes = $request->admin_notes;
            $withdrawal->approved_by = auth()->id();
            $withdrawal->approved_at = now();
            $withdrawal->processed_at = now();
            $withdrawal->save();

            // Mark payments as withdrawn
            $updatedCount = Payment::where('providerID', $withdrawal->providerID)
                ->where('status', 'released')
                ->where('is_withdrawn', false)
                ->update([
                    'is_withdrawn' => true,
                    'withdrawn_at' => now()
                ]);

            $wallet = $withdrawal->wallet;
            $wallet->total_withdrawn += $withdrawal->amount;
            $wallet->save();

            WalletTransaction::create([
                'reference' => 'TXN-' . Str::random(12),
                'walletID' => $wallet->walletID,
                'type' => 'withdrawal_approved',
                'amount' => -$withdrawal->amount,
                'balance_before' => $wallet->available_balance,
                'balance_after' => $wallet->available_balance,
                'description' => "Withdrawal #{$withdrawal->withdrawal_ref} approved"
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Withdrawal approved',
                'data' => [
                    'withdrawal' => $withdrawal,
                    'payments_marked' => $updatedCount
                ]
            ]);
        });
    }

    /**
     * Reject withdrawal
     */
    public function reject(Request $request, $withdrawalId)
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:500'
        ]);

        $withdrawal = Withdrawal::where('withdrawalID', $withdrawalId)
            ->where('status', 'pending')
            ->first();

        if (!$withdrawal) {
            return response()->json([
                'success' => false,
                'message' => 'Withdrawal not found'
            ], 404);
        }

        return DB::transaction(function () use ($withdrawal, $request) {
            $wallet = $withdrawal->wallet;
            $balanceBefore = $wallet->available_balance;

            $wallet->available_balance += $withdrawal->amount;
            $wallet->save();

            $withdrawal->status = 'rejected';
            $withdrawal->rejection_reason = $request->rejection_reason;
            $withdrawal->approved_by = auth()->id();
            $withdrawal->approved_at = now();
            $withdrawal->save();

            WalletTransaction::create([
                'reference' => 'TXN-' . Str::random(12),
                'walletID' => $wallet->walletID,
                'type' => 'withdrawal_rejected',
                'amount' => $withdrawal->amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $wallet->available_balance,
                'description' => "Withdrawal #{$withdrawal->withdrawal_ref} rejected - funds returned"
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Withdrawal rejected',
                'data' => $withdrawal
            ]);
        });
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