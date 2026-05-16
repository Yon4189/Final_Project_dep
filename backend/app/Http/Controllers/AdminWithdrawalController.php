<?php

// app/Http/Controllers/AdminWithdrawalController.php

namespace App\Http\Controllers;

use App\Models\Withdrawal;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\RiskAnalyzer;
use App\Services\ComplianceChecker;
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
     * Get all withdrawals with filtering, search, and pagination
     * 
     * GET /api/admin/withdrawals?status=pending&search=john&page=1&per_page=20
     */
    public function index(Request $request)
    {
        try {
            $query = Withdrawal::with('provider');
            
            // Filter by status (pending, approved, rejected, processing, completed, failed, cancelled, all)
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }
            
            // Search by provider name, ID, or withdrawal reference
            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('withdrawal_ref', 'like', '%' . $searchTerm . '%')
                      ->orWhereHas('provider', function($providerQuery) use ($searchTerm) {
                          $providerQuery->where('fullname', 'like', '%' . $searchTerm . '%')
                                       ->orWhere('providerID', 'like', '%' . $searchTerm . '%');
                      });
                });
            }
            
            // Filter by date range (optional)
            if ($request->has('from')) {
                $query->where('created_at', '>=', $request->from);
            }
            
            if ($request->has('to')) {
                $query->where('created_at', '<=', $request->to);
            }
            
            // Pagination
            $perPage = $request->get('per_page', 20);
            $perPage = min($perPage, 50); // Max 50 items per page
            
            $withdrawals = $query->orderBy('created_at', 'desc')->paginate($perPage);
            
            return response()->json([
                'success' => true,
                'data' => $withdrawals->items(),
                'pagination' => [
                    'total' => $withdrawals->total(),
                    'current_page' => $withdrawals->currentPage(),
                    'last_page' => $withdrawals->lastPage(),
                    'per_page' => $withdrawals->perPage(),
                    'from' => $withdrawals->firstItem(),
                    'to' => $withdrawals->lastItem()
                ]
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('Get withdrawals failed: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve withdrawals'
            ], 500);
        }
    }

    /**
     * Get detailed withdrawal information with risk analysis and compliance checks
     * 
     * GET /api/admin/withdrawals/{id}
     */
    public function show($id)
    {
        try {
            $withdrawal = Withdrawal::with(['provider.wallet', 'provider.category'])
                ->where('withdrawalID', $id)
                ->first();
            
            if (!$withdrawal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Withdrawal not found'
                ], 404);
            }
            
            $provider = $withdrawal->provider;
            $wallet = $provider->wallet;
            
            if (!$wallet) {
                return response()->json([
                    'success' => false,
                    'message' => 'Provider wallet not found'
                ], 404);
            }
            
            // Provider statistics
            $completedBookings = \App\Models\Booking::where('providerID', $provider->providerID)
                ->where('status', 'completed')
                ->count();
            
            $totalReviews = \App\Models\Review::whereHas('booking', function($query) use ($provider) {
                $query->where('providerID', $provider->providerID);
            })->count();
            
            // Withdrawal history
            $withdrawalHistory = Withdrawal::where('providerID', $provider->providerID)
                ->where('withdrawalID', '!=', $id)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();
            
            $totalWithdrawals = Withdrawal::where('providerID', $provider->providerID)
                ->whereIn('status', ['approved', 'completed'])
                ->count();
            
            $totalWithdrawn = Withdrawal::where('providerID', $provider->providerID)
                ->whereIn('status', ['approved', 'completed'])
                ->sum('amount');
            
            $avgWithdrawal = $totalWithdrawals > 0 ? $totalWithdrawn / $totalWithdrawals : 0;
            
            // Recent activity (last 30 days)
            $thirtyDaysAgo = \Carbon\Carbon::now()->subDays(30);
            $recentBookings = \App\Models\Booking::where('providerID', $provider->providerID)
                ->where('created_at', '>=', $thirtyDaysAgo)
                ->where('status', 'completed')
                ->get();
            
            $recentEarnings = $recentBookings->sum('provider_earnings');
            $avgBookingValue = $recentBookings->count() > 0 ? $recentEarnings / $recentBookings->count() : 0;
            
            $recentReviews = \App\Models\Review::whereHas('booking', function($query) use ($provider, $thirtyDaysAgo) {
                $query->where('providerID', $provider->providerID)
                      ->where('created_at', '>=', $thirtyDaysAgo);
            })->get();
            
            $recentAvgRating = $recentReviews->count() > 0 ? $recentReviews->avg('rating') : 0;
            
            // Last activity
            $lastBooking = \App\Models\Booking::where('providerID', $provider->providerID)
                ->orderBy('created_at', 'desc')
                ->first();
            
            // Risk analysis
            $riskAnalyzer = new RiskAnalyzer();
            $riskAnalysis = $riskAnalyzer->analyze($withdrawal, $provider);
            
            // Compliance checks
            $complianceChecker = new ComplianceChecker();
            $complianceChecks = $complianceChecker->check($withdrawal, $wallet);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'withdrawal' => $withdrawal,
                    'provider_identity' => [
                        'fullname' => $provider->fullname,
                        'providerID' => $provider->providerID,
                        'phone' => $provider->phone,
                        'email' => $provider->email,
                        'created_at' => $provider->created_at,
                        'verification_status' => $provider->verification_status ?? 'unverified',
                        'account_status' => $provider->status
                    ],
                    'financial_info' => [
                        'available_balance' => (float) $wallet->available_balance,
                        'pending_balance' => (float) $wallet->pending_balance,
                        'total_balance' => (float) ($wallet->available_balance + $wallet->pending_balance),
                        'requested_amount' => (float) $withdrawal->amount,
                        'total_earnings' => (float) $riskAnalysis['indicators']['total_earnings'],
                        'previous_withdrawals_count' => $totalWithdrawals,
                        'total_withdrawn' => (float) $totalWithdrawn,
                        'average_withdrawal' => (float) $avgWithdrawal
                    ],
                    'business_metrics' => [
                        'completed_bookings' => $completedBookings,
                        'average_rating' => (float) ($provider->rating ?? 0),
                        'total_reviews' => $totalReviews,
                        'account_status' => $provider->status,
                        'service_category' => $provider->category->name ?? 'N/A',
                        'service_city' => $provider->service_city ?? 'N/A'
                    ],
                    'withdrawal_history' => $withdrawalHistory,
                    'recent_activity' => [
                        'bookings_last_30_days' => $recentBookings->count(),
                        'earnings_last_30_days' => (float) $recentEarnings,
                        'average_booking_value' => (float) $avgBookingValue,
                        'last_activity' => $lastBooking ? $lastBooking->created_at : null,
                        'recent_reviews_count' => $recentReviews->count(),
                        'recent_average_rating' => (float) $recentAvgRating
                    ],
                    'risk_analysis' => $riskAnalysis,
                    'compliance_checks' => $complianceChecks
                ]
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('Get withdrawal details failed: ' . $e->getMessage(), [
                'withdrawal_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve withdrawal details'
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

        // Get provider's wallet
        $wallet = Wallet::where('providerID', $withdrawal->providerID)->first();
        
        if (!$wallet) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Provider wallet not found'
            ], 404);
        }
        
        // Deduct from available balance NOW (on approval)
        if ($wallet->available_balance < $withdrawal->amount) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Insufficient balance in wallet'
            ], 422);
        }
        
        $wallet->available_balance -= $withdrawal->amount;
        $wallet->save();

        // Initialize Chapa transfer (skip in local/testing environment)
        $chapaTransferId = null;
        $chapaTransferStatus = 'pending';
        
        if (app()->environment('production')) {
            // Only attempt real transfer in production
            $paymentController = app(PaymentController::class);
            $transferResult = $paymentController->initiateTransfer($withdrawal);
            
            if (!$transferResult) {
                // Rollback wallet deduction
                DB::rollBack();
                Log::error('Chapa transfer initiation failed', ['withdrawal_id' => $id]);
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to initiate transfer with Chapa'
                ], 500);
            }
            
            $chapaTransferId = $transferResult['data'] ?? null;
        } else {
            // In development/testing, simulate successful transfer
            $chapaTransferId = 'TEST_TRANSFER_' . time();
            $chapaTransferStatus = 'simulated';
            Log::info('Simulated Chapa transfer (non-production)', [
                'withdrawal_id' => $withdrawal->withdrawalID,
                'amount' => $withdrawal->amount,
                'environment' => app()->environment()
            ]);
        }

        // Update withdrawal with Chapa details
        $withdrawal->status = 'approved';
        $withdrawal->processed_at = now();
        $withdrawal->chapa_transfer_id = $chapaTransferId;
        $withdrawal->chapa_transfer_status = $chapaTransferStatus;
        $withdrawal->save();
        
        // Log the saved transfer ID for debugging
        Log::info('Withdrawal approved', [
            'withdrawal_id' => $withdrawal->withdrawalID,
            'chapa_transfer_id' => $withdrawal->chapa_transfer_id,
            'environment' => app()->environment()
        ]);
        
        // Create wallet transaction record for the deduction
        WalletTransaction::create([
            'walletID' => $wallet->walletID,
            'type' => 'debit',
            'amount' => $withdrawal->amount,
            'description' => 'Withdrawal #' . $withdrawal->withdrawalID . ' approved and processed',
            'bookingID' => null,
            'withdrawalID' => $withdrawal->withdrawalID
        ]);
        
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