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

            // Notify admins
            $this->notificationService->toAdmins(
                'dispute',
                'New Dispute Raised',
                "Customer {$customer->first_name} has raised a dispute for booking #{$bookingID}",
                ['disputeID' => $dispute->disputeID, 'bookingID' => $bookingID]
            );

            // Notify provider
            $this->notificationService->toProvider(
                $booking->providerID,
                'dispute',
                'A Dispute has been raised against you',
                "A customer has raised a dispute regarding booking #{$bookingID}. Please review and respond in the app.",
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
            $this->notificationService->toAdmins(
                'dispute',
                'New Dispute Raised by Provider',
                "Provider {$provider->business_name} has raised a dispute for booking #{$bookingID}",
                ['disputeID' => $dispute->disputeID, 'bookingID' => $bookingID]
            );

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
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $disputes = Dispute::where('raised_by_id', $customer->customerID)
            ->where('raised_by_type', 'customer')
            ->orWhere(function($query) use ($customer) {
                $query->where('against_id', $customer->customerID)
                      ->where('against_type', 'customer');
            })
            ->with(['booking', 'raisedBy', 'against'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

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
        $provider = auth()->guard('provider')->user();
        
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $disputes = Dispute::where('raised_by_id', $provider->providerID)
            ->where('raised_by_type', 'provider')
            ->orWhere(function($query) use ($provider) {
                $query->where('against_id', $provider->providerID)
                      ->where('against_type', 'provider');
            })
            ->with(['booking', 'raisedBy', 'against'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

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

        // Filter messages by recipient_type based on user type
        if ($userType === 'customer') {
            $dispute->load(['messages' => function($query) {
                $query->where('recipient_type', 'customer')->with('sender');
            }]);
        } elseif ($userType === 'provider') {
            $dispute->load(['messages' => function($query) {
                $query->where('recipient_type', 'provider')->with('sender');
            }]);
        } else {
            // Admin sees all messages
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

        // Send notifications (only to admin, not to other party)
        if ($userType === 'customer') {
            $customer = \App\Models\Customer::find($senderId);
            $this->notificationService->notifyAdminsDisputeMessage(
                $dispute,
                $message,
                'customer',
                $customer->fullname ?? 'Customer'
            );
        } elseif ($userType === 'provider') {
            $provider = \App\Models\ServiceProvider::find($senderId);
            $this->notificationService->notifyAdminsDisputeMessage(
                $dispute,
                $message,
                'provider',
                $provider->fullname ?? 'Provider'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Message added',
            'data' => $message->load('sender')
        ]);
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
}