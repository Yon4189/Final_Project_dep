<?php

namespace App\Http\Controllers;

use App\Models\Dispute;
use App\Models\DisputeMessage;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Wallet;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class AdminDisputeController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }
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

        // Manually resolve the sender for each message (polymorphic safe)
        // Note: The sender relationship is already loaded via eager loading
        // This ensures polymorphic relationships work correctly
        $messages = $dispute->messages->map(function ($msg) {
            // Sender is already loaded, just ensure it's properly formatted
            if (!$msg->sender) {
                $morphMap = [
                    'customer' => [\App\Models\Customer::class, 'customerID'],
                    'provider' => [\App\Models\ServiceProvider::class, 'providerID'],
                    'admin'    => [\App\Models\Admin::class, 'adminID'],
                ];
                
                $map = $morphMap[$msg->sender_type] ?? null;
                if ($map) {
                    [$modelClass, $pk] = $map;
                    try {
                        $sender = $modelClass::select([$pk, 'fullname', 'email', 'profilePicture'])
                            ->find($msg->sender_id);
                        $msg->setRelation('sender', $sender);
                    } catch (\Exception $e) {
                        $msg->setRelation('sender', null);
                    }
                }
            }
            return $msg;
        });

        $dispute->setRelation('messages', $messages);

        // Get related payment info
        $payment = \App\Models\Payment::where('bookingID', $dispute->bookingID)->first();
        
        // Get wallet info for both parties
        $raisedByWallet = null;
        $againstWallet  = null;
        
        if ($dispute->raised_by_type === 'provider') {
            $raisedByWallet = \App\Models\Wallet::where('providerID', $dispute->raised_by_id)->first();
        }
        
        if ($dispute->against_type === 'provider') {
            $againstWallet = \App\Models\Wallet::where('providerID', $dispute->against_id)->first();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'dispute' => $dispute,
                'payment' => $payment,
                'wallets' => [
                    'raised_by' => $raisedByWallet,
                    'against'   => $againstWallet
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

        // ── Refund limit check ────────────────────────────────────────────────
        if ($request->status === 'resolved' && $request->refund_amount > 0) {
            $booking = Booking::find($dispute->bookingID);
            if ($booking && $request->refund_amount > $booking->agreed_price) {
                return response()->json([
                    'success' => false,
                    'message' => "Refund amount ({$request->refund_amount} ETB) cannot exceed the booking amount ({$booking->agreed_price} ETB).",
                ], 422);
            }
        }
        // ── End refund limit check ────────────────────────────────────────────

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

            // Notify parties involved about status change
            $statusMessage = "Dispute #{$disputeID} status updated to: " . str_replace('_', ' ', $request->status);
            if ($request->status === 'resolved') {
                $statusMessage = "Dispute #{$disputeID} has been resolved. Resolution: " . str_replace('_', ' ', $request->resolution_type);
            }

            // Notify raised_by
            $this->notificationService->toUser(
                $dispute->raised_by_type,
                $dispute->raised_by_id,
                'dispute',
                'Dispute Status Updated',
                $statusMessage,
                ['disputeID' => $disputeID],
                $dispute->bookingID
            );

            // Notify against
            $this->notificationService->toUser(
                $dispute->against_type,
                $dispute->against_id,
                'dispute',
                'Dispute Status Updated',
                $statusMessage,
                ['disputeID' => $disputeID],
                $dispute->bookingID
            );

            // Add system message about status change
            DisputeMessage::create([
                'disputeID' => $disputeID,
                'sender_id' => $admin->adminID,
                'sender_type' => 'admin',
                'recipient_type' => 'customer',
                'message' => "Dispute status changed from {$oldStatus} to {$request->status}" . 
                             ($request->notes ? "\nNotes: {$request->notes}" : ''),
                'is_admin_only' => false
            ]);

            // Duplicate for provider thread
            DisputeMessage::create([
                'disputeID' => $disputeID,
                'sender_id' => $admin->adminID,
                'sender_type' => 'admin',
                'recipient_type' => 'provider',
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
            'recipient_type' => 'admin',
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

    /**
     * Delete a dispute message
     */
    public function deleteMessage($messageID)
    {
        $admin = auth()->guard('admin')->user();
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $message = DisputeMessage::find($messageID);
        if (!$message) {
            return response()->json(['success' => false, 'message' => 'Message not found'], 404);
        }

        try {
            $message->delete();
            return response()->json(['success' => true, 'message' => 'Message deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Failed to delete dispute message: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to delete message'], 500);
        }
    }

    /**
     * Admin adds a public message to the dispute
     */
    public function addMessage(Request $request, $disputeID)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string',
            'recipient_type' => 'required|in:customer,provider,admin,both',
            'is_admin_only' => 'boolean'
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
            return response()->json(['success' => false, 'message' => 'Dispute not found'], 404);
        }

        try {
            // Sanitize message content
            $sanitizedMessage = strip_tags($request->message);

            // If sending to both parties, create two messages
            if ($request->recipient_type === 'both') {
                // Create message for customer
                $customerMessage = DisputeMessage::create([
                    'disputeID' => $disputeID,
                    'sender_id' => $admin->adminID,
                    'sender_type' => 'admin',
                    'recipient_type' => 'customer',
                    'message' => $sanitizedMessage,
                    'is_admin_only' => false
                ]);

                // Create message for provider
                $providerMessage = DisputeMessage::create([
                    'disputeID' => $disputeID,
                    'sender_id' => $admin->adminID,
                    'sender_type' => 'admin',
                    'recipient_type' => 'provider',
                    'message' => $sanitizedMessage,
                    'is_admin_only' => false
                ]);

                $message = $customerMessage; // Return first message
            } else {
                // Single recipient
                $message = DisputeMessage::create([
                    'disputeID' => $disputeID,
                    'sender_id' => $admin->adminID,
                    'sender_type' => 'admin',
                    'recipient_type' => $request->recipient_type,
                    'message' => $sanitizedMessage,
                    'is_admin_only' => $request->is_admin_only ?? false
                ]);
            }

            // If it's the first admin message and status is pending, move to under_review
            if ($dispute->status === 'pending') {
                $dispute->status = 'under_review';
                $dispute->save();
            }

            // Send notifications based on recipient_type
            if ($request->recipient_type === 'customer' || $request->recipient_type === 'both') {
                $customerId = $dispute->raised_by_type === 'customer' ? $dispute->raised_by_id : $dispute->against_id;
                $this->notificationService->toUser(
                    'customer',
                    $customerId,
                    'dispute',
                    'New Message from Admin',
                    "Admin has sent you a message regarding dispute #{$disputeID}",
                    ['disputeID' => $disputeID],
                    $dispute->bookingID
                );
            }

            if ($request->recipient_type === 'provider' || $request->recipient_type === 'both') {
                $providerId = $dispute->raised_by_type === 'provider' ? $dispute->raised_by_id : $dispute->against_id;
                $this->notificationService->toUser(
                    'provider',
                    $providerId,
                    'dispute',
                    'New Message from Admin',
                    "Admin has sent you a message regarding dispute #{$disputeID}",
                    ['disputeID' => $disputeID],
                    $dispute->bookingID
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Message sent successfully',
                'data' => $message->load('sender')
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to send dispute message: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to send message'], 500);
        }
    }

    /**
     * Download attachment from dispute message (Admin only)
     * 
     * @param int $disputeID
     * @param int $messageID
     * @param string $filename
     * @return \Illuminate\Http\Response
     */
    public function downloadAttachment($disputeID, $messageID, $filename)
    {
        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        // Verify dispute exists
        $dispute = Dispute::find($disputeID);
        if (!$dispute) {
            return response()->json(['success' => false, 'message' => 'Dispute not found'], 404);
        }

        // Verify message exists and belongs to this dispute
        $message = DisputeMessage::where('messageID', $messageID)
            ->where('disputeID', $disputeID)
            ->first();

        if (!$message) {
            return response()->json(['success' => false, 'message' => 'Message not found'], 404);
        }

        // Find the attachment in the message
        $attachments = $message->attachments ?? [];
        $attachment = null;

        foreach ($attachments as $att) {
            if ($att['name'] === $filename || basename($att['path']) === $filename) {
                $attachment = $att;
                break;
            }
        }

        if (!$attachment) {
            return response()->json(['success' => false, 'message' => 'Attachment not found'], 404);
        }

        // Verify file exists
        $filePath = storage_path('app/public/' . $attachment['path']);
        if (!file_exists($filePath)) {
            Log::warning('Attachment file not found', [
                'path' => $filePath,
                'message_id' => $messageID,
                'dispute_id' => $disputeID
            ]);
            return response()->json(['success' => false, 'message' => 'File not found'], 404);
        }

        // Prevent directory traversal attacks
        $realPath = realpath($filePath);
        $storagePath = realpath(storage_path('app/public'));
        
        if ($realPath === false || strpos($realPath, $storagePath) !== 0) {
            Log::warning('Directory traversal attempt detected', [
                'requested_path' => $filePath,
                'real_path' => $realPath,
                'storage_path' => $storagePath
            ]);
            return response()->json(['success' => false, 'message' => 'Invalid file path'], 403);
        }

        // Log the download
        Log::info('Dispute attachment downloaded by admin', [
            'dispute_id' => $disputeID,
            'message_id' => $messageID,
            'filename' => $filename,
            'admin_id' => $admin->adminID
        ]);

        // Download the file
        return response()->download($filePath, $attachment['name'], [
            'Content-Type' => $attachment['type'] ?? 'application/octet-stream'
        ]);
    }

    /**
     * Edit a message (admin can edit any message)
     * 
     * @param int $messageID
     * @return \Illuminate\Http\JsonResponse
     */
    public function editMessage(Request $request, $messageID)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|min:1|max:5000'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        // Find message
        $message = DisputeMessage::find($messageID);
        if (!$message) {
            return response()->json(['success' => false, 'message' => 'Message not found'], 404);
        }

        // Update message
        $message->message = strip_tags($request->message);
        $message->save();

        Log::info('Dispute message edited by admin', [
            'message_id' => $messageID,
            'dispute_id' => $message->disputeID,
            'admin_id' => $admin->adminID
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Message updated',
            'data' => $message->load('sender')
        ]);
    }

    /**
     * Search messages within a dispute (Admin only)
     * 
     * @param int $disputeID
     * @return \Illuminate\Http\JsonResponse
     */
    public function searchMessages(Request $request, $disputeID)
    {
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|min:2|max:255',
            'limit' => 'integer|min:1|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        // Verify dispute exists
        $dispute = Dispute::find($disputeID);
        if (!$dispute) {
            return response()->json(['success' => false, 'message' => 'Dispute not found'], 404);
        }

        $query = $request->query;
        $limit = $request->limit ?? 50;

        // Admin can search all messages
        $messages = DisputeMessage::where('disputeID', $disputeID)
            ->where('message', 'LIKE', '%' . $query . '%')
            ->with('sender')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        // Highlight search term in results
        $highlightedMessages = $messages->map(function ($msg) use ($query) {
            $highlighted = str_ireplace(
                $query,
                '<mark>' . $query . '</mark>',
                $msg->message
            );
            return [
                'messageID' => $msg->messageID,
                'disputeID' => $msg->disputeID,
                'sender_id' => $msg->sender_id,
                'sender_type' => $msg->sender_type,
                'sender' => $msg->sender,
                'message' => $msg->message,
                'message_highlighted' => $highlighted,
                'created_at' => $msg->created_at,
                'recipient_type' => $msg->recipient_type,
                'is_admin_only' => $msg->is_admin_only
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'query' => $query,
                'count' => $highlightedMessages->count(),
                'messages' => $highlightedMessages
            ]
        ]);
    }

    /**
     * Set typing status for admin
     * 
     * @param Request $request
     * @param int $disputeID
     * @return \Illuminate\Http\JsonResponse
     */
    public function setTypingStatus(Request $request, $disputeID)
    {
        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $dispute = Dispute::find($disputeID);
        if (!$dispute) {
            return response()->json(['success' => false, 'message' => 'Dispute not found'], 404);
        }

        $isTyping = $request->boolean('is_typing', false);
        
        // Store typing status in cache (expires in 5 seconds)
        $cacheKey = "dispute_{$disputeID}_typing_admin_{$admin->id}";
        if ($isTyping) {
            cache()->put($cacheKey, [
                'user_id' => $admin->id,
                'user_type' => 'admin',
                'name' => $admin->name,
                'timestamp' => now()
            ], now()->addSeconds(5));
        } else {
            cache()->forget($cacheKey);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Get typing status for dispute
     * 
     * @param int $disputeID
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTypingStatus($disputeID)
    {
        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $dispute = Dispute::find($disputeID);
        if (!$dispute) {
            return response()->json(['success' => false, 'message' => 'Dispute not found'], 404);
        }

        // Get all typing users for this dispute
        $typingUsers = [];
        
        // Check admin typing status
        $adminCacheKey = "dispute_{$disputeID}_typing_admin_*";
        $adminKeys = cache()->getStore()->connection()->keys($adminCacheKey);
        
        foreach ($adminKeys as $key) {
            $data = cache()->get($key);
            if ($data) {
                $typingUsers[] = $data;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'typing_users' => $typingUsers
            ]
        ]);
    }

    /**
     * Reply to a message (create threaded message)
     * 
     * @param Request $request
     * @param int $disputeID
     * @return \Illuminate\Http\JsonResponse
     */
    public function replyToMessage(Request $request, $disputeID)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:5000',
            'parent_message_id' => 'required|integer|exists:dispute_messages,messageID',
            'recipient_type' => 'required|in:customer,provider,both',
            'is_admin_only' => 'boolean'
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
            return response()->json(['success' => false, 'message' => 'Dispute not found'], 404);
        }

        // Verify parent message exists in this dispute
        $parentMessage = DisputeMessage::where('messageID', $request->parent_message_id)
            ->where('disputeID', $disputeID)
            ->first();

        if (!$parentMessage) {
            return response()->json(['success' => false, 'message' => 'Parent message not found'], 404);
        }

        // Create reply message
        $message = DisputeMessage::create([
            'disputeID' => $disputeID,
            'sender_id' => $admin->id,
            'sender_type' => 'admin',
            'message' => $request->message,
            'recipient_type' => $request->recipient_type,
            'is_admin_only' => $request->boolean('is_admin_only', false),
            'parent_message_id' => $request->parent_message_id
        ]);

        // Notify relevant parties
        $this->notificationService->notifyDisputeMessage(
            $dispute,
            $admin,
            'admin',
            $request->recipient_type,
            $request->message
        );

        return response()->json([
            'success' => true,
            'data' => [
                'message' => $message->load('sender')
            ]
        ]);
    }

    /**
     * Get message thread (parent + replies)
     * 
     * @param int $disputeID
     * @param int $messageID
     * @return \Illuminate\Http\JsonResponse
     */
    public function getMessageThread($disputeID, $messageID)
    {
        $admin = auth()->guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $dispute = Dispute::find($disputeID);
        if (!$dispute) {
            return response()->json(['success' => false, 'message' => 'Dispute not found'], 404);
        }

        // Get parent message
        $parentMessage = DisputeMessage::where('messageID', $messageID)
            ->where('disputeID', $disputeID)
            ->with('sender')
            ->first();

        if (!$parentMessage) {
            return response()->json(['success' => false, 'message' => 'Message not found'], 404);
        }

        // Get all replies to this message
        $replies = DisputeMessage::where('parent_message_id', $messageID)
            ->where('disputeID', $disputeID)
            ->with('sender')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'parent' => $parentMessage,
                'replies' => $replies
            ]
        ]);
    }
}