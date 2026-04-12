<?php
// app/Services/NotificationService.php

namespace App\Services;

use App\Models\Notification;
use App\Models\Customer;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Events\BookingUpdated;

class NotificationService
{
    /**
     * Send a notification to a customer
     */
    public function toCustomer($customerId, $type, $title, $message, $data = [], $bookingId = null)
    {
        return $this->create([
            'notifiable_type' => 'customer',
            'notifiable_id' => $customerId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'related_booking_id' => $bookingId
        ]);
    }

    /**
     * Send a notification to a provider
     */
    public function toProvider($providerId, $type, $title, $message, $data = [], $bookingId = null)
    {
        return $this->create([
            'notifiable_type' => 'provider',
            'notifiable_id' => $providerId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'related_booking_id' => $bookingId
        ]);
    }

    /**
     * Send a notification to an admin
     */
    public function toAdmin($adminId, $type, $title, $message, $data = [])
    {
        return $this->create([
            'notifiable_type' => 'admin',
            'notifiable_id' => $adminId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data
        ]);
    }

    /**
     * Send notification to all admins
     */
    public function toAdmins($type, $title, $message, $data = [])
    {
        $admins = \App\Models\Admin::all();
        $notifications = [];
        foreach ($admins as $admin) {
            $notifications[] = $this->toAdmin($admin->adminID, $type, $title, $message, $data);
        }
        return $notifications;
    }

    /**
     * Send notification to multiple customers
     */
    public function toCustomers(array $customerIds, $type, $title, $message, $data = [], $bookingId = null)
    {
        $notifications = [];
        foreach ($customerIds as $customerId) {
            $notifications[] = $this->toCustomer($customerId, $type, $title, $message, $data, $bookingId);
        }
        return $notifications;
    }

    /**
     * Send notification to multiple providers
     */
    public function toProviders(array $providerIds, $type, $title, $message, $data = [], $bookingId = null)
    {
        $notifications = [];
        foreach ($providerIds as $providerId) {
            $notifications[] = $this->toProvider($providerId, $type, $title, $message, $data, $bookingId);
        }
        return $notifications;
    }

    /**
     * Create notification in database
     */
    private function create(array $data)
    {
        try {
            Log::info('Creating notification', ['data' => $data]);
            $notification = Notification::create($data);
            Log::info('Notification created', ['id' => $notification->notificationID]);
            
            // Trigger WebSocket broadcast
            event(new BookingUpdated($notification));

            // Send push notification
            $this->sendPushNotification($notification);
            
            return $notification;
        } catch (\Exception $e) {
            Log::error('Failed to create notification: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Send push notification using Expo Push API
     */
    private function sendPushNotification($notification)
    {
        try {
            // Get user to find push token
            $user = null;
            if ($notification->notifiable_type === 'customer') {
                $user = Customer::find($notification->notifiable_id);
            } elseif ($notification->notifiable_type === 'provider') {
                $user = ServiceProvider::find($notification->notifiable_id);
            }

            if (!$user || !$user->expo_push_token) {
                Log::info('Push notification skipped: No token found', [
                    'notifiable_type' => $notification->notifiable_type,
                    'notifiable_id' => $notification->notifiable_id
                ]);
                return;
            }

            Log::info('Sending push notification via Expo', [
                'token' => $user->expo_push_token,
                'title' => $notification->title
            ]);

            $response = Http::post('https://exp.host/--/api/v2/push/send', [
                'to' => $user->expo_push_token,
                'title' => $notification->title ?? 'New Notification',
                'body' => $notification->message,
                'data' => array_merge($notification->data ?? [], [
                    'notificationID' => $notification->notificationID,
                    'type' => $notification->type,
                    'bookingID' => $notification->related_booking_id
                ]),
                'sound' => 'default',
                'priority' => 'high'
            ]);

            // If $response is a LazyPromise (async), wait for it to get the Response object
            if ($response instanceof \Illuminate\Http\Client\Promises\LazyPromise) {
                $response = $response->wait();
            }

            if ($response->successful()) {
                $notification->update([
                    'push_sent' => true,
                    'push_sent_at' => now()
                ]);
                Log::info('Push notification sent successfully');
            } else {
                Log::error('Expo Push API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send push notification: ' . $e->getMessage());
        }
    }

        /**
     * Send notification to any user type
     */
    public function toUser($userType, $userId, $type, $title, $message, $data = [], $bookingId = null)
    {
        if ($userType === 'customer') {
            return $this->toCustomer($userId, $type, $title, $message, $data, $bookingId);
        } elseif ($userType === 'provider') {
            return $this->toProvider($userId, $type, $title, $message, $data, $bookingId);
        } elseif ($userType === 'admin') {
            return $this->toAdmin($userId, $type, $title, $message, $data);
        }
    }

    /**
     * Notification types constants
     */
    const TYPE_BOOKING_REQUEST = 'booking_request';
    const TYPE_BOOKING_ACCEPTED = 'booking_accepted';
    const TYPE_BOOKING_REJECTED = 'booking_rejected';
    const TYPE_BOOKING_CANCELLED = 'booking_cancelled';
    const TYPE_BOOKING_COMPLETED = 'booking_completed';
    const TYPE_BOOKING_EXPIRED = 'booking_expired';
    const TYPE_PAYMENT_RECEIVED = 'payment_received';
    const TYPE_PAYMENT_RELEASED = 'payment_released';
    const TYPE_NEW_MESSAGE = 'new_message';
    const TYPE_PROVIDER_APPROVED = 'provider_approved';
    const TYPE_PROVIDER_REJECTED = 'provider_rejected';
    const TYPE_REVIEW_RECEIVED = 'review_received';
    const TYPE_WITHDRAWAL_REQUEST = 'withdrawal_request';
    const TYPE_NEW_PROVIDER_REGISTRATION = 'provider_registration';
    const TYPE_DISPUTE_RAISED = 'dispute';
}