<?php
// app/Http/Controllers/NotificationController.php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    /**
     * Get all notifications for the authenticated user
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        $query = Notification::where('notifiable_type', $userType)
                            ->where('notifiable_id', $user->getKey());

        // Filter by read/unread
        if ($request->has('filter')) {
            if ($request->filter === 'unread') {
                $query->where('is_seen', false);
            } elseif ($request->filter === 'read') {
                $query->where('is_seen', true);
            }
        }

        // Paginate
        $notifications = $query->orderBy('created_at', 'desc')
                               ->paginate($request->get('per_page', 20));

        // Add unread count to response
        $unreadCount = Notification::where('notifiable_type', $userType)
                                   ->where('notifiable_id', $user->getKey())
                                   ->where('is_seen', false)
                                   ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $notifications,
                'unread_count' => $unreadCount
            ]
        ]);
    }

    /**
     * Get a single notification
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        $notification = Notification::where('notificationID', $id)
                                    ->where('notifiable_type', $userType)
                                    ->where('notifiable_id', $user->getKey())
                                    ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notification not found'
            ], 404);
        }

        // Auto-mark as seen when viewed
        if (!$notification->is_seen) {
            $notification->markAsSeen();
        }

        // Load related booking if exists
        if ($notification->related_booking_id) {
            $notification->load('booking');
        }

        return response()->json([
            'success' => true,
            'data' => $notification
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        $notification = Notification::where('notificationID', $id)
                                    ->where('notifiable_type', $userType)
                                    ->where('notifiable_id', $user->getKey())
                                    ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notification not found'
            ], 404);
        }

        $notification->markAsSeen();

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read'
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        Notification::where('notifiable_type', $userType)
                    ->where('notifiable_id', $user->getKey())
                    ->where('is_seen', false)
                    ->update([
                        'is_seen' => true,
                        'seen_at' => now()
                    ]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read'
        ]);
    }

    /**
     * Delete a notification
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        $notification = Notification::where('notificationID', $id)
                                    ->where('notifiable_type', $userType)
                                    ->where('notifiable_id', $user->getKey())
                                    ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notification not found'
            ], 404);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted'
        ]);
    }

    /**
     * Delete all notifications
     */
    public function deleteAll(Request $request)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        Notification::where('notifiable_type', $userType)
                    ->where('notifiable_id', $user->getKey())
                    ->delete();

        return response()->json([
            'success' => true,
            'message' => 'All notifications deleted'
        ]);
    }

    /**
     * Get unread count only
     */
    public function unreadCount(Request $request)
    {
        $user = $request->user();
        $userType = $this->getUserType($user);

        $count = Notification::where('notifiable_type', $userType)
                             ->where('notifiable_id', $user->getKey())
                             ->where('is_seen', false)
                             ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'unread_count' => $count
            ]
        ]);
    }

    /**
     * Determine user type (customer or provider)
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
     * Get notifications for authenticated customer
     */
    public function getCustomerNotifications(Request $request)
    {
        $customer = $request->user();
        
        $notifications = Notification::where('notifiable_type', 'customer')
            ->where('notifiable_id', $customer->customerID)
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        
        $unreadCount = Notification::where('notifiable_type', 'customer')
            ->where('notifiable_id', $customer->customerID)
            ->where('is_seen', false)
            ->count();
        
        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $notifications,
                'unread_count' => $unreadCount
            ]
        ]);
    }

    /**
     * Get notifications for authenticated provider
     */
    public function getProviderNotifications(Request $request)
    {
        $provider = $request->user();
        
        $notifications = Notification::where('notifiable_type', 'provider')
            ->where('notifiable_id', $provider->providerID)
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        
        $unreadCount = Notification::where('notifiable_type', 'provider')
            ->where('notifiable_id', $provider->providerID)
            ->where('is_seen', false)
            ->count();
        
        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $notifications,
                'unread_count' => $unreadCount
            ]
        ]);
    }
}