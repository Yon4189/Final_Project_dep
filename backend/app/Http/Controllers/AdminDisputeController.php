<?php

namespace App\Http\Controllers;

use App\Models\Dispute;
use App\Models\DisputeMessage;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class AdminDisputeController extends Controller
{
    /**
     * Get all disputes (admin view)
     */
    public function index(Request $request)
    {
        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $query = Dispute::with(['booking', 'raisedBy', 'against', 'resolvedBy'])
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by priority
        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        // Search by title or description
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $disputes = $query->paginate(20);

        // Add stats
        $stats = [
            'total' => Dispute::count(),
            'pending' => Dispute::where('status', 'pending')->count(),
            'under_review' => Dispute::where('status', 'under_review')->count(),
            'resolved' => Dispute::where('status', 'resolved')->count(),
            'urgent' => Dispute::where('priority', 'urgent')->where('status', '!=', 'resolved')->count()
        ];

        return response()->json([
            'success' => true,
            'data' => $disputes,
            'stats' => $stats
        ]);
    }

    /**
     * Get dispute details (admin view)
     */
    public function show($disputeID)
    {
        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $dispute = Dispute::with([
            'booking',
            'raisedBy',
            'against',
            'messages.sender',
            'resolvedBy'
        ])->find($disputeID);

        if (!$dispute) {
            return response()->json([
                'success' => false,
                'message' => 'Dispute not found'
            ], 404);
        }

        // Get related payment info
        $payment = Payment::where('bookingID', $dispute->bookingID)->first();
        
        // Get wallet info for both parties
        $raisedByWallet = null;
        $againstWallet = null;
        
        if ($dispute->raised_by_type === 'provider') {
            $raisedByWallet = Wallet::where('providerID', $dispute->raised_by_id)->first();
        }
        
        if ($dispute->against_type === 'provider') {
            $againstWallet = Wallet::where('providerID', $dispute->against_id)->first();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'dispute' => $dispute,
                'payment' => $payment,
                'wallets' => [
                    'raised_by' => $raisedByWallet,
                    'against' => $againstWallet
                ]
            ]
        ]);
    }

    /**
     * Update dispute status (admin)
     */
    public function updateStatus(Request $request, $disputeID)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:under_review,resolved,rejected,escalated',
            'notes' => 'nullable|string',
            'resolution_type' => 'required_if:status,resolved|in:refund,partial_refund,cancellation,warning,dismissed',
            'refund_amount' => 'required_if:resolution_type,refund,partial_refund|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $dispute = Dispute::find($disputeID);
        if (!$dispute) {
            return response()->json([
                'success' => false,
                'message' => 'Dispute not found'
            ], 404);
        }

        try {
            DB::beginTransaction();

            $oldStatus = $dispute->status;
            
            $dispute->status = $request->status;
            $dispute->admin_notes = $request->notes ?? $dispute->admin_notes;
            
            if ($request->status === 'resolved') {
                $dispute->resolution_type = $request->resolution_type;
                $dispute->refund_amount = $request->refund_amount ?? 0;
                $dispute->resolved_at = now();
                $dispute->resolved_by = $admin->adminID;
                
                // Handle refund if applicable
                if (in_array($request->resolution_type, ['refund', 'partial_refund']) && $request->refund_amount > 0) {
                    $this->processRefund($dispute, $request->refund_amount);
                }
                
                // Update booking status
                $booking = Booking::find($dispute->bookingID);
                if ($booking) {
                    $booking->status = 'dispute_resolved';
                    $booking->save();
                }
            }
            
            $dispute->save();

            // Add system message about status change
            DisputeMessage::create([
                'disputeID' => $disputeID,
                'sender_id' => $admin->adminID,
                'sender_type' => 'admin',
                'message' => "Dispute status changed from {$oldStatus} to {$request->status}" . 
                             ($request->notes ? "\nNotes: {$request->notes}" : ''),
                'is_admin_only' => false
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Dispute status updated',
                'data' => $dispute
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update dispute: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update dispute: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add private admin note
     */
    public function addPrivateNote(Request $request, $disputeID)
    {
        $validator = Validator::make($request->all(), [
            'note' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $dispute = Dispute::find($disputeID);
        if (!$dispute) {
            return response()->json([
                'success' => false,
                'message' => 'Dispute not found'
            ], 404);
        }

        // Update admin_notes in disputes table
        $dispute->admin_notes = $request->note;
        $dispute->save();

        // Create private message
        $message = DisputeMessage::create([
            'disputeID' => $disputeID,
            'sender_id' => $admin->adminID,
            'sender_type' => 'admin',
            'message' => $request->note,
            'is_admin_only' => true
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Private note added',
            'data' => [
                'dispute' => [
                    'disputeID' => $dispute->disputeID,
                    'admin_notes' => $dispute->admin_notes,
                    'status' => $dispute->status
                ],
                'message' => $message
            ]
        ]);
    }
    /**
     * Get dispute statistics
     */
    public function stats()
    {
        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $stats = [
            'total' => Dispute::count(),
            'by_status' => [
                'pending' => Dispute::where('status', 'pending')->count(),
                'under_review' => Dispute::where('status', 'under_review')->count(),
                'resolved' => Dispute::where('status', 'resolved')->count(),
                'rejected' => Dispute::where('status', 'rejected')->count(),
                'escalated' => Dispute::where('status', 'escalated')->count()
            ],
            'by_priority' => [
                'urgent' => Dispute::where('priority', 'urgent')->count(),
                'high' => Dispute::where('priority', 'high')->count(),
                'medium' => Dispute::where('priority', 'medium')->count(),
                'low' => Dispute::where('priority', 'low')->count()
            ],
            'by_category' => Dispute::select('category', DB::raw('count(*) as total'))
                ->groupBy('category')
                ->get(),
            'by_raised_by' => [
                'customer' => Dispute::where('raised_by_type', 'customer')->count(),
                'provider' => Dispute::where('raised_by_type', 'provider')->count()
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Process refund for dispute
     */
    private function processRefund($dispute, $amount)
    {
        // Find the payment
        $payment = Payment::where('bookingID', $dispute->bookingID)->first();
        if (!$payment) {
            throw new \Exception('Payment not found for this booking');
        }

        // Mark payment as refunded
        $payment->status = 'refunded';
        $payment->refunded_at = now();
        $payment->refund_amount = $amount;
        $payment->save();

        Log::info('Refund processed for dispute', [
            'dispute_id' => $dispute->disputeID,
            'booking_id' => $dispute->bookingID,
            'amount' => $amount
        ]);
    }
}