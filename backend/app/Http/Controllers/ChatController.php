<?php
// app/Http/Controllers/ChatController.php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Booking;
use App\Services\NotificationService;
use App\Events\MessageSent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get or create a conversation
     */
/**
 * Get or create a conversation (Customer only)
 */
    /**
     * Get or create a conversation (Customer only)
     */
    public function getOrCreateConversation(Request $request)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        // Build validation rules based on the authenticated user type
        $rules = [
            'bookingID' => 'nullable|exists:bookings,bookingID',
        ];
        if ($userType === 'customer') {
            $rules['providerID'] = 'required|integer|exists:service_providers,providerID';
        } else {
            $rules['customerID'] = 'required|integer|exists:customers,customerID';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        if ($userType === 'customer') {
            $customerID = $user->customerID;
            $providerID = $request->providerID;
        } else {
            $providerID = $user->providerID;
            $customerID = $request->customerID;
        }

        // Check if conversation exists
        $query = Conversation::where('customerID', $customerID)
                            ->where('providerID', $providerID);

        if ($request->has('bookingID')) {
            $query->where('bookingID', $request->bookingID);
        } else {
            $query->whereNull('bookingID');
        }

        $conversation = $query->first();

        // If not exists, create it
        if (!$conversation) {
            $conversation = Conversation::create([
                'customerID' => $customerID,
                'providerID' => $providerID,
                'bookingID' => $request->bookingID,
                'last_message_at' => now(),
            ]);
        }

        // Get messages with sender info
        $messages = $conversation->messages()
                    ->with(['customerSender', 'providerSender'])
                    ->orderBy('created_at', 'desc')
                    ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'conversation' => $conversation,
                'messages' => $messages,
                'unread_count' => $conversation->getUnreadCountFor($userType)
            ]
        ]);
    }

    /**
     * Send a message
     */
    public function sendMessage(Request $request)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        $validator = Validator::make($request->all(), [
            'conversationID' => 'required|exists:conversations,conversationID',
            'message' => 'nullable|string|max:1000',
            'file' => 'nullable|file|max:10240|mimes:jpeg,png,jpg,gif,pdf,doc,docx,xls,xlsx,txt' // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // First, get the conversation
            $conversation = Conversation::find($request->conversationID);
            
            if (!$conversation) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Conversation not found'
                ], 404);
            }

            // Verify user has access
            $hasAccess = false;
            if ($userType === 'customer' && $conversation->customerID == $user->customerID) {
                $hasAccess = true;
            } elseif ($userType === 'provider' && $conversation->providerID == $user->providerID) {
                $hasAccess = true;
            }

            if (!$hasAccess) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have access to this conversation',
                ], 403);
            }

            // Handle file upload if present
            $fileData = [];
            if ($request->hasFile('file')) {
                $fileData = $this->uploadChatFile($request->file('file'));
            }
            
            // Create message
            $messageData = [
                'conversationID' => $conversation->conversationID,
                'sender_type' => $userType,
                'sender_id' => $user->getKey(),
                'message' => $request->message ?? ''
            ];

            // Merge file data if present
            if (!empty($fileData)) {
                $messageData = array_merge($messageData, $fileData);
            }

            $message = Message::create($messageData);

            // Update conversation last message & unread counts
            $conversation->last_message = $request->message;
            $conversation->last_message_at = now();

            if ($userType === 'customer') {
                $conversation->provider_unread_count++;
                $receiverId = $conversation->providerID;
                $receiverType = 'provider';
            } else {
                $conversation->customer_unread_count++;
                $receiverId = $conversation->customerID;
                $receiverType = 'customer';
            }

            $conversation->save();

            // Commit BEFORE any post-processing so a failure below never creates a 500
            DB::commit();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Chat send failed: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to send message: ' . $e->getMessage()
            ], 500);
        }

        // Post-commit: broadcast via WebSocket and send push notification.
        // Any failure here must NOT return 500 — the message is saved.
        // -----------------------------------------------------------
        try {
            $message->refresh();
        } catch (\Exception $e) {
            Log::warning('Failed to refresh message after save: ' . $e->getMessage());
        }

        // Broadcast the new message to all channel subscribers in real time.
        try {
            broadcast(new MessageSent($message))->toOthers();
        } catch (\Exception $e) {
            Log::warning('WebSocket broadcast failed (non-fatal): ' . $e->getMessage());
        }

        $senderName = $user->fullname ?? 'User';

        try {
            $this->notificationService->toUser(
                $receiverType,
                $receiverId,
                'new_message',
                'New Message',
                $senderName . ' sent you a message',
                [
                    'conversationID' => $conversation->conversationID,
                    'sender_name' => $senderName,
                    'message_preview' => $request->hasFile('file') 
                        ? '📎 Sent a file: ' . $request->file('file')->getClientOriginalName()
                        : substr($request->message ?? '', 0, 50)
                ],
                $conversation->bookingID
            );
        } catch (\Exception $e) {
            Log::warning('Failed to send notification for message: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Message sent',
            'data' => [
                'message' => $message,
                'conversation' => [
                    'id' => $conversation->conversationID,
                    'unread_count' => $conversation->getUnreadCountFor($userType)
                ]
            ]
        ]);
    }

    /**
     * Get conversations for the authenticated user
     */
    public function getConversations(Request $request)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        $conversations = Conversation::where($userType . 'ID', $user->getKey())
                                     ->with([
                                         'customer',
                                         'provider',
                                         'latestMessage' => function($q) {
                                             $q->with(['customerSender', 'providerSender']);
                                         },
                                         'booking' => function($q) {
                                             $q->select('bookingID', 'status', 'scheduledDate');
                                         }
                                     ])
                                     ->orderBy('last_message_at', 'desc')
                                     ->paginate(20);

        // Add unread counts and other metadata
        $conversations->getCollection()->transform(function ($conv) use ($userType) {
            $conv->unread_count = $conv->getUnreadCountFor($userType);
            $conv->other_party = $userType === 'customer' 
                ? $conv->provider 
                : $conv->customer;
            
            // Hide sensitive info
            if ($conv->other_party) {
                $conv->other_party->makeHidden(['password', 'remember_token', 'walletBalance']);
            }
            
            return $conv;
        });

        return response()->json([
            'success' => true,
            'data' => $conversations
        ]);
    }

    /**
     * Get messages for a specific conversation
     */
    public function getMessages(Request $request, $conversationId)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        // Verify user has access to this conversation
        $conversation = Conversation::where('conversationID', $conversationId)
                                    ->where($userType . 'ID', $user->getKey())
                                    ->first();

        if (!$conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Conversation not found'
            ], 404);
        }

        // Get messages with pagination
        $messages = Message::where('conversationID', $conversationId)
                           ->with(['customerSender', 'providerSender'])
                           ->orderBy('created_at', 'desc')
                           ->paginate(50);

        // Mark messages as read
        $conversation->markAsRead($userType);

        return response()->json([
            'success' => true,
            'data' => [
                'conversation' => $conversation,
                'messages' => $messages
            ]
        ]);
    }

    /**
     * Mark messages as read
     */
    public function markAsRead(Request $request, $conversationId)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        $conversation = Conversation::where('conversationID', $conversationId)
                                    ->where($userType . 'ID', $user->getKey())
                                    ->first();

        if (!$conversation) {
            return response()->json([
                'success' => false,
                'message' => 'Conversation not found'
            ], 404);
        }

        $conversation->markAsRead($userType);

        return response()->json([
            'success' => true,
            'message' => 'Messages marked as read'
        ]);
    }

    /**
     * Get unread count for all conversations
     */
    public function getUnreadCount(Request $request)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        $totalUnread = Conversation::where($userType . 'ID', $user->getKey())
                                   ->sum($userType . '_unread_count');

        return response()->json([
            'success' => true,
            'data' => [
                'total_unread' => $totalUnread
            ]
        ]);
    }

    /**
     * Determine user type
     */
    private function getUserType($user)
    {
        if ($user instanceof \App\Models\Customer) {
            return 'customer';
        } elseif ($user instanceof \App\Models\ServiceProvider) {
            return 'provider';
        }
        
        throw new \Exception('Invalid user type');
    }

    /**
     * Upload a file to chat
     */
    private function uploadChatFile($file)
    {
        $path = $file->store('chat-files/' . date('Y/m/d'), 'public');
        
        return [
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType()
        ];
    }
}