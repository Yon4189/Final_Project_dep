<?php
// app/Http/Controllers/ChatController.php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Booking;
use App\Services\NotificationService;
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

        // Only customers can create new conversations
        if ($userType !== 'customer') {
            return response()->json([
                'success' => false,
                'message' => 'Only customers can initiate conversations'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'providerID' => 'required|exists:service_providers,providerID',
            'bookingID' => 'nullable|exists:bookings,bookingID'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Customer is initiating
        $customerID = $user->customerID;
        $providerID = $request->providerID;

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
                    ->with('sender')
                    ->orderBy('created_at', 'asc')
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
            'message' => 'required|string|max:1000'
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
                    'debug' => [
                        'user_type' => $userType,
                        'user_id' => $userType === 'customer' ? $user->customerID : $user->providerID,
                        'conversation_customer' => $conversation->customerID,
                        'conversation_provider' => $conversation->providerID
                    ]
                ], 403);
            }

            // Create message
            $message = Message::create([
                'conversationID' => $conversation->conversationID,
                'sender_type' => $userType,
                'sender_id' => $user->getKey(),
                'message' => $request->message
            ]);

            // Update conversation
            $conversation->last_message = $request->message;
            $conversation->last_message_at = now();

            // Increment unread count for receiver
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

            DB::commit();

            // Load sender info
            $message->load('sender');

            // Send notification
            $senderName = $userType === 'customer' 
                ? $user->fullname 
                : $user->fullname;

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
                        'message_preview' => substr($request->message, 0, 50)
                    ],
                    $conversation->bookingID
                );
            } catch (\Exception $e) {
                // Log but don't fail if notification fails
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

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Chat send failed: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to send message: ' . $e->getMessage()
            ], 500);
        }
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
                                         'latestMessage',
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
                           ->with('sender')
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
}