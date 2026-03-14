<?php
// app/Services/NotificationService.php

namespace App\Services;

use App\Models\Notification;
use App\Models\Customer;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Log;

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
            
            // Here you would trigger push notification if needed
            $this->sendPushNotification($notification);
            
            return $notification;
        } catch (\Exception $e) {
            Log::error('Failed to create notification: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Send push notification (to be implemented with Firebase)
     */
    private function sendPushNotification($notification)
    {
        // This will be implemented when we add Firebase
        // For now, just mark as push not sent
        $notification->push_sent = false;
        $notification->save();
        
        // You can dispatch a job here to send push later
        // dispatch(new SendPushNotificationJob($notification));
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
}