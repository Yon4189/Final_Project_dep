<?php

// app/Http/Controllers/AdminWithdrawalController.php

namespace App\Http\Controllers;

use App\Models\Withdrawal;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\PaymentController; 
use App\Http\Controllers\Client;
use Aoo\Http\Controllers\RequestException;

class AdminWithdrawalController extends Controller
{
    /**
     * List all pending withdrawals with provider details
     * 
     * GET /api/admin/withdrawals/pending
     */
    public function getPendingWithdrawals()
    {
        try {
            $withdrawals = Withdrawal::where('status', 'pending')
                ->with('provider') // Assuming you have provider relationship
                ->orderBy('created_at', 'desc')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $withdrawals
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('Get pending withdrawals failed: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve pending withdrawals'
            ], 500);
        }
    }

    /**
     * Approve a withdrawal
     * 
     * POST /api/admin/withdrawals/{id}/approve
     */



    /**
     * Reject a withdrawal with reason
     * 
     * POST /api/admin/withdrawals/{id}/reject
     */
    public function rejectWithdrawal(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|min:5'
        ]);
        
        DB::beginTransaction();
        
        try {
            $withdrawal = Withdrawal::where('withdrawalID', $id)
                ->where('status', 'pending')
                ->first();
            
            if (!$withdrawal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Withdrawal not found or already processed'
                ], 404);
            }
            
            // Get provider's wallet
            $wallet = Wallet::where('providerID', $withdrawal->providerID)->first();
            
            if (!$wallet) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Provider wallet not found'
                ], 404);
            }
            
            // Return amount to available balance
            $wallet->available_balance += $withdrawal->amount;
            $wallet->save();
            
            // Update withdrawal
            $withdrawal->status = 'rejected';
            $withdrawal->admin_notes = $request->reason;
            $withdrawal->processed_at = now();
            $withdrawal->save();
            
            // Create wallet transaction record for refund
            WalletTransaction::create([
                'walletID' => $wallet->walletID,
                'type' => 'credit',
                'amount' => $withdrawal->amount,
                'description' => 'Withdrawal #' . $withdrawal->withdrawalID . ' rejected: ' . $request->reason,
                'bookingID' => null,
                'withdrawalID' => $withdrawal->withdrawalID
            ]);
            
            DB::commit();
            
            // TODO: Send email notification to provider with rejection reason
            // Mail::to($withdrawal->provider->email)->send(new WithdrawalRejected($withdrawal, $request->reason));
            
            return response()->json([
                'success' => true,
                'message' => 'Withdrawal rejected and funds returned to wallet',
                'data' => $withdrawal
            ], 200);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Reject withdrawal failed: ' . $e->getMessage(), [
                'withdrawal_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject withdrawal: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get withdrawal statistics for admin dashboard
     * 
     * GET /api/admin/withdrawals/stats
     */
    public function stats()
    {
        try {
            $pending = Withdrawal::where('status', 'pending')->get();
            $approved = Withdrawal::where('status', 'approved')->get();
            $rejected = Withdrawal::where('status', 'rejected')->get();
            
            // Today's stats
            $today = now()->startOfDay();
            $approvedToday = Withdrawal::where('status', 'approved')
                ->where('processed_at', '>=', $today)
                ->get();
            
            $stats = [
                'pending' => [
                    'count' => $pending->count(),
                    'total' => $pending->sum('amount')
                ],
                'approved' => [
                    'count' => $approved->count(),
                    'total' => $approved->sum('amount')
                ],
                'rejected' => [
                    'count' => $rejected->count(),
                    'total' => $rejected->sum('amount')
                ],
                'approved_today' => [
                    'count' => $approvedToday->count(),
                    'total' => $approvedToday->sum('amount')
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('Get withdrawal stats failed: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve withdrawal statistics'
            ], 500);
        }
    }

    /**
     * Get all withdrawals with filtering (optional)
     * 
     * GET /api/admin/withdrawals?status=pending&from=2026-01-01&to=2026-03-05
     */
    public function index(Request $request)
    {
        try {
            $query = Withdrawal::with('provider');
            
            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            
            // Filter by date range
            if ($request->has('from')) {
                $query->where('created_at', '>=', $request->from);
            }
            
            if ($request->has('to')) {
                $query->where('created_at', '<=', $request->to);
            }
            
            $withdrawals = $query->orderBy('created_at', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'data' => $withdrawals
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('Get withdrawals failed: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve withdrawals'
            ], 500);
        }
    }

    public function approveWithdrawal($id)
    {
        DB::beginTransaction();
        
        try {
            $withdrawal = Withdrawal::where('withdrawalID', $id)
                ->where('status', 'pending')
                ->first();
            
            if (!$withdrawal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Withdrawal not found or already processed'
                ], 404);
            }

            // Initialize Chapa transfer
            $paymentController = app(PaymentController::class);
            $transferResult = $paymentController->initiateTransfer($withdrawal);
            
            if (!$transferResult) {
                DB::rollBack();
                Log::error('Chapa transfer initiation failed', ['withdrawal_id' => $id]);
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to initiate transfer with Chapa'
                ], 500);
            }

            // Update withdrawal with Chapa details
            $withdrawal->status = 'approved';
            $withdrawal->processed_at = now();
            $withdrawal->chapa_transfer_id = $transferResult['data']['transfer_id'] ?? null;
            $withdrawal->chapa_transfer_status = 'pending';
            $withdrawal->save();
            
            // Get provider's wallet (optional)
            $wallet = Wallet::where('providerID', $withdrawal->providerID)->first();
            
            if ($wallet) {
                // Create wallet transaction record
                WalletTransaction::create([
                    'walletID' => $wallet->walletID,
                    'type' => 'withdrawal',
                    'amount' => $withdrawal->amount,
                    'description' => 'Withdrawal #' . $withdrawal->withdrawalID . ' approved',
                    'bookingID' => null,
                    'withdrawalID' => $withdrawal->withdrawalID
                ]);
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Withdrawal approved and transfer initiated successfully',
                'data' => $withdrawal
            ], 200);
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Approve withdrawal failed: ' . $e->getMessage(), [
                'withdrawal_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve withdrawal: ' . $e->getMessage()
            ], 500);
        }
    }
}