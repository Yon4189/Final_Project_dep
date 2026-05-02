<?php

namespace App\Http\Controllers;

use App\Models\Dispute;
use App\Models\DisputeMessage;
use App\Models\Booking;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class DisputeController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }
    /**
     * Get authenticated user from any guard
     */
    private function getAuthenticatedUser()
    {
        return auth()->guard('customer')->user() ?? 
               auth()->guard('provider')->user() ?? 
               auth()->guard('admin')->user();
    }

    /**
     * Customer raises a dispute
     */
    public function customerRaiseDispute(Request $request, $bookingID)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|in:payment,service_quality,no_show,behavior,other',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf,doc,docx|max:5120'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        // Find booking
        $booking = Booking::where('bookingID', $bookingID)
            ->where('customerID', $customer->customerID)
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found'
            ], 404);
        }

        // Check if dispute already exists
        $existingDispute = Dispute::where('bookingID', $bookingID)->first();
        if ($existingDispute) {
            return response()->json([
                'success' => false,
                'message' => 'A dispute for this booking already exists'
            ], 422);
        }

        // Handle file uploads
        $attachments = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('disputes/' . $bookingID, 'public');
                $attachments[] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'type' => $file->getMimeType(),
                    'size' => $file->getSize()
                ];
            }
        }

        try {
            DB::beginTransaction();

            $dispute = Dispute::create([
                'bookingID' => $bookingID,
                'raised_by_id' => $customer->customerID,
                'raised_by_type' => 'customer',
                'against_id' => $booking->providerID,
                'against_type' => 'provider',
                'title' => $request->title,
                'description' => $request->description,
                'category' => $request->category ?? 'other',
                'attachments' => !empty($attachments) ? $attachments : null,
                'status' => 'pending',
                'priority' => $this->determinePriority($request->category)
            ]);

            // Add initial message
            DisputeMessage::create([
                'disputeID' => $dispute->disputeID,
                'sender_id' => $customer->customerID,
                'sender_type' => 'customer',
                'recipient_type' => 'admin',
                'message' => $request->description,
                'attachments' => !empty($attachments) ? $attachments : null
            ]);

            // Update booking status
            $booking->status = 'disputed';
            $booking->save();

            try {
                // Notify admins
                $this->notificationService->notifyAdminsNewDispute($dispute, $booking);

                // Notify provider
                $this->notificationService->toProvider(
                    $booking->providerID,
                    'dispute',
                    'A Dispute has been raised against you',
                    "A customer has raised a dispute regarding booking #{$bookingID}. Please review and respond in the app.",
                    ['disputeID' => $dispute->disputeID, 'bookingID' => $bookingID],
                    $bookingID
                );
            } catch (\Exception $ne) {
                Log::warning('Dispute raise notifications failed: ' . $ne->getMessage());
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Dispute raised successfully',
                'data' => $dispute->load('raisedBy', 'against')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to raise dispute: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to raise dispute: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Provider raises a dispute
     */
    public function providerRaiseDispute(Request $request, $bookingID)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|in:payment,no_show,behavior,cancellation,other',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf,doc,docx|max:5120'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $provider = auth()->guard('provider')->user();
        
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        // Find booking
        $booking = Booking::where('bookingID', $bookingID)
            ->where('providerID', $provider->providerID)
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found'
            ], 404);
        }

        // Check if dispute already exists
        $existingDispute = Dispute::where('bookingID', $bookingID)->first();
        if ($existingDispute) {
            return response()->json([
                'success' => false,
                'message' => 'A dispute for this booking already exists'
            ], 422);
        }

        // Handle file uploads
        $attachments = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('disputes/' . $bookingID, 'public');
                $attachments[] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'type' => $file->getMimeType(),
                    'size' => $file->getSize()
                ];
            }
        }

        try {
            DB::beginTransaction();

            $dispute = Dispute::create([
                'bookingID' => $bookingID,
                'raised_by_id' => $provider->providerID,
                'raised_by_type' => 'provider',
                'against_id' => $booking->customerID,
                'against_type' => 'customer',
                'title' => $request->title,
                'description' => $request->description,
                'category' => $request->category ?? 'other',
                'attachments' => !empty($attachments) ? $attachments : null,
                'status' => 'pending',
                'priority' => $this->determinePriority($request->category)
            ]);

            // Add initial message
            DisputeMessage::create([
                'disputeID' => $dispute->disputeID,
                'sender_id' => $provider->providerID,
                'sender_type' => 'provider',
                'recipient_type' => 'admin',
                'message' => $request->description,
                'attachments' => !empty($attachments) ? $attachments : null
            ]);

            // Update booking status
            $booking->status = 'disputed';
            $booking->save();

            // Notify admins
            $this->notificationService->notifyAdminsNewDispute($dispute, $booking);

            // Notify customer
            $this->notificationService->toCustomer(
                $booking->customerID,
                'dispute',
                'A Dispute has been raised against you',
                "The service provider has raised a dispute regarding booking #{$bookingID}. Please review and respond in the app.",
                ['disputeID' => $dispute->disputeID, 'bookingID' => $bookingID],
                $bookingID
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Dispute raised successfully',
                'data' => $dispute->load('raisedBy', 'against')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to raise dispute: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to raise dispute: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get disputes for customer
     */
    public function getCustomerDisputes(Request $request)
    {
        $customer = $request->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $query = Dispute::involvingCustomer($customer->customerID);

        // Add status filter if provided
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        
        $disputes = $query->with(['booking', 'raisedBy', 'against'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $disputes
        ]);
    }

    /**
     * Get disputes for provider
     */
    public function getProviderDisputes(Request $request)
    {
        $provider = $request->user();
        
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        // Use the primary key explicitly to avoid any potential null issues
        $providerID = $provider->providerID ?? $provider->id;
        
        $query = Dispute::involvingProvider($providerID);

        // Add status filter if provided
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        
        $disputes = $query->with(['booking', 'raisedBy', 'against'])
            ->orderBy('created_at', 'desc')
            ->paginate(50); // Increased limit for providers

        return response()->json([
            'success' => true,
            'data' => $disputes
        ]);
    }

    /**
     * Get single dispute details
     */
    public function show($disputeID)
    {
        $user = $this->getAuthenticatedUser();
        
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $userType = $this->getUserType($user);
        
        $dispute = Dispute::with(['booking', 'raisedBy', 'against'])
            ->find($disputeID);

        if (!$dispute) {
            return response()->json([
                'success' => false,
                'message' => 'Dispute not found'
            ], 404);
        }

        // Check if user is involved
        if (!$this->isUserInvolved($dispute, $user, $userType)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        // Filter messages based on user type
        if ($userType === 'customer') {
            $dispute->load(['messages' => function($query) use ($user) {
                $query->where(function($q) use ($user) {
                    $q->where('recipient_type', 'customer')
                      ->orWhere(function($sq) use ($user) {
                          $sq->where('sender_type', 'customer')
                             ->where('sender_id', $user->customerID);
                      });
                })
                ->where('is_admin_only', false)
                ->with('sender');
            }]);
        } elseif ($userType === 'provider') {
            $dispute->load(['messages' => function($query) use ($user) {
                $query->where(function($q) use ($user) {
                    $q->where('recipient_type', 'provider')
                      ->orWhere(function($sq) use ($user) {
                          $sq->where('sender_type', 'provider')
                             ->where('sender_id', $user->providerID);
                      });
                })
                ->where('is_admin_only', false)
                ->with('sender');
            }]);
        } else {
            // Admin sees all messages including private notes
            $dispute->load(['messages.sender']);
        }

        return response()->json([
            'success' => true,
            'data' => $dispute
        ]);
    }

    /**
     * Add message to dispute
     */
    public function addMessage(Request $request, $disputeID)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,pdf,doc,docx,mp4,mov,avi,webm|max:51200',
            'is_admin_only' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $user = $this->getAuthenticatedUser();
        
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $userType = $this->getUserType($user);

        $dispute = Dispute::find($disputeID);
        if (!$dispute) {
            return response()->json([
                'success' => false,
                'message' => 'Dispute not found'
            ], 404);
        }

        // Check if user is involved
        if (!$this->isUserInvolved($dispute, $user, $userType)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        // Process attachments with video support
        $attachments = $this->processAttachments($request, $dispute->bookingID);

        // Get sender ID based on type
        $senderId = null;
        if ($userType === 'customer') {
            $senderId = $user->customerID;
        } elseif ($userType === 'provider') {
            $senderId = $user->providerID;
        } elseif ($userType === 'admin') {
            $senderId = $user->adminID;
        }

        // Sanitize message content
        $sanitizedMessage = strip_tags($request->message);

        // Determine recipient_type: customer/provider messages go to admin
        $recipientType = ($userType === 'customer' || $userType === 'provider') ? 'admin' : 'customer';

        $message = DisputeMessage::create([
            'disputeID' => $disputeID,
            'sender_id' => $senderId,
            'sender_type' => $userType,
            'recipient_type' => $recipientType,
            'message' => $sanitizedMessage,
            'attachments' => !empty($attachments) ? $attachments : null,
            'is_admin_only' => $request->is_admin_only ?? false
        ]);

        // Update status if pending
        if ($dispute->status === 'pending') {
            $dispute->status = 'under_review';
            $dispute->save();
        }

        try {
            // Send notifications to all relevant parties
            if ($userType === 'customer') {
                // Notify admins
                $customer = \App\Models\Customer::find($senderId);
                $this->notificationService->notifyAdminsDisputeMessage(
                    $dispute,
                    $message,
                    'customer',
                    $customer->fullname ?? 'Customer'
                );
                
                // Notify provider (the other party)
                $providerId = $dispute->raised_by_type === 'provider' ? $dispute->raised_by_id : $dispute->against_id;
                $this->notificationService->toUser(
                    'provider',
                    $providerId,
                    'dispute',
                    'New Message in Dispute',
                    "Customer has sent a message in dispute #{$disputeID}",
                    ['disputeID' => $disputeID],
                    $dispute->bookingID
                );
            } elseif ($userType === 'provider') {
                // Notify admins
                $provider = \App\Models\ServiceProvider::find($senderId);
                $this->notificationService->notifyAdminsDisputeMessage(
                    $dispute,
                    $message,
                    'provider',
                    $provider->fullname ?? 'Provider'
                );
                
                // Notify customer (the other party)
                $customerId = $dispute->raised_by_type === 'customer' ? $dispute->raised_by_id : $dispute->against_id;
                $this->notificationService->toUser(
                    'customer',
                    $customerId,
                    'dispute',
                    'New Message in Dispute',
                    "Provider has sent a message in dispute #{$disputeID}",
                    ['disputeID' => $disputeID],
                    $dispute->bookingID
                );
            }
        } catch (\Exception $ne) {
            Log::warning('Dispute message notifications failed: ' . $ne->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Message added',
            'data' => $message->load('sender')
        ], 201);
    }

    /**
     * Determine priority based on category
     */
    private function determinePriority($category)
    {
        $urgent = ['payment', 'no_show', 'cancellation'];
        $high = ['service_quality', 'behavior'];
        
        if (in_array($category, $urgent)) return 'urgent';
        if (in_array($category, $high)) return 'high';
        return 'medium';
    }

    /**
     * Get user type
     */
    private function getUserType($user)
    {
        if ($user && isset($user->customerID)) return 'customer';
        if ($user && isset($user->providerID)) return 'provider';
        if ($user && isset($user->adminID)) return 'admin';
        return null;
    }

    /**
     * Check if user is involved in the dispute
     */
    private function isUserInvolved($dispute, $user, $userType)
    {
        // Admin can access all disputes
        if ($userType === 'admin') {
            return true;
        }

        // Check if customer is involved
        if ($userType === 'customer') {
            return ($dispute->raised_by_type === 'customer' && $dispute->raised_by_id == $user->customerID) ||
                   ($dispute->against_type === 'customer' && $dispute->against_id == $user->customerID);
        }

        // Check if provider is involved
        if ($userType === 'provider') {
            return ($dispute->raised_by_type === 'provider' && $dispute->raised_by_id == $user->providerID) ||
                   ($dispute->against_type === 'provider' && $dispute->against_id == $user->providerID);
        }

        return false;
    }

    /**
     * Process file attachments with video support
     */
    private function processAttachments($request, $bookingID)
    {
        $attachments = [];
        
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                // Validate attachment
                $validation = $this->validateAttachment($file);
                if (!$validation['valid']) {
                    throw new \Exception($validation['error']);
                }

                $path = $file->store('disputes/' . $bookingID, 'public');
                $attachments[] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'type' => $file->getMimeType(),
                    'size' => $file->getSize()
                ];
            }
        }

        return $attachments;
    }

    /**
     * Validate attachment file
     */
    private function validateAttachment($file)
    {
        $mimeType = $file->getMimeType();
        $extension = strtolower($file->getClientOriginalExtension());
        $size = $file->getSize();

        // Define allowed types
        $documentTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        $videoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
        
        $documentExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
        $videoExtensions = ['mp4', 'mov', 'avi', 'webm'];

        // Check if it's a document
        if (in_array($mimeType, $documentTypes) && in_array($extension, $documentExtensions)) {
            if ($size > 5 * 1024 * 1024) { // 5MB
                return ['valid' => false, 'error' => 'Document file size must not exceed 5MB'];
            }
            return ['valid' => true];
        }

        // Check if it's a video
        if (in_array($mimeType, $videoTypes) && in_array($extension, $videoExtensions)) {
            if ($size > 50 * 1024 * 1024) { // 50MB
                return ['valid' => false, 'error' => 'Video file size must not exceed 50MB'];
            }
            return ['valid' => true];
        }

        return ['valid' => false, 'error' => 'Invalid file type. Allowed: jpg, jpeg, png, pdf, doc, docx, mp4, mov, avi, webm'];
    }

    /**
     * Download attachment from dispute message
     * 
     * @param int $disputeID
     * @param int $messageID
     * @param string $filename
     * @return \Illuminate\Http\Response
     */
    public function downloadAttachment($disputeID, $messageID, $filename)
    {
        $user = $this->getAuthenticatedUser();
        
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $userType = $this->getUserType($user);

        // Verify dispute exists and user is involved
        $dispute = Dispute::find($disputeID);
        if (!$dispute) {
            return response()->json(['success' => false, 'message' => 'Dispute not found'], 404);
        }

        if (!$this->isUserInvolved($dispute, $user, $userType)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Verify message exists and belongs to this dispute
        $message = DisputeMessage::where('messageID', $messageID)
            ->where('disputeID', $disputeID)
            ->first();

        if (!$message) {
            return response()->json(['success' => false, 'message' => 'Message not found'], 404);
        }

        // Verify user can access this message
        if ($userType === 'customer' && $message->recipient_type !== 'customer') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($userType === 'provider' && $message->recipient_type !== 'provider') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Verify admin-only messages are not accessible to users
        if ($message->is_admin_only && $userType !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
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
        Log::info('Dispute attachment downloaded', [
            'dispute_id' => $disputeID,
            'message_id' => $messageID,
            'filename' => $filename,
            'user_type' => $userType,
            'user_id' => $userType === 'customer' ? $user->customerID : ($userType === 'provider' ? $user->providerID : $user->adminID)
        ]);

        // Download the file
        return response()->download($filePath, $attachment['name'], [
            'Content-Type' => $attachment['type'] ?? 'application/octet-stream'
        ]);
    }

    /**
     * Edit a message (user can only edit their own messages)
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

        $user = $this->getAuthenticatedUser();
        
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $userType = $this->getUserType($user);

        // Find message
        $message = DisputeMessage::find($messageID);
        if (!$message) {
            return response()->json(['success' => false, 'message' => 'Message not found'], 404);
        }

        // Verify user is the sender
        $senderId = $userType === 'customer' ? $user->customerID : ($userType === 'provider' ? $user->providerID : $user->adminID);
        if ($message->sender_id !== $senderId || $message->sender_type !== $userType) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Update message
        $message->message = strip_tags($request->message);
        $message->save();

        Log::info('Dispute message edited', [
            'message_id' => $messageID,
            'dispute_id' => $message->disputeID,
            'user_type' => $userType
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Message updated',
            'data' => $message->load('sender')
        ]);
    }

    /**
     * Delete a message (user can only delete their own messages)
     * 
     * @param int $messageID
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteUserMessage($messageID)
    {
        $user = $this->getAuthenticatedUser();
        
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $userType = $this->getUserType($user);

        // Find message
        $message = DisputeMessage::find($messageID);
        if (!$message) {
            return response()->json(['success' => false, 'message' => 'Message not found'], 404);
        }

        // Verify user is the sender
        $senderId = $userType === 'customer' ? $user->customerID : ($userType === 'provider' ? $user->providerID : $user->adminID);
        if ($message->sender_id !== $senderId || $message->sender_type !== $userType) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $disputeID = $message->disputeID;
        $message->delete();

        Log::info('Dispute message deleted by user', [
            'message_id' => $messageID,
            'dispute_id' => $disputeID,
            'user_type' => $userType
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Message deleted'
        ]);
    }

    /**
     * Search messages within a dispute
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

        $user = $this->getAuthenticatedUser();
        
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $userType = $this->getUserType($user);

        // Verify dispute exists and user is involved
        $dispute = Dispute::find($disputeID);
        if (!$dispute) {
            return response()->json(['success' => false, 'message' => 'Dispute not found'], 404);
        }

        if (!$this->isUserInvolved($dispute, $user, $userType)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $query = $request->query;
        $limit = $request->limit ?? 50;

        // Build search query with proper filtering
        $messagesQuery = DisputeMessage::where('disputeID', $disputeID)
            ->where('message', 'LIKE', '%' . $query . '%')
            ->with('sender');

        // Apply user-specific filtering
        if ($userType === 'customer') {
            $messagesQuery->where('recipient_type', 'customer')
                         ->where('is_admin_only', false);
        } elseif ($userType === 'provider') {
            $messagesQuery->where('recipient_type', 'provider')
                         ->where('is_admin_only', false);
        }
        // Admin sees all messages

        $messages = $messagesQuery->orderBy('created_at', 'desc')
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
     * Clear message history for customer/provider
     */
    public function clearHistory($disputeID)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $userType = $this->getUserType($user);
        $dispute = Dispute::find($disputeID);

        if (!$dispute) {
            return response()->json(['success' => false, 'message' => 'Dispute not found'], 404);
        }

        if (!$this->isUserInvolved($dispute, $user, $userType)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        try {
            // For customers/providers, we only delete public messages
            // Private admin notes should remain in the database
            DisputeMessage::where('disputeID', $disputeID)
                ->where('is_admin_only', false)
                ->delete();

            Log::info("Dispute history cleared by {$userType}", [
                'dispute_id' => $disputeID,
                'user_id' => $user->id ?? $user->customerID ?? $user->providerID
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Chat history cleared successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to clear dispute history: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to clear history'], 500);
        }
    }

    /**
     * Delete a specific message
     */
    public function deleteMessage($disputeID, $messageID)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        $userType = $this->getUserType($user);

        $message = DisputeMessage::where('disputeID', $disputeID)->find($messageID);
        if (!$message) {
            return response()->json(['success' => false, 'message' => 'Message not found'], 404);
        }

        // Only sender or admin can delete
        $isSender = false;
        if ($userType === 'customer' && $message->sender_type === 'customer' && $message->sender_id == $user->customerID) {
            $isSender = true;
        } elseif ($userType === 'provider' && $message->sender_type === 'provider' && $message->sender_id == $user->providerID) {
            $isSender = true;
        }

        if (!$isSender && $userType !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        try {
            $message->delete();
            return response()->json(['success' => true, 'message' => 'Message deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete message'], 500);
        }
    }
}